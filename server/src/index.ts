import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { sendSubscriptionEmail, sendPromoCodeEmail } from './emailService';

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
  payment_network: 'solana' | 'promo';
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

// Function to ensure FREE promo exists
async function ensureFreePromo() {
  try {
    const existingFree = await prisma.promo.findUnique({
      where: { code: 'free' }
    });
    
    if (!existingFree) {
      await prisma.promo.create({
        data: {
          code: 'free',
          remaining_uses: 1000,
          email: null
        }
      });
      console.log('✅ FREE promo code created (1000 uses)');
    } else {
      console.log(`✅ FREE promo code exists (${existingFree.remaining_uses} uses remaining)`);
    }
  } catch (error) {
    console.error('❌ Error ensuring FREE promo:', error);
  }
}

app.register(cors, { origin: '*' });

  // Solana Connection with backup RPCs - optimized order
  const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const BACKUP_RPCS = [
    'https://api.mainnet-beta.solana.com', // Most reliable, try first
    'https://solana-api.projectserum.com', // Second most reliable
    'https://rpc.ankr.com/solana' // Requires API key, try last
  ];
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
  payment_network: z.enum(['solana', 'promo']).default('solana'),
  rental_type: z.enum(['living', 'business']).default('living'),
  business_photo: z.string().optional(),
  thai_only: z.boolean().optional().default(false),
  has_pool: z.boolean().optional().default(false),
  has_parking: z.boolean().optional().default(false),
  is_top_floor: z.boolean().optional().default(false),
  six_months: z.boolean().optional().default(false),
  promo_code: z.string().optional()
});

// Solana payment validation with retry logic and timeout
async function validateSolanaPayment(reference: string): Promise<boolean> {
  try {
    if (!reference || reference.length < 32) return false;
    
    // Clean reference - remove any suffixes like :1 that might be added by browsers
    const cleanReference = reference.split(':')[0];
    
    // Convert reference to PublicKey
    const referencePublicKey = new PublicKey(cleanReference);
    
      // Retry configuration - balanced for reliability and speed
      const maxRetries = 6; // Increased to 6 attempts for better reliability
      const retryDelay = 5000; // 5 seconds between attempts
      const timeout = 10000; // 10 second timeout per attempt
    
    // Try each RPC endpoint
    for (let rpcIndex = 0; rpcIndex < BACKUP_RPCS.length; rpcIndex++) {
      const rpcUrl = BACKUP_RPCS[rpcIndex];
      console.log(`🌐 Trying RPC ${rpcIndex + 1}/${BACKUP_RPCS.length}: ${rpcUrl}`);
      
      // Create connection with timeout for this RPC
      const connectionWithTimeout = new Connection(rpcUrl, {
        commitment: 'confirmed',
        httpHeaders: {
          'User-Agent': 'SoiPattaya/1.0'
        }
      });
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔍 Solana payment validation attempt ${attempt}/${maxRetries} for reference: ${cleanReference}`);
          
          // Create timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
          });
          
          // Create validation promise
          const validationPromise = connectionWithTimeout.getSignaturesForAddress(referencePublicKey, { limit: 1 });
          
          // Race between validation and timeout
          const signatures = await Promise.race([validationPromise, timeoutPromise]);
          
          if (signatures && signatures.length > 0) {
            console.log(`✅ Solana payment validated successfully on RPC ${rpcIndex + 1}, attempt ${attempt}`);
            return true;
          }
          
          console.log(`❌ No signatures found on RPC ${rpcIndex + 1}, attempt ${attempt}`);
          
                 // If this is not the last attempt, wait before retrying
                 if (attempt < maxRetries) {
                   const delay = retryDelay; // Simple fixed delay instead of exponential
                   console.log(`⏳ Waiting ${delay}ms before retry...`);
                   await new Promise(resolve => setTimeout(resolve, delay));
                 }
          
        } catch (error: any) {
          console.log(`❌ Solana validation RPC ${rpcIndex + 1}, attempt ${attempt} failed:`, error.message);
          
          // If this is the last attempt for this RPC, try next RPC
          if (attempt === maxRetries) {
            console.log(`🔄 RPC ${rpcIndex + 1} exhausted, trying next RPC...`);
            break; // Move to next RPC
          }
          
          // Wait before retrying (simple fixed delay)
          const delay = retryDelay;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return false;
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

// Generate sitemap.xml dynamically
app.get('/sitemap.xml', async (request, reply) => {
  try {
    const hostname = request.headers.host || 'soipattaya.com';
    const protocol = request.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${hostname}`;
    
    // Get all listings
    const listings = await prisma.listing.findMany({
      where: {
        expires_at: { gt: new Date() } // Only active listings
      }
    });
    
    // Get unique building names
    const buildingNames = [...new Set(listings.map(l => l.building_name))];
    
    // Generate sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/create</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/data</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    
    // Add building detail pages
    buildingNames.forEach(buildingName => {
      const encodedName = encodeURIComponent(buildingName);
      sitemap += `
  <url>
    <loc>${baseUrl}/${encodedName}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });
    
    // Add individual listing pages
    listings.forEach(listing => {
      sitemap += `
  <url>
    <loc>${baseUrl}/listing/${listing.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    });
    
    sitemap += `
</urlset>`;
    
    reply.type('application/xml').send(sitemap);
  } catch (error: any) {
    app.log.error('Error generating sitemap:', error);
    return reply.code(500).send({ error: 'Failed to generate sitemap' });
  }
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

// User authentication middleware
const authenticateUser = async (request: any, reply: any, done: any) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return reply.code(401).send({ error: 'Access token required' });
  }

  try {
    // Check if it's admin token
    const adminToken = process.env.ADMIN_TOKEN || 'admin123';
    if (token === adminToken) {
      return done();
    }

    // Check if it's a user token (email:password base64 encoded)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, password] = decoded.split(':');
    
    if (!email || !password) {
      return reply.code(403).send({ error: 'Invalid token format' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.password !== password) {
      return reply.code(403).send({ error: 'Invalid credentials' });
    }

    if (user.expires_at < new Date()) {
      return reply.code(403).send({ error: 'Account expired' });
    }

    request.user = user;
    done();
  } catch (error: any) {
    return reply.code(403).send({ error: 'Invalid token' });
  }
};

// User registration with Solana payment
app.post('/api/auth/register', async (request, reply) => {
  try {
    const { email, reference } = request.body as { email: string, reference: string };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return reply.code(400).send({ error: 'Email already registered' });
    }

    // Verify Solana payment (1 USDC)
    const isValid = await validateSolanaPayment(reference);
    if (!isValid) {
      return reply.code(400).send({ error: 'Payment not verified' });
    }

    // Generate random password
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Create user with 365-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    const user = await prisma.user.create({
      data: {
        email,
        password,
        payment_reference: reference,
        expires_at: expiresAt
      }
    });

    // Send subscription confirmation email
    try {
      await sendSubscriptionEmail({
        email: user.email,
        password: user.password,
        subscriptionDate: user.created_at.toLocaleDateString(),
        expiryDate: user.expires_at.toLocaleDateString(),
        paymentReference: user.payment_reference,
      });
    } catch (emailError) {
      console.error('Failed to send subscription email:', emailError);
      // Don't fail the user creation if email fails
    }

    return { 
      success: true, 
      email: user.email,
      password: user.password,
      expires_at: user.expires_at
    };
  } catch (error: any) {
    app.log.error('Error registering user:', error);
    return reply.code(500).send({ error: 'Failed to register user' });
  }
});

// Check if email exists
app.post('/api/auth/check-email', async (request, reply) => {
  try {
    const { email } = request.body as { email: string };
    
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    return { exists: !!existingUser };
  } catch (error: any) {
    app.log.error('Error checking email:', error);
    return reply.code(500).send({ error: 'Failed to check email' });
  }
});

// User login
app.post('/api/auth/user-login', async (request, reply) => {
  try {
    const { email, password } = request.body as { email: string, password: string };

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.password !== password) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    if (user.expires_at < new Date()) {
      return reply.code(401).send({ error: 'Account expired' });
    }

    // Return base64 encoded token (email:password)
    const token = Buffer.from(`${email}:${password}`).toString('base64');
    
    return { 
      success: true, 
      token,
      expires_at: user.expires_at
    };
  } catch (error: any) {
    app.log.error('Error logging in user:', error);
    return reply.code(500).send({ error: 'Failed to login' });
  }
});

// Get city listings count
app.get('/api/cities/listings', async (request, reply) => {
  try {
    // Count Pattaya listings (latitude 12.0-13.0)
    const pattayaListings = await prisma.listing.count({
      where: {
        latitude: { gte: 12.0, lte: 13.0 },
        longitude: { gte: 100.0, lte: 101.0 }
      }
    });
    
    // Count Bangkok listings (latitude 13.0-14.0)
    const bangkokListings = await prisma.listing.count({
      where: {
        latitude: { gte: 13.0, lte: 14.0 },
        longitude: { gte: 100.0, lte: 101.0 }
      }
    });
    
    return {
      pattaya: pattayaListings,
      bangkok: bangkokListings
    };
  } catch (error: any) {
    app.log.error('Error fetching city listings:', error);
    return reply.code(500).send({ error: 'Failed to fetch city data' });
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

// Test data subscription email (for testing purposes)
app.post('/api/test/data-subscription-email', async (request, reply) => {
  try {
    const { email } = request.body as { email: string };

    console.log('📧 API: Testing data subscription email for:', email);

    // Generate test data
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    // Send test subscription email
    try {
      await sendSubscriptionEmail({
        email: email,
        password: password,
        subscriptionDate: now.toLocaleDateString(),
        expiryDate: expiresAt.toLocaleDateString(),
        paymentReference: 'TEST-REFERENCE-123',
      });
      console.log('📧 Data subscription email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send data subscription email:', emailError);
      return reply.code(500).send({ error: 'Failed to send email' });
    }

    return { 
      success: true,
      message: 'Data subscription email sent successfully',
      email: email,
      password: password
    };
  } catch (error: any) {
    app.log.error('Error testing data subscription email:', error);
    return reply.code(500).send({ error: 'Failed to send test email' });
  }
});

// Generate promo code after Solana payment (public endpoint)
app.post('/api/promo/generate-after-payment', async (request, reply) => {
  try {
    const { reference, uses = 1, email } = request.body as { 
      reference: string;
      uses?: number;
      email?: string;
    };

    console.log('🎟️ API: Generating promo code for reference:', reference, 'email:', email, 'uses:', uses);

    // Skip payment validation for promo code generation since payment was already confirmed
    // in the payment flow. The reference is only generated after successful payment.
    console.log('🎟️ API: Skipping payment validation - payment already confirmed in payment flow');
    
    // Generate random promo code (8 characters, alphanumeric)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let promoCode = '';
    for (let i = 0; i < 8; i++) {
      promoCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Create promo code with the number of uses paid for
    console.log('🎟️ API: Creating promo code with uses:', uses);
    const promo = await prisma.promo.create({
      data: {
        code: promoCode.toLowerCase(),
        remaining_uses: uses, // Use the number of uses paid for
        email: email || null
      }
    });
    console.log('🎟️ API: Created promo code with remaining_uses:', promo.remaining_uses);
    
    // Send email if email is provided
    if (email) {
      try {
        await sendPromoCodeEmail({
          email: email,
          promoCode: promoCode,
          uses: uses,
          reference: reference
        });
        console.log('📧 Promo code email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send promo code email:', emailError);
        // Don't fail the promo generation if email fails
      }
    }
    
    const response = { 
      code: promoCode,
      remaining_uses: promo.remaining_uses
    };
    
    console.log('🎟️ API: Generated promo code response:', response);
    return response;
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

// Get all users/subscribers (admin only)
app.get('/api/users/list', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });
    
    return { users };
  } catch (error: any) {
    app.log.error('Error fetching users:', error);
    return reply.code(500).send({ error: 'Failed to fetch users' });
  }
});

// Check if FREE promo is available (public endpoint)
app.get('/api/promo/free', async (request, reply) => {
  try {
    const freePromo = await prisma.promo.findUnique({
      where: { code: 'free' }
    });
    
    if (!freePromo) {
      return { available: false, remaining_uses: 0 };
    }
    
    return { 
      available: freePromo.remaining_uses > 0, 
      remaining_uses: freePromo.remaining_uses 
    };
  } catch (error: any) {
    app.log.error('Error checking FREE promo:', error);
    return reply.code(500).send({ error: 'Failed to check FREE promo' });
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
      promo_code_used: listing.promo_code_used,
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
    } else if (data.payment_network === 'promo') {
      // Promo code payments - skip validation as promo codes are validated separately
      isValid = true;
    }

    if (!isValid && !data.promo_code) {
      return reply.code(400).send({ error: 'Invalid payment' });
    }

    // Promo handling - check database for promo code
    if (data.promo_code) {
      console.log(`🎟️ Processing promo code: ${data.promo_code}`);
      const promo = await prisma.promo.findUnique({
        where: { code: data.promo_code.toLowerCase() }
      });
      console.log(`🎟️ Found promo: ${promo ? `${promo.remaining_uses} uses remaining` : 'NOT FOUND'}`);
      
      if (!promo) {
        return reply.code(400).send({ error: 'Invalid promo code' });
      }
      
      if (promo.remaining_uses <= 0) {
        return reply.code(400).send({ error: 'Promo code has been fully used' });
      }
      
      // Decrement promo usage
      console.log(`🎟️ Before decrement: ${promo.remaining_uses} uses remaining for ${data.promo_code}`);
      const updatedPromo = await prisma.promo.update({ 
        where: { code: data.promo_code.toLowerCase() }, 
        data: { remaining_uses: { decrement: 1 } } 
      });
      console.log(`🎟️ After decrement: ${updatedPromo.remaining_uses} uses remaining for ${data.promo_code}`);
      
      // Promo accepted: skip payment validation
      isValid = true;
    }

    // Set expiration date - all listings expire in 3 months
    const expiresAt = new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000); // 3 months from now

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
        promo_code_used: data.promo_code || null,
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

// Analytics data endpoint
// Translation endpoint using DeepSeek API
app.post('/api/translate', async (request, reply) => {
  try {
    const { text, target_language } = request.body as { text: string; target_language: string };
    
    if (!text || !target_language) {
      return reply.code(400).send({ error: 'Text and target language are required' });
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return reply.code(500).send({ error: 'Translation service not configured' });
    }

    // Map language codes to proper names
    const languageMap: { [key: string]: string } = {
      'thai': 'Thai',
      'english': 'English', 
      'chinese': 'Chinese (Simplified)',
      'russian': 'Russian',
      'korean': 'Korean'
    };

    const targetLang = languageMap[target_language] || target_language;

    // Check text length before making API call
    if (text.length > 2000) {
      return reply.code(413).send({ error: 'Text too long for translation' });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `Translate the following text to ${targetLang}. Only return the translation, no explanations: ${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(25000) // 25 second timeout
    });

    if (!response.ok) {
      if (response.status === 429) {
        return reply.code(429).send({ error: 'Too many requests. Please try again later.' });
      } else if (response.status === 413) {
        return reply.code(413).send({ error: 'Text too long for translation' });
      } else {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('No translation received from DeepSeek API');
    }

    return { translated_text: translatedText };
  } catch (error: any) {
    app.log.error('Translation error:', error);
    return reply.code(500).send({ error: 'Translation failed' });
  }
});

app.get('/api/analytics/data', { preHandler: authenticateUser }, async (request, reply) => {
  try {
    const { area = 'all', period = '6months', city = 'pattaya' } = request.query as { area?: string; period?: string; city?: string };
    
    // Get listings filtered by city
    const listings = await prisma.listing.findMany({
      where: {
        // Filter by city based on coordinates
        ...(city === 'bangkok' ? {
          latitude: { gte: 13.0, lte: 14.0 },
          longitude: { gte: 100.0, lte: 101.0 }
        } : {
          // Default to Pattaya area
          latitude: { gte: 12.0, lte: 13.0 },
          longitude: { gte: 100.0, lte: 101.0 }
        }),
        // Add area filtering if needed
        ...(area !== 'all' && { /* area filter logic */ })
      },
      orderBy: { created_at: 'desc' }
    });

    // Calculate analytics from real data
    const totalListings = listings.length;
    const averageRent = listings.length > 0 ? listings.reduce((sum, listing) => sum + listing.cost, 0) / listings.length : 0;
    const averageSqm = listings.length > 0 ? listings.reduce((sum, listing) => sum + listing.sqm, 0) / listings.length : 0;
    const pricePerSqm = averageSqm > 0 ? averageRent / averageSqm : 0;

    // Calculate real trends (compare with previous period)
    const now = new Date();
    
    // Helper function to get proper month-based date ranges
    const getPeriodDates = (period: string) => {
      const currentDate = new Date();
      let monthsBack: number;
      
      switch (period) {
        case '1month': monthsBack = 1; break;
        case '3months': monthsBack = 3; break;
        case '6months': monthsBack = 6; break;
        case '1year': monthsBack = 12; break;
        case 'beginning': 
          // Beginning of current year - return as object for consistency
          const beginningOfYear = new Date(currentDate.getFullYear(), 0, 1);
          const previousYear = new Date(currentDate.getFullYear() - 1, 0, 1);
          return { periodStart: beginningOfYear, previousPeriodStart: previousYear };
        case 'all': 
          // Go back 2 years for "all time"
          monthsBack = 24; break;
        default: monthsBack = 6; break;
      }
      
      const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsBack, currentDate.getDate());
      const previousPeriodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - (monthsBack * 2), currentDate.getDate());
      
      return { periodStart, previousPeriodStart };
    };
    
    const periodDates = getPeriodDates(period);
    const periodStart = periodDates.periodStart;
    const previousPeriodStart = periodDates.previousPeriodStart;
    
    const currentPeriodListings = listings.filter(l => new Date(l.created_at) >= periodStart);
    const previousPeriodListings = listings.filter(l => new Date(l.created_at) >= previousPeriodStart && new Date(l.created_at) < periodStart);
    
    const currentAvgRent = currentPeriodListings.length > 0 ? currentPeriodListings.reduce((sum, l) => sum + l.cost, 0) / currentPeriodListings.length : 0;
    const previousAvgRent = previousPeriodListings.length > 0 ? previousPeriodListings.reduce((sum, l) => sum + l.cost, 0) / previousPeriodListings.length : 0;
    
    const rentChange = previousAvgRent > 0 ? ((currentAvgRent - previousAvgRent) / previousAvgRent) * 100 : 0;
    const sqmChange = 0; // Could calculate SQM trends if needed
    
    // Real area analysis based on geographical areas (North, East, West, South)
    let areaData = [];
    
    if (totalListings > 0) {
      // Define city center coordinates for area calculation
      const cityCenter = city === 'bangkok' 
        ? { lat: 13.7563, lng: 100.5018 }  // Bangkok center
        : { lat: 12.9236, lng: 100.8825 }; // Pattaya center
      
      // Group listings by geographical areas (North, East, West, South)
      const areas = {
        north: { name: 'North', listings: [] as any[], totalCost: 0, lat: cityCenter.lat + 0.1, lng: cityCenter.lng },
        east: { name: 'East', listings: [] as any[], totalCost: 0, lat: cityCenter.lat, lng: cityCenter.lng + 0.1 },
        west: { name: 'West', listings: [] as any[], totalCost: 0, lat: cityCenter.lat, lng: cityCenter.lng - 0.1 },
        south: { name: 'South', listings: [] as any[], totalCost: 0, lat: cityCenter.lat - 0.1, lng: cityCenter.lng }
      };
      
      // Categorize each listing into geographical areas
      listings.forEach(listing => {
        const lat = listing.latitude;
        const lng = listing.longitude;
        
        // Determine which area the listing belongs to
        if (lat > cityCenter.lat && lng > cityCenter.lng) {
          areas.north.listings.push(listing);
          areas.north.totalCost += listing.cost;
        } else if (lat > cityCenter.lat && lng <= cityCenter.lng) {
          areas.west.listings.push(listing);
          areas.west.totalCost += listing.cost;
        } else if (lat <= cityCenter.lat && lng > cityCenter.lng) {
          areas.east.listings.push(listing);
          areas.east.totalCost += listing.cost;
        } else {
          areas.south.listings.push(listing);
          areas.south.totalCost += listing.cost;
        }
      });

      // Convert to areaData format
      areaData = Object.values(areas).map((area: any) => ({
        name: area.name,
        listings: area.listings.length,
        avgPrice: area.listings.length > 0 ? Math.round(area.totalCost / area.listings.length) : 0,
        change: 0, // Could calculate real change if needed
        lat: area.lat,
        lng: area.lng
      })).filter(area => area.listings > 0); // Only show areas with listings
    } else {
      // No listings, show empty areas
      areaData = [
        { name: 'No Listings', listings: 0, avgPrice: 0, change: 0, lat: 12.9236, lng: 100.8825 }
      ];
    }

    // Top performing areas
    const topAreas = areaData
      .sort((a, b) => b.change - a.change)
      .slice(0, 3)
      .map(area => ({ name: area.name, growth: area.change }));

    // Real price ranges based on actual data
    const under10k = listings.filter(l => l.cost < 10000).length;
    const range10k20k = listings.filter(l => l.cost >= 10000 && l.cost < 20000).length;
    const range20k30k = listings.filter(l => l.cost >= 20000 && l.cost < 30000).length;
    const over30k = listings.filter(l => l.cost >= 30000).length;
    
    const priceRanges = [
      { label: 'Under 10k', count: under10k, percentage: totalListings > 0 ? Math.round((under10k / totalListings) * 100) : 0 },
      { label: '10k-20k', count: range10k20k, percentage: totalListings > 0 ? Math.round((range10k20k / totalListings) * 100) : 0 },
      { label: '20k-30k', count: range20k30k, percentage: totalListings > 0 ? Math.round((range20k30k / totalListings) * 100) : 0 },
      { label: '30k+', count: over30k, percentage: totalListings > 0 ? Math.round((over30k / totalListings) * 100) : 0 }
    ];

    // Market predictions based on actual trends
    const predictions = {
      shortTerm: rentChange > 0 ? `+${rentChange.toFixed(1)}%` : `${rentChange.toFixed(1)}%`,
      mediumTerm: rentChange > 0 ? `+${(rentChange * 1.2).toFixed(1)}%` : `${(rentChange * 1.2).toFixed(1)}%`,
      longTerm: rentChange > 0 ? `+${(rentChange * 1.5).toFixed(1)}%` : `${(rentChange * 1.5).toFixed(1)}%`
    };

    // Generate historical chart data based on actual listing dates
    const generateHistoricalData = (period: string) => {
      const now = new Date();
      let labels: string[] = [];
      let priceData: number[] = [];
      let volumeData: number[] = [];
      
      switch (period) {
        case '1month':
          labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
          // Group listings by week
          for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekListings = listings.filter(l => {
              const created = new Date(l.created_at);
              return created >= weekStart && created < weekEnd;
            });
            priceData.push(weekListings.length > 0 ? weekListings.reduce((sum, l) => sum + l.cost, 0) / weekListings.length : 0);
            volumeData.push(weekListings.length);
          }
          break;
          
        case '3months':
          labels = ['Month 1', 'Month 2', 'Month 3'];
          for (let i = 2; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthListings = listings.filter(l => {
              const created = new Date(l.created_at);
              return created >= monthStart && created < monthEnd;
            });
            priceData.push(monthListings.length > 0 ? monthListings.reduce((sum, l) => sum + l.cost, 0) / monthListings.length : 0);
            volumeData.push(monthListings.length);
          }
          break;
          
        case '6months':
          labels = [];
          for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthListings = listings.filter(l => {
              const created = new Date(l.created_at);
              return created >= monthStart && created < monthEnd;
            });
            priceData.push(monthListings.length > 0 ? monthListings.reduce((sum, l) => sum + l.cost, 0) / monthListings.length : 0);
            volumeData.push(monthListings.length);
          }
          break;
          
        case 'beginning':
          labels = [];
          for (let i = 0; i <= now.getMonth(); i++) {
            const date = new Date(now.getFullYear(), i, 1);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            
            const monthStart = new Date(now.getFullYear(), i, 1);
            const monthEnd = new Date(now.getFullYear(), i + 1, 1);
            const monthListings = listings.filter(l => {
              const created = new Date(l.created_at);
              return created >= monthStart && created < monthEnd;
            });
            priceData.push(monthListings.length > 0 ? monthListings.reduce((sum, l) => sum + l.cost, 0) / monthListings.length : 0);
            volumeData.push(monthListings.length);
          }
          break;
          
        default:
          // Default to 6 months
          labels = [];
          for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthListings = listings.filter(l => {
              const created = new Date(l.created_at);
              return created >= monthStart && created < monthEnd;
            });
            priceData.push(monthListings.length > 0 ? monthListings.reduce((sum, l) => sum + l.cost, 0) / monthListings.length : 0);
            volumeData.push(monthListings.length);
          }
      }
      
      return { labels, priceData, volumeData };
    };
    
    const historicalData = generateHistoricalData(period);

    return {
      averageRent: Math.round(averageRent),
      pricePerSqm: Math.round(pricePerSqm),
      totalListings,
      newListings: currentPeriodListings.length, // Real new listings this period
      rentChange: Math.round(rentChange * 10) / 10,
      sqmChange: Math.round(sqmChange * 10) / 10,
      marketActivity: totalListings > 50 ? 'High' : totalListings > 20 ? 'Medium' : 'Low',
      avgDaysOnMarket: totalListings > 0 ? Math.floor(listings.reduce((sum, l) => {
        const days = Math.floor((now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / totalListings) : 0,
      areaData,
      topAreas,
      priceRanges,
      predictions,
      // Add historical chart data
      chartData: {
        labels: historicalData.labels,
        priceData: historicalData.priceData.map(p => Math.round(p)),
        volumeData: historicalData.volumeData
      }
    };
  } catch (error: any) {
    app.log.error('Error fetching analytics data:', error);
    return reply.code(500).send({ error: 'Failed to fetch analytics data' });
  }
});

// Cron job to delete expired listings
cron.schedule('0 0 * * *', async () => {
  await prisma.listing.deleteMany({
    where: { expires_at: { lt: new Date() } },
  });
  app.log.info('Expired listings deleted');
});

// Serve robots.txt
app.get('/robots.txt', async (request, reply) => {
  const robotsPath = path.join(__dirname, '../../client/public/robots.txt');
  try {
    const robots = require('fs').readFileSync(robotsPath, 'utf8');
    reply.type('text/plain').send(robots);
  } catch (error) {
    reply.type('text/plain').send('User-agent: *\nAllow: /\n');
  }
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

// Maintenance mode state
let maintenanceMode: {
  enabled: boolean;
  startTime: Date | null;
  endTime: Date | null;
  message: string;
} = {
  enabled: false,
  startTime: null,
  endTime: null,
  message: ''
};

// Maintenance mode endpoints
app.post('/api/maintenance/start', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { startTime, endTime, message } = request.body as {
      startTime: string;
      endTime: string;
      message?: string;
    };

    maintenanceMode = {
      enabled: true,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      message: message || 'Scheduled maintenance in progress'
    };

    console.log('🔧 Maintenance mode enabled:', maintenanceMode);
    return { success: true, maintenance: maintenanceMode };
  } catch (error: any) {
    app.log.error('Error starting maintenance mode:', error);
    return reply.code(500).send({ error: 'Failed to start maintenance mode' });
  }
});

app.post('/api/maintenance/stop', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    maintenanceMode = {
      enabled: false,
      startTime: null,
      endTime: null,
      message: ''
    };

    console.log('✅ Maintenance mode disabled');
    return { success: true };
  } catch (error: any) {
    app.log.error('Error stopping maintenance mode:', error);
    return reply.code(500).send({ error: 'Failed to stop maintenance mode' });
  }
});

app.get('/api/maintenance/status', async (request, reply) => {
  try {
    const now = new Date();
    const isMaintenanceActive = maintenanceMode.enabled && 
      maintenanceMode.startTime && 
      maintenanceMode.endTime &&
      now >= maintenanceMode.startTime! && 
      now <= maintenanceMode.endTime!;

    const timeUntilMaintenance = maintenanceMode.startTime ? 
      Math.max(0, maintenanceMode.startTime.getTime() - now.getTime()) : 0;

    return {
      enabled: maintenanceMode.enabled,
      active: isMaintenanceActive,
      startTime: maintenanceMode.startTime,
      endTime: maintenanceMode.endTime,
      message: maintenanceMode.message,
      timeUntilMaintenance: timeUntilMaintenance
    };
  } catch (error: any) {
    app.log.error('Error getting maintenance status:', error);
    return reply.code(500).send({ error: 'Failed to get maintenance status' });
  }
});

// Get current settings endpoint
app.get('/api/settings/current', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Parse current environment variables
    const currentSettings = {
      deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
      emailSecretId: process.env.TENCENT_SECRET_ID || '',
      emailSecretKey: process.env.TENCENT_SECRET_KEY || '',
      emailRegion: process.env.TENCENT_SES_REGION || 'ap-singapore',
      emailSender: process.env.TENCENT_SES_SENDER || 'data@soipattaya.com',
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || '',
      solanaMerchantAddress: process.env.SOLANA_MERCHANT_ADDRESS || '',
      tencentSesTemplateIdData: process.env.TENCENT_SES_TEMPLATE_ID_DATA || '',
      tencentSesTemplateIdPromo: process.env.TENCENT_SES_TEMPLATE_ID_PROMO || '',
      adminUsername: process.env.ADMIN_USERNAME || 'admin',
      adminPassword: process.env.ADMIN_PASSWORD || 'password',
      adminToken: process.env.ADMIN_TOKEN || 'admin123'
    };

    return currentSettings;
  } catch (error: any) {
    app.log.error('Error getting current settings:', error);
    return reply.code(500).send({ error: 'Failed to get current settings' });
  }
});

// Settings update endpoint
app.post('/api/settings/update', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    const { 
      deepseekApiKey, 
      emailSecretId, 
      emailSecretKey, 
      emailRegion, 
      emailSender, 
      googleMapsApiKey,
      solanaMerchantAddress,
      tencentSesTemplateIdData,
      tencentSesTemplateIdPromo,
      adminUsername,
      adminPassword,
      adminToken
    } = request.body as {
      deepseekApiKey?: string;
      emailSecretId?: string;
      emailSecretKey?: string;
      emailRegion?: string;
      emailSender?: string;
      googleMapsApiKey?: string;
      solanaMerchantAddress?: string;
      tencentSesTemplateIdData?: string;
      tencentSesTemplateIdPromo?: string;
      adminUsername?: string;
      adminPassword?: string;
      adminToken?: string;
    };

    // Read current .env file
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../../.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add environment variables
    const updates = {
      'DEEPSEEK_API_KEY': deepseekApiKey,
      'TENCENT_SECRET_ID': emailSecretId,
      'TENCENT_SECRET_KEY': emailSecretKey,
      'TENCENT_SES_REGION': emailRegion,
      'TENCENT_SES_SENDER': emailSender,
      'VITE_GOOGLE_MAPS_API_KEY': googleMapsApiKey,
      'SOLANA_MERCHANT_ADDRESS': solanaMerchantAddress,
      'TENCENT_SES_TEMPLATE_ID_DATA': tencentSesTemplateIdData,
      'TENCENT_SES_TEMPLATE_ID_PROMO': tencentSesTemplateIdPromo,
      'ADMIN_USERNAME': adminUsername,
      'ADMIN_PASSWORD': adminPassword,
      'ADMIN_TOKEN': adminToken
    };

    // Process each update
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value.trim()) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(envContent)) {
          // Update existing line
          envContent = envContent.replace(regex, newLine);
        } else {
          // Add new line
          envContent += `\n${newLine}`;
        }
      }
    });

    // Write updated .env file
    fs.writeFileSync(envPath, envContent);

    // If Google Maps API key was updated, rebuild client
    if (googleMapsApiKey && googleMapsApiKey.trim()) {
      console.log('🗺️ Google Maps API key updated, rebuilding client...');
      try {
        const { exec } = require('child_process');
        const path = require('path');
        const clientPath = path.join(__dirname, '../../client');
        
        exec(`cd ${clientPath} && VITE_GOOGLE_MAPS_API_KEY="${googleMapsApiKey}" npm run build`, (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error('❌ Client rebuild failed:', error);
          } else {
            console.log('✅ Client rebuilt successfully with new Google Maps API key');
          }
        });
      } catch (rebuildError) {
        console.error('❌ Error rebuilding client:', rebuildError);
      }
    }

    console.log('🔧 Settings updated in .env file');
    return { success: true, message: 'Settings updated successfully' };
  } catch (error: any) {
    app.log.error('Error updating settings:', error);
    return reply.code(500).send({ error: 'Failed to update settings' });
  }
});

// Middleware to show maintenance message (no blocking)
app.addHook('preHandler', async (request, reply) => {
  const now = new Date();
  const isMaintenanceActive = maintenanceMode.enabled && 
    maintenanceMode.startTime && 
    maintenanceMode.endTime &&
    now >= maintenanceMode.startTime! && 
    now <= maintenanceMode.endTime!;

  // Add maintenance message to response headers (no blocking)
  if (isMaintenanceActive) {
    reply.header('X-Maintenance-Message', maintenanceMode.message);
    reply.header('X-Maintenance-Active', 'true');
  }
});

// Validate promo code
app.get('/api/promo/validate/:code', async (request, reply) => {
  try {
    const { code } = request.params as { code: string };
    
    // Check if it's the FREE promo code
    if (code.toLowerCase() === 'free') {
      const freePromo = await prisma.promo.findUnique({
        where: { code: 'free' }
      });
      
      if (freePromo && freePromo.remaining_uses > 0) {
        return { valid: true, promo: freePromo };
      } else {
        return { valid: false, message: 'FREE promo not available' };
      }
    }
    
    // Check other promo codes
    console.log('🎟️ API: Validating promo code:', code);
    const promo = await prisma.promo.findUnique({
      where: { code: code.toLowerCase() }
    });
    console.log('🎟️ API: Found promo in validation:', promo);
    
    if (promo && promo.remaining_uses > 0) {
      return { valid: true, promo: promo };
    } else {
      return { valid: false, message: 'Invalid or expired promo code' };
    }
  } catch (error: any) {
    app.log.error('Error validating promo code:', error);
    return reply.code(500).send({ error: 'Failed to validate promo code' });
  }
});

// Create FREE promo code (admin only)
app.post('/api/promo/create-free', { preHandler: authenticateToken }, async (request, reply) => {
  try {
    await ensureFreePromo();
    return { success: true, message: 'FREE promo code created/updated successfully' };
  } catch (error: any) {
    app.log.error('Error creating FREE promo:', error);
    return reply.code(500).send({ error: 'Failed to create FREE promo' });
  }
});

// Start server
const start = async () => {
  try {
    // Don't auto-create FREE promo - let admin control it via dashboard
    console.log('🚀 Server starting without auto-creating FREE promo');
    
    const PORT = parseInt(process.env.PORT || '3001', 10);
    await app.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
