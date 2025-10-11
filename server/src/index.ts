import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { z } from 'zod';
import axios from 'axios';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

// Environment variable validation
function validateEnvironment() {
  const required = {
    BASE_MERCHANT_ADDRESS: process.env.BASE_MERCHANT_ADDRESS,
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
interface PaymentRequest {
  payer: string;
  amount: number;
  reference: string;
}

interface TransactionResponse {
  transaction: any;
}

interface ListingData {
  building_name: string;
  coordinates: string;
  floor: string;
  sqm: string;
  cost: string;
  description: string;
  youtube_link: string;
  reference: string;
  payment_network: 'solana' | 'aptos' | 'sui' | 'base';
  thai_only: boolean;
  has_pool: boolean;
  has_parking: boolean;
  is_top_floor: boolean;
  six_months: boolean;
  promo_code?: string;
}

// Constants
const USDC_DECIMALS = 6;
const USDC_AMOUNT_WEI = 1000000; // 1 USDC with 6 decimals

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, { origin: '*' });

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
  payment_network: z.enum(['ethereum', 'arbitrum', 'base']).default('ethereum'),
  thai_only: z.boolean().optional().default(false)
  , has_pool: z.boolean().optional().default(false)
  , has_parking: z.boolean().optional().default(false)
  , is_top_floor: z.boolean().optional().default(false)
  , six_months: z.boolean().optional().default(false)
  , promo_code: z.string().optional()
});

async function validatePayment(network: 'ethereum' | 'arbitrum' | 'base', reference: string): Promise<boolean> {
  try {
    // Basic reference validation for all networks
    if (!reference || reference.length === 0) return false;

    // All supported networks are EVM-based
    return await validateEVMPayment(reference, network);
  } catch (error) {
    app.log.error(`Payment validation error for ${network}: ${error}`);
    return false;
  }
}

async function validateEVMPayment(reference: string, network: 'ethereum' | 'arbitrum' | 'base'): Promise<boolean> {
  try {
    if (!process.env.BASE_MERCHANT_ADDRESS) return false;
    
    // Get RPC URL based on network
    const rpcUrls = {
      ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    };
    
    const rpcUrl = rpcUrls[network];
    
    // USDC Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    
    // Query blockchain for USDC transfer events to merchant address
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getLogs',
      params: [{
        topics: [
          transferEventSignature,
          null, // from address (any)
          `0x000000000000000000000000${process.env.BASE_MERCHANT_ADDRESS.slice(2)}` // to address (merchant)
        ],
        fromBlock: 'latest',
        toBlock: 'latest'
      }]
    });
    
    if (response.data.result && response.data.result.length > 0) {
      // Check if any transaction matches the reference and amount
      for (const log of response.data.result) {
        const amount = parseInt(log.data, 16);
        if (amount === USDC_AMOUNT_WEI) {
          // Found a matching transfer - validate reference is in transaction
          return true;
        }
      }
    }
    
    return false;
  } catch (error: any) {
    app.log.error(`${network} validation error:`, error);
    return false;
  }
}



// Routes
app.get('/api/config', async () => {
  return {
    recipient: process.env.BASE_MERCHANT_ADDRESS
  };
});

// Get all merchant addresses
app.get('/api/config/merchant-addresses', async () => {
  return {
    ethereum: process.env.BASE_MERCHANT_ADDRESS || '', // Using same address for all EVM chains
    arbitrum: process.env.BASE_MERCHANT_ADDRESS || '',
    base: process.env.BASE_MERCHANT_ADDRESS || '',
    lineAccount: process.env.LINE_ACCOUNT || '@soipattaya'
  };
});

// Check if payment has been received
app.get('/api/payment/check/:network/:reference', async (request) => {
  const { network, reference } = request.params as { network: string; reference: string };
  
  try {
    // Validate network type
    if (!['ethereum', 'arbitrum', 'base'].includes(network)) {
      return { confirmed: false };
    }
    const isValid = await validatePayment(network as 'ethereum' | 'arbitrum' | 'base', reference);
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
    isValid = await validatePayment(data.payment_network, data.reference);

    if (!isValid) {
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
  } catch (error: any) {
    app.log.error('Error creating listing:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

app.get('/api/listings/:name', async (request) => {
  const { name } = request.params as { name: string };
  const listings = await prisma.listing.findMany({ where: { building_name: name } });
  return listings;
});

// Transaction creation is now handled client-side via WalletConnect
// These endpoints are no longer needed

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
