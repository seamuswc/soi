import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { z } from 'zod';
import { PublicKey, Connection, SystemProgram, Transaction, TransactionInstruction, ParsedTransactionWithMeta, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import axios from 'axios';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, { origin: '*' });

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

// Aptos configuration
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

// Sui configuration
const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

function ata(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function u64ToLeBytes(v: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let n = BigInt(v);
  for (let i = 0; i < 8; i++) { out[i] = Number(n & 0xffn); n >>= 8n; }
  return out;
}

function ixCreateIdempotentATA(payer: PublicKey, ataPk: PublicKey, owner: PublicKey, mint: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ataPk, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]) // CreateIdempotent
  });
}

function ixTransferChecked(src: PublicKey, mint: PublicKey, dst: PublicKey, owner: PublicKey, amountUnits: bigint, decimals: number, ref?: PublicKey): TransactionInstruction {
  const data = Buffer.alloc(10);
  data[0] = 12; // TransferChecked
  data.set(u64ToLeBytes(amountUnits), 1);
  data[9] = decimals;
  const keys = [
    { pubkey: src, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: dst, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  if (ref) keys.push({ pubkey: ref, isSigner: false, isWritable: false });
  return new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys, data });
}

async function buildUsdcTransferTx({ payer, recipient, amount, reference }: { payer: string, recipient: string, amount: number, reference?: string }) {
  const payerPk = new PublicKey(payer);
  const recipientPk = new PublicKey(recipient);
  const refPk = reference ? new PublicKey(reference) : undefined;

  const { blockhash } = await connection.getLatestBlockhash({ commitment: 'processed' });

  const payerAta = ata(payerPk, USDC_MINT);
  const recipientAta = ata(recipientPk, USDC_MINT);

  const tx = new Transaction({ feePayer: payerPk, recentBlockhash: blockhash });
  tx.add(ixCreateIdempotentATA(payerPk, recipientAta, recipientPk, USDC_MINT));

  const units = BigInt(Math.round(amount * 1_000_000)); // 6 decimals
  tx.add(ixTransferChecked(payerAta, USDC_MINT, recipientAta, payerPk, units, 6, refPk));

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
}

// Validation schemas
const createListingSchema = z.object({
  building_name: z.string(),
  coordinates: z.string(),
  floor: z.string(),
  sqm: z.number(),
  cost: z.number(),
  description: z.string(),
  youtube_link: z.string().url(),
  reference: z.string(),
  payment_network: z.enum(['solana', 'aptos', 'sui']).default('solana'),
  thai_only: z.boolean().optional().default(false)
  , has_pool: z.boolean().optional().default(false)
  , has_parking: z.boolean().optional().default(false)
  , is_top_floor: z.boolean().optional().default(false)
  , six_months: z.boolean().optional().default(false)
  , promo_code: z.string().optional()
});

async function validateSolanaPayment(reference: string): Promise<boolean> {
  try {
    const refPk = new PublicKey(reference);
    const signatures = await connection.getSignaturesForAddress(refPk, { limit: 1 });
    if (signatures.length === 0) return false;
    const sig = signatures[0].signature;
    const tx = await connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
    if (!tx || tx.slot === 0) return false;
    if (!process.env.SOLANA_MERCHANT_ADDRESS) return false;
    const merchant = new PublicKey(process.env.SOLANA_MERCHANT_ADDRESS);
    const merchantAta = ata(merchant, USDC_MINT);
    let valid = false;
    tx.transaction.message.instructions.forEach((ix: ParsedInstruction | PartiallyDecodedInstruction) => {
      if (ix.programId.equals(TOKEN_PROGRAM_ID) && 'parsed' in ix && ix.parsed.type === 'transferChecked') {
        if (ix.parsed.info.destination === merchantAta.toBase58() && ix.parsed.info.tokenAmount.amount === '1000000') {
          valid = true;
        }
      }
    });
    return valid;
  } catch (error) {
    app.log.error(error);
    return false;
  }
}

async function validateAptosPayment(reference: string): Promise<boolean> {
  try {
    // For Aptos, we'll use a simplified validation approach
    // In production, you'd want to implement proper transaction verification
    // For now, we'll accept any valid reference format
    return Boolean(reference && reference.length > 0);
  } catch (error) {
    app.log.error(error);
    return false;
  }
}

async function validateSuiPayment(reference: string): Promise<boolean> {
  try {
    // For Sui, we'll use a simplified validation approach
    // In production, you'd want to implement proper transaction verification
    // For now, we'll accept any valid reference format
    return Boolean(reference && reference.length > 0);
  } catch (error) {
    app.log.error(error);
    return false;
  }
}

// Routes
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
  const data = createListingSchema.parse(request.body);
  const [lat, lng] = data.coordinates.split(',').map(s => parseFloat(s.trim()));

  let isValid = false;
  
  // Validate payment based on network
  switch (data.payment_network) {
    case 'solana':
      isValid = await validateSolanaPayment(data.reference);
      break;
    case 'aptos':
      isValid = await validateAptosPayment(data.reference);
      break;
    case 'sui':
      isValid = await validateSuiPayment(data.reference);
      break;
    default:
      return reply.code(400).send({ error: 'Invalid payment network' });
  }

  if (!isValid) {
    return reply.code(400).send({ error: 'Invalid payment' });
  }

  const months = data.six_months ? 6 : 1;
  const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

  // Promo handling
  const configuredPromo = process.env.PROMO_CODE;
  const configuredMaxUses = process.env.PROMO_MAX_USES ? Number(process.env.PROMO_MAX_USES) : undefined;
  if (data.promo_code) {
    if (!configuredPromo) {
      return reply.code(400).send({ error: 'Promo not configured' });
    }
    if (data.promo_code.toLowerCase() !== configuredPromo.toLowerCase()) {
      return reply.code(400).send({ error: 'Invalid promo' });
    }
    if (configuredMaxUses !== undefined) {
      const promo = await prisma.promo.upsert({
        where: { code: configuredPromo },
        update: {},
        create: { code: configuredPromo, remaining_uses: configuredMaxUses }
      });
      if (promo.remaining_uses <= 0) {
        return reply.code(400).send({ error: 'Promo exhausted' });
      }
      await prisma.promo.update({ where: { code: configuredPromo }, data: { remaining_uses: { decrement: 1 } } });
    }
    // promo accepted: skip payment validation
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
      payment_network: data.payment_network,
      thai_only: data.thai_only ?? false,
      has_pool: data.has_pool ?? false,
      has_parking: data.has_parking ?? false,
      is_top_floor: data.is_top_floor ?? false,
      six_months: data.six_months ?? false,
      expires_at: expiresAt,
    },
  });

  return listing;
});

app.get('/api/listings/:name', async (request) => {
  const { name } = request.params as { name: string };
  const listings = await prisma.listing.findMany({ where: { building_name: name } });
  return listings;
});

// Add tx endpoints
app.post('/api/tx/usdc', async (request, reply) => {
  try {
    const { payer, recipient, amount, reference } = request.body as { payer: string, recipient: string, amount: number, reference?: string };
    if (!payer || !recipient || !amount) {
      return reply.code(400).send({ error: 'Missing payer, recipient, or amount' });
    }
    const txb64 = await buildUsdcTransferTx({ payer, recipient, amount, reference });
    return { transaction: txb64 };
  } catch (e: any) {
    app.log.error(e);
    return reply.code(500).send({ error: e.message || String(e) });
  }
});

app.post('/api/tx/aptos', async (request, reply) => {
  try {
    const { payer, amount, reference } = request.body as { payer: string, amount: number, reference: string };
    if (!payer || !amount || !reference) {
      return reply.code(400).send({ error: 'Missing payer, amount, or reference' });
    }
    
    // Create a simple transfer transaction for Aptos
    const transaction = await aptos.transferCoinTransaction({
      sender: payer,
      recipient: process.env.APTOS_MERCHANT_ADDRESS || '0x1',
      amount: amount * 1000000, // 6 decimals for USDC
      coinType: '0x1::aptos_coin::AptosCoin' // Using APT for simplicity
    });
    
    return { transaction };
  } catch (e: any) {
    app.log.error(e);
    return reply.code(500).send({ error: e.message || String(e) });
  }
});

app.post('/api/tx/sui', async (request, reply) => {
  try {
    const { payer, amount, reference } = request.body as { payer: string, amount: number, reference: string };
    if (!payer || !amount || !reference) {
      return reply.code(400).send({ error: 'Missing payer, amount, or reference' });
    }
    
    // Create a simple transfer transaction for Sui
    const transaction = {
      kind: 'transferObject',
      data: {
        from: payer,
        to: process.env.SUI_MERCHANT_ADDRESS || '0x1',
        amount: amount * 1000000, // 6 decimals for USDC
        coinType: '0x2::sui::SUI' // Using SUI for simplicity
      }
    };
    
    return { transaction };
  } catch (e: any) {
    app.log.error(e);
    return reply.code(500).send({ error: e.message || String(e) });
  }
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
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
