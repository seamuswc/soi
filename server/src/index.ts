import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

// Environment variable validation
function validateEnvironment() {
  const required = {
    SOLANA_MERCHANT_ADDRESS: process.env.SOLANA_MERCHANT_ADDRESS,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN
  };

  const missing = Object.entries(required)
    .filter(([key, value]) => !value || value.trim() === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Validate environment on startup
try {
  validateEnvironment();
} catch (error) {
  // Environment validation failed - exit gracefully
  process.exit(1);
}

// TypeScript Interfaces
interface ListingData {
  building_name: string;
  coordinates: string;
  floor: string;
  sqm: string;
  cost: string;
  description: string;
  youtube_link: string;
  reference: string;
  payment_network: 'solana' | 'thb';
  thai_only: boolean;
  has_pool: boolean;
  has_parking: boolean;
  is_top_floor: boolean;
  six_months: boolean;
  promo_code?: string;
}

// Constants
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC on Solana
const USDC_DECIMALS = 6;
const USDC_AMOUNT = 1000000; // 1 USDC with 6 decimals
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, { origin: '*' });

// Solana Connection
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Helper function to get Associated Token Account address
function getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

// Helper function to convert number to u64 bytes (little-endian)
function u64ToLeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let n = value;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

// Create idempotent ATA instruction (opcode 1)
function createIdempotentATAInstruction(
  payer: PublicKey,
  ataPk: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ataPk, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: Buffer.from([1]) // CreateIdempotent
  });
}

// Transfer checked instruction with reference (opcode 12)
function transferCheckedInstruction(
  src: PublicKey,
  mint: PublicKey,
  dst: PublicKey,
  owner: PublicKey,
  amountUnits: bigint,
  decimals: number,
  ref?: PublicKey
): TransactionInstruction {
  const data = new Uint8Array(1 + 8 + 1);
  data[0] = 12; // TransferChecked opcode
  data.set(u64ToLeBytes(amountUnits), 1);
  data[9] = decimals;

  const keys = [
    { pubkey: src, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: dst, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  // Add reference as a read-only key if provided
  if (ref) {
    keys.push({ pubkey: ref, isSigner: false, isWritable: false });
  }

  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys,
    data: Buffer.from(data) // Convert to Buffer for TypeScript
  });
}

// Validation schemas
const createListingSchema = z.object({
  building_name: z.string(),
  coordinates: z.string(),
  floor: z.string(),
  sqm: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
  cost: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
  description: z.string(),
  youtube_link: z.string().url(),
  reference: z.string(),
  payment_network: z.enum(['solana', 'thb']).default('solana'),
  rental_type: z.enum(['living', 'business']).default('living'),
  business_photo: z.string().optional(),
  thai_only: z.boolean().optional().default(false),
  has_pool: z.boolean().optional().default(false),
  has_parking: z.boolean().optional().default(false),
  is_top_floor: z.boolean().optional().default(false),
  six_months: z.boolean().optional().default(false),
  promo_code: z.string().optional()
});

// Solana payment validation - simpler approach from working code
async function validateSolanaPayment(reference: string): Promise<boolean> {
  try {
    if (!reference || reference.length < 32) return false;
    
    // Convert reference to PublicKey
    const referencePublicKey = new PublicKey(reference);
    
    // Get signatures for the reference address
    // If the reference appears in any transaction, payment was made
    const signatures = await connection.getSignaturesForAddress(referencePublicKey, { limit: 1 });
    
    return signatures && signatures.length > 0;
  } catch (error: any) {
    app.log.error('Solana payment validation error:', error);
    return false;
  }
}

// Routes
app.get('/api/config', async () => {
  return {
    recipient: process.env.SOLANA_MERCHANT_ADDRESS,
    usdcMint: USDC_MINT.toBase58()
  };
});

// Get all merchant addresses
app.get('/api/config/merchant-addresses', async () => {
  return {
    solana: process.env.SOLANA_MERCHANT_ADDRESS || '',
    lineAccount: process.env.LINE_ACCOUNT || '@soipattaya'
  };
});

// Build USDC transaction for Phantom wallet
app.post('/api/transaction', async (request, reply) => {
  try {
    const { payer, recipient, amount, reference } = request.body as {
      payer: string;
      recipient: string;
      amount: number;
      reference: string;
    };

    if (!payer || !recipient || !amount || !reference) {
      return reply.code(400).send({ error: 'Missing required parameters' });
    }

    const payerPk = new PublicKey(payer);
    const recipientPk = new PublicKey(recipient);
    const referencePk = new PublicKey(reference);

    // Get Associated Token Accounts
    const payerAta = getAssociatedTokenAddress(payerPk, USDC_MINT);
    const recipientAta = getAssociatedTokenAddress(recipientPk, USDC_MINT);

    // Convert amount to smallest unit (6 decimals for USDC)
    const amountUnits = BigInt(Math.round(amount * 1_000_000));

    // Create transaction
    const tx = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash({ commitment: 'processed' });
    tx.recentBlockhash = blockhash;
    tx.feePayer = payerPk;

    // 1. Create ATA for recipient if needed (idempotent)
    tx.add(createIdempotentATAInstruction(payerPk, recipientAta, recipientPk, USDC_MINT));

    // 2. Transfer USDC with reference included as a key (this is how wallets detect payments!)
    tx.add(transferCheckedInstruction(
      payerAta,       // source
      USDC_MINT,      // mint
      recipientAta,   // destination
      payerPk,        // owner
      amountUnits,    // amount
      6,              // USDC decimals
      referencePk     // reference key (THIS is what makes QR scanning work!)
    ));

    // Serialize transaction (without signatures)
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    return { transaction: serialized.toString('base64') };
  } catch (error: any) {
    app.log.error('Transaction build error:', error);
    return reply.code(500).send({ error: error.message || 'Failed to build transaction' });
  }
});

// Check if payment has been received (for Solana)
app.get('/api/payment/check/solana/:reference', async (request) => {
  const { reference } = request.params as { reference: string };
  
  try {
    const isValid = await validateSolanaPayment(reference);
    return { confirmed: isValid };
  } catch (error: any) {
    app.log.error('Payment check error:', error);
    return { confirmed: false };
  }
});

app.get('/api/listings', async () => {
  const listings = await prisma.listing.findMany();
  // Group by building_name as in original
  const grouped: Record<string, typeof listings> = listings.reduce((acc: Record<string, typeof listings>, listing) => {
    acc[listing.building_name] = acc[listing.building_name] || [];
    acc[listing.building_name].push(listing);
    return acc;
  }, {});
  return grouped;
});

// Authentication middleware
const authenticateToken = (request: any, reply: any, done: any) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return reply.code(401).send({ error: 'Access token required' });
  }

  // Simple token validation (in production, use JWT)
  const expectedToken = process.env.ADMIN_TOKEN || 'admin123';
  if (token !== expectedToken) {
    return reply.code(403).send({ error: 'Invalid token' });
  }

  done();
};

// Login endpoint
app.post('/api/auth/login', async (request, reply) => {
  const { username, password } = request.body as { username: string, password: string };
  
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password';
  
  if (username === adminUsername && password === adminPassword) {
    const token = process.env.ADMIN_TOKEN || 'admin123';
    return { success: true, token };
  } else {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }
});

// Generate promo code (admin only)
app.post('/api/promo/generate', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { max_uses } = request.body as { max_uses?: number };
    const maxUses = max_uses && max_uses > 0 ? max_uses : 1;

    // Generate random promo code (8 characters, alphanumeric)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let promoCode = '';
    for (let i = 0; i < 8; i++) {
      promoCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Create promo code with specified uses
    const promo = await prisma.promo.create({
      data: {
        code: promoCode.toLowerCase(),
        remaining_uses: maxUses,
        max_listings: 1, // Default to 1 listing per use
        email: null
      }
    });
    
    return { 
      code: promoCode,
      remaining_uses: promo.remaining_uses,
      max_uses: maxUses
    };
  } catch (error: any) {
    app.log.error('Error generating promo code:', error);
    return reply.code(500).send({ error: 'Failed to generate promo code' });
  }
});

// Generate promo code after Solana payment (public endpoint)
app.post('/api/promo/generate-after-payment', async (request, reply) => {
  try {
    const { reference, max_listings } = request.body as { 
      reference: string; 
      max_listings?: number; 
    };

    // Verify Solana payment was made
    const isValid = await validateSolanaPayment(reference);
    if (!isValid) {
      return reply.code(400).send({ error: 'Payment not verified' });
    }

    const maxListings = max_listings && max_listings > 0 ? max_listings : 1;

    // Generate random promo code (8 characters, alphanumeric)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let promoCode = '';
    for (let i = 0; i < 8; i++) {
      promoCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Create promo code with specified listing count
    const promo = await prisma.promo.create({
      data: {
        code: promoCode.toLowerCase(),
        remaining_uses: 1, // Single use for payment-generated codes
        max_listings: maxListings,
        email: null
      }
    });
    
    return { 
      code: promoCode,
      max_listings: promo.max_listings
    };
  } catch (error: any) {
    app.log.error('Error generating promo code after payment:', error);
    return reply.code(500).send({ error: 'Failed to generate promo code' });
  }
});

// Email endpoints removed

// Get all promo codes with usage stats (admin only)
app.get('/api/promo/list', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const promos = await prisma.promo.findMany({
      orderBy: {
        id: 'desc'
      }
    });
    
    return { promos };
  } catch (error: any) {
    app.log.error('Error fetching promo codes:', error);
    return reply.code(500).send({ error: 'Failed to fetch promo codes' });
  }
});

// Add admin dashboard route (protected)
app.get('/api/listings/dashboard', { preHandler: authenticateToken }, async () => {
  const listings = await prisma.listing.findMany({
    orderBy: {
      created_at: 'desc'
    }
  });
  
  return {
    total: listings.length,
    active: listings.filter(l => l.expires_at > new Date()).length,
    expired: listings.filter(l => l.expires_at <= new Date()).length,
    listings: listings.map(listing => ({
      id: listing.id,
      building_name: listing.building_name,
      floor: listing.floor,
      sqm: listing.sqm,
      cost: listing.cost,
      payment_network: listing.payment_network,
      created_at: listing.created_at,
      expires_at: listing.expires_at,
      is_expired: listing.expires_at <= new Date()
    }))
  };
});

app.post('/api/listings', async (request, reply) => {
  try {
    const data = createListingSchema.parse(request.body);
    const [lat, lng] = data.coordinates.split(',').map(s => parseFloat(s.trim()));

    let isValid = false;
    
    // Validate payment based on network
    if (data.payment_network === 'solana') {
      isValid = await validateSolanaPayment(data.reference);
    } else if (data.payment_network === 'thb') {
      // THB payments are manual via LINE - skip validation
      // In production, you might want admin approval for THB payments
      isValid = true;
    }

    if (!isValid && !data.promo_code) {
      return reply.code(400).send({ error: 'Invalid payment' });
    }

    const months = data.six_months ? 6 : 1;
    const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

    // Promo handling - check database for promo code
    if (data.promo_code) {
      const promo = await prisma.promo.findUnique({
        where: { code: data.promo_code.toLowerCase() }
      });
      
      if (!promo) {
        return reply.code(400).send({ error: 'Invalid promo code' });
      }
      
      if (promo.remaining_uses <= 0) {
        return reply.code(400).send({ error: 'Promo code has been fully used' });
      }
      
      // Decrement promo usage
      await prisma.promo.update({ 
        where: { code: data.promo_code.toLowerCase() }, 
        data: { remaining_uses: { decrement: 1 } } 
      });
      
      // Promo accepted: skip payment validation
      isValid = true;
    }

    const listing = await prisma.listing.create({
      data: {
        building_name: data.building_name,
        latitude: lat,
        longitude: lng,
        floor: data.floor,
        sqm: data.sqm,
        cost: data.cost,
        description: data.description,
        youtube_link: data.youtube_link,
        reference: data.reference,
        payment_network: data.promo_code ? 'promo' : data.payment_network,
        rental_type: data.rental_type,
        business_photo: data.business_photo,
        thai_only: data.thai_only ?? false,
        has_pool: data.has_pool ?? false,
        has_parking: data.has_parking ?? false,
        is_top_floor: data.is_top_floor ?? false,
        six_months: data.six_months ?? false,
        expires_at: expiresAt,
      },
    });

    return listing;
  } catch (error: any) {
    app.log.error('Error creating listing:', error);
    console.error('Full error details:', error);
    return reply.code(500).send({ error: error.message || 'Internal server error' });
  }
});

// Delete a promo code (admin only)
app.delete('/api/promo/:id', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    
    await prisma.promo.delete({
      where: { id: parseInt(id) }
    });
    
    return { success: true };
  } catch (error: any) {
    app.log.error('Error deleting promo code:', error);
    return reply.code(500).send({ error: 'Failed to delete promo code' });
  }
});

// Delete a listing (admin only)
app.delete('/api/listings/:id', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    await prisma.listing.delete({
      where: { id: parseInt(id) }
    });
    return { success: true, message: 'Listing deleted successfully' };
  } catch (error) {
    return reply.code(500).send({ error: 'Failed to delete listing' });
  }
});

app.get('/api/listings/:name', async (request) => {
  const { name } = request.params as { name: string };
  const listings = await prisma.listing.findMany({ where: { building_name: name } });
  return listings;
});

// Cron job to delete expired listings
cron.schedule('0 0 * * *', async () => {
  await prisma.listing.deleteMany({
    where: { expires_at: { lt: new Date() } },
  });
  app.log.info('Expired listings deleted');
});

// Serve static files in production (after all API routes)
if (process.env.NODE_ENV === 'production') {
  app.register(require('@fastify/static'), {
    root: path.join(__dirname, '../../client/dist'),
    prefix: '/',
    decorateReply: false
  });
  
  // Serve index.html for all non-API routes (SPA)
  app.setNotFoundHandler((request, reply) => {
    // Don't serve HTML for API routes
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'API endpoint not found' });
    }
    reply.type('text/html').send(require('fs').readFileSync(path.join(__dirname, '../../client/dist/index.html'), 'utf8'));
  });
}

// Start server
const start = async () => {
  try {
    const PORT = parseInt(process.env.PORT || '3000', 10);
    await app.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
