import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { z } from 'zod';
import { PublicKey, Connection, SystemProgram, Transaction, TransactionInstruction, ParsedTransactionWithMeta, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import axios from 'axios';

dotenv.config();

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, { origin: '*' });

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

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
  // no payment_network
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

// Routes
app.get('/listings', async () => {
  const listings = await prisma.listing.findMany();
  // Group by building_name as in original
  const grouped: Record<string, typeof listings> = listings.reduce((acc: Record<string, typeof listings>, listing) => {
    acc[listing.building_name] = acc[listing.building_name] || [];
    acc[listing.building_name].push(listing);
    return acc;
  }, {});
  return grouped;
});

app.post('/listings', async (request, reply) => {
  const data = createListingSchema.parse(request.body);
  const [lat, lng] = data.coordinates.split(',').map(s => parseFloat(s.trim()));

  const isValid = await validateSolanaPayment(data.reference);

  if (!isValid) {
    return reply.code(400).send({ error: 'Invalid payment' });
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
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  return listing;
});

app.get('/listings/:name', async (request) => {
  const { name } = request.params as { name: string };
  const listings = await prisma.listing.findMany({ where: { building_name: name } });
  return listings;
});

// Add tx endpoint
app.post('/tx/usdc', async (request, reply) => {
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

// Cron job to delete expired listings
cron.schedule('0 0 * * *', async () => {
  await prisma.listing.deleteMany({
    where: { expires_at: { lt: new Date() } },
  });
  app.log.info('Expired listings deleted');
});

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
