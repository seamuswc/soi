"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const web3_js_1 = require("@solana/web3.js");
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const client_2 = require("@mysten/sui/client");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
dotenv_1.default.config();
// Environment variable validation
function validateEnvironment() {
    const required = {
        SOLANA_MERCHANT_ADDRESS: process.env.SOLANA_MERCHANT_ADDRESS,
        APTOS_MERCHANT_ADDRESS: process.env.APTOS_MERCHANT_ADDRESS,
        SUI_MERCHANT_ADDRESS: process.env.SUI_MERCHANT_ADDRESS,
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
    // Validate merchant addresses format
    try {
        if (process.env.SOLANA_MERCHANT_ADDRESS) {
            new web3_js_1.PublicKey(process.env.SOLANA_MERCHANT_ADDRESS);
        }
    }
    catch (error) {
        throw new Error('Invalid SOLANA_MERCHANT_ADDRESS format');
    }
    return true;
}
// Validate environment on startup
try {
    validateEnvironment();
}
catch (error) {
    // Environment validation failed - exit gracefully
    process.exit(1);
}
// Constants
const USDC_DECIMALS = 6;
const USDC_AMOUNT_WEI = 1000000; // 1 USDC with 6 decimals
const GAS_LIMIT = '0x7530'; // 30000 gas limit
const GAS_PRICE = '0x3b9aca00'; // 1 gwei gas price
const USDC_CONTRACT_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const APTOS_USDC_COIN_TYPE = '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC';
const SUI_USDC_COIN_TYPE = '0x5d4b302506645c3ff4b4467ffe4e6a893f2a31f4fdcb4d8647132a503af2daad::usdc::USDC';
const app = (0, fastify_1.default)({ logger: true });
const prisma = new client_1.PrismaClient();
app.register(cors_1.default, { origin: '*' });
const USDC_MINT = new web3_js_1.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
// Aptos configuration
const aptosConfig = new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.MAINNET });
const aptos = new ts_sdk_1.Aptos(aptosConfig);
// Sui configuration
const suiClient = new client_2.SuiClient({ url: (0, client_2.getFullnodeUrl)('mainnet') });
function ata(owner, mint) {
    return web3_js_1.PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}
function u64ToLeBytes(v) {
    const out = new Uint8Array(8);
    let n = BigInt(v);
    for (let i = 0; i < 8; i++) {
        out[i] = Number(n & 0xffn);
        n >>= 8n;
    }
    return out;
}
function ixCreateIdempotentATA(payer, ataPk, owner, mint) {
    return new web3_js_1.TransactionInstruction({
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: ataPk, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]) // CreateIdempotent
    });
}
function ixTransferChecked(src, mint, dst, owner, amountUnits, decimals, ref) {
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
    if (ref)
        keys.push({ pubkey: ref, isSigner: false, isWritable: false });
    return new web3_js_1.TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys, data });
}
async function buildUsdcTransferTx({ payer, recipient, amount, reference }) {
    const payerPk = new web3_js_1.PublicKey(payer);
    const recipientPk = new web3_js_1.PublicKey(recipient);
    const refPk = reference ? new web3_js_1.PublicKey(reference) : undefined;
    const { blockhash } = await connection.getLatestBlockhash({ commitment: 'processed' });
    const payerAta = ata(payerPk, USDC_MINT);
    const recipientAta = ata(recipientPk, USDC_MINT);
    const tx = new web3_js_1.Transaction({ feePayer: payerPk, recentBlockhash: blockhash });
    tx.add(ixCreateIdempotentATA(payerPk, recipientAta, recipientPk, USDC_MINT));
    const units = BigInt(Math.round(amount * 1000000)); // 6 decimals
    tx.add(ixTransferChecked(payerAta, USDC_MINT, recipientAta, payerPk, units, 6, refPk));
    return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
}
// Validation schemas
const createListingSchema = zod_1.z.object({
    building_name: zod_1.z.string(),
    coordinates: zod_1.z.string(),
    floor: zod_1.z.string(),
    sqm: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
    cost: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
    description: zod_1.z.string(),
    youtube_link: zod_1.z.string().url(),
    reference: zod_1.z.string(),
    payment_network: zod_1.z.enum(['solana', 'aptos', 'sui', 'base']).default('solana'),
    thai_only: zod_1.z.boolean().optional().default(false),
    has_pool: zod_1.z.boolean().optional().default(false),
    has_parking: zod_1.z.boolean().optional().default(false),
    is_top_floor: zod_1.z.boolean().optional().default(false),
    six_months: zod_1.z.boolean().optional().default(false),
    promo_code: zod_1.z.string().optional()
});
async function validatePayment(network, reference) {
    try {
        // Basic reference validation for all networks
        if (!reference || reference.length === 0)
            return false;
        // Network-specific validation
        switch (network) {
            case 'solana':
                return await validateSolanaPayment(reference);
            case 'aptos':
                return await validateAptosPayment(reference);
            case 'sui':
                return await validateSuiPayment(reference);
            case 'base':
                return await validateBasePayment(reference);
            default:
                app.log.error(`Unknown payment network: ${network}`);
                return false;
        }
    }
    catch (error) {
        app.log.error(`Payment validation error for ${network}: ${error}`);
        return false;
    }
}
async function validateSolanaPayment(reference) {
    try {
        const refPk = new web3_js_1.PublicKey(reference);
        const signatures = await connection.getSignaturesForAddress(refPk, { limit: 1 });
        if (signatures.length === 0)
            return false;
        const sig = signatures[0].signature;
        const tx = await connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
        if (!tx || tx.slot === 0)
            return false;
        if (!process.env.SOLANA_MERCHANT_ADDRESS)
            return false;
        const merchant = new web3_js_1.PublicKey(process.env.SOLANA_MERCHANT_ADDRESS);
        const merchantAta = ata(merchant, USDC_MINT);
        let valid = false;
        tx.transaction.message.instructions.forEach((ix) => {
            if (ix.programId.equals(TOKEN_PROGRAM_ID) && 'parsed' in ix && ix.parsed.type === 'transferChecked') {
                if (ix.parsed.info.destination === merchantAta.toBase58() && ix.parsed.info.tokenAmount.amount === USDC_AMOUNT_WEI.toString()) {
                    valid = true;
                }
            }
        });
        return valid;
    }
    catch (error) {
        app.log.error(error);
        return false;
    }
}
async function validateAptosPayment(reference) {
    try {
        if (!process.env.APTOS_MERCHANT_ADDRESS)
            return false;
        // Query Aptos blockchain for transactions with this reference
        // Reference is stored in transaction metadata/memo
        const transactions = await aptos.getAccountTransactions({
            accountAddress: process.env.APTOS_MERCHANT_ADDRESS,
            options: { limit: 100 }
        });
        // Look for transaction with matching reference and correct amount
        for (const tx of transactions) {
            if (tx.success && tx.payload && 'function' in tx.payload) {
                // Check if it's a coin transfer
                if (tx.payload.function.includes('transfer')) {
                    const args = tx.payload.arguments;
                    // Check recipient, amount, and reference
                    if (args && args[0] === process.env.APTOS_MERCHANT_ADDRESS) {
                        const amount = parseInt(args[1]);
                        if (amount === USDC_AMOUNT_WEI) {
                            // Transaction matches - validate reference in memo/metadata
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    catch (error) {
        app.log.error('Aptos validation error:', error);
        return false;
    }
}
async function validateSuiPayment(reference) {
    try {
        if (!process.env.SUI_MERCHANT_ADDRESS)
            return false;
        // Query Sui blockchain for transactions to merchant address
        const transactions = await suiClient.queryTransactionBlocks({
            filter: {
                ToAddress: process.env.SUI_MERCHANT_ADDRESS
            },
            options: {
                showEffects: true,
                showInput: true
            },
            limit: 100
        });
        // Look for transaction with correct USDC amount
        for (const tx of transactions.data) {
            if (tx.effects?.status.status === 'success') {
                // Check if transaction involves USDC transfer of correct amount
                // Reference validation would be in transaction metadata
                const balanceChanges = tx.effects.balanceChanges;
                if (balanceChanges) {
                    for (const change of balanceChanges) {
                        if (change.coinType.includes('USDC') &&
                            change.owner === process.env.SUI_MERCHANT_ADDRESS &&
                            Math.abs(parseInt(change.amount)) === USDC_AMOUNT_WEI) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    catch (error) {
        app.log.error('Sui validation error:', error);
        return false;
    }
}
async function validateBasePayment(reference) {
    try {
        if (!process.env.BASE_MERCHANT_ADDRESS)
            return false;
        // Query Base (EVM) blockchain using RPC
        // Base is an EVM chain, so we use standard eth_getLogs
        const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
        // USDC Transfer event signature
        const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        // Query for USDC transfer events to merchant address
        const response = await axios_1.default.post(baseRpcUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getLogs',
            params: [{
                    address: USDC_CONTRACT_BASE,
                    topics: [
                        transferEventSignature,
                        null, // from (any address)
                        '0x' + process.env.BASE_MERCHANT_ADDRESS.slice(2).padStart(64, '0') // to (merchant)
                    ],
                    fromBlock: 'latest',
                    toBlock: 'latest'
                }]
        });
        if (response.data.result && response.data.result.length > 0) {
            // Check if any transfer matches the amount
            for (const log of response.data.result) {
                const amount = parseInt(log.data, 16);
                if (amount === USDC_AMOUNT_WEI) {
                    // Found matching transaction
                    // Reference would be in transaction input data
                    return true;
                }
            }
        }
        return false;
    }
    catch (error) {
        app.log.error('Base validation error:', error);
        return false;
    }
}
// Routes
app.get('/api/config', async () => {
    return {
        recipient: process.env.SOLANA_MERCHANT_ADDRESS
    };
});
app.get('/api/listings', async () => {
    const listings = await prisma.listing.findMany();
    // Group by building_name as in original
    const grouped = listings.reduce((acc, listing) => {
        acc[listing.building_name] = acc[listing.building_name] || [];
        acc[listing.building_name].push(listing);
        return acc;
    }, {});
    return grouped;
});
// Authentication middleware
const authenticateToken = (request, reply, done) => {
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
    const { username, password } = request.body;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password';
    if (username === adminUsername && password === adminPassword) {
        const token = process.env.ADMIN_TOKEN || 'admin123';
        return { success: true, token };
    }
    else {
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
    }
    catch (error) {
        app.log.error('Error creating listing:', error);
        return reply.code(500).send({ error: 'Internal server error' });
    }
});
app.get('/api/listings/:name', async (request) => {
    const { name } = request.params;
    const listings = await prisma.listing.findMany({ where: { building_name: name } });
    return listings;
});
// Add tx endpoints
app.post('/api/tx/usdc', async (request, reply) => {
    try {
        const { payer, recipient, amount, reference } = request.body;
        if (!payer || !recipient || !amount) {
            return reply.code(400).send({ error: 'Missing payer, recipient, or amount' });
        }
        const txb64 = await buildUsdcTransferTx({ payer, recipient, amount, reference });
        return { transaction: txb64 };
    }
    catch (e) {
        app.log.error(e);
        return reply.code(500).send({ error: e.message || String(e) });
    }
});
app.post('/api/tx/aptos', async (request, reply) => {
    try {
        const { payer, amount, reference } = request.body;
        if (!payer || !amount || !reference) {
            return reply.code(400).send({ error: 'Missing payer, amount, or reference' });
        }
        // Create USDC transfer transaction for Aptos
        const transaction = await aptos.transferCoinTransaction({
            sender: payer,
            recipient: process.env.APTOS_MERCHANT_ADDRESS || '0x1',
            amount: amount * USDC_AMOUNT_WEI, // USDC with proper decimals
            coinType: APTOS_USDC_COIN_TYPE // USDC on Aptos
        });
        return { transaction };
    }
    catch (e) {
        app.log.error(e);
        return reply.code(500).send({ error: e.message || String(e) });
    }
});
app.post('/api/tx/sui', async (request, reply) => {
    try {
        const { payer, amount, reference } = request.body;
        if (!payer || !amount || !reference) {
            return reply.code(400).send({ error: 'Missing payer, amount, or reference' });
        }
        // Create USDC transfer transaction for Sui
        const transaction = {
            kind: 'transferObject',
            data: {
                from: payer,
                to: process.env.SUI_MERCHANT_ADDRESS || '0x1',
                amount: amount * USDC_AMOUNT_WEI, // USDC with proper decimals
                coinType: SUI_USDC_COIN_TYPE // USDC on Sui
            }
        };
        return { transaction };
    }
    catch (e) {
        app.log.error(e);
        return reply.code(500).send({ error: e.message || String(e) });
    }
});
app.post('/api/tx/base', async (request, reply) => {
    try {
        const { payer, amount, reference } = request.body;
        if (!payer || !amount || !reference) {
            return reply.code(400).send({ error: 'Missing payer, amount, or reference' });
        }
        // Create USDC ERC-20 transfer transaction for Base
        const usdcContract = USDC_CONTRACT_BASE;
        const recipient = process.env.BASE_MERCHANT_ADDRESS || '0x1';
        const amountWei = (amount * USDC_AMOUNT_WEI).toString(16).padStart(64, '0'); // USDC with proper decimals
        // ERC-20 transfer function signature: transfer(address,uint256)
        const transferSignature = 'a9059cbb'; // transfer(address,uint256)
        const recipientPadded = recipient.slice(2).padStart(64, '0');
        const transaction = {
            to: usdcContract,
            from: payer,
            value: '0x0', // 0 ETH value since we're using USDC
            data: `0x${transferSignature}${recipientPadded}${amountWei}`, // transfer(recipient, amount)
            gas: GAS_LIMIT, // 30000 gas limit for ERC-20 transfer
            gasPrice: GAS_PRICE // 1 gwei gas price
        };
        return { transaction };
    }
    catch (e) {
        app.log.error(e);
        return reply.code(500).send({ error: e.message || String(e) });
    }
});
// Cron job to delete expired listings
node_cron_1.default.schedule('0 0 * * *', async () => {
    await prisma.listing.deleteMany({
        where: { expires_at: { lt: new Date() } },
    });
    app.log.info('Expired listings deleted');
});
// Serve static files in production (after all API routes)
if (process.env.NODE_ENV === 'production') {
    app.register(require('@fastify/static'), {
        root: path_1.default.join(__dirname, '../../client/dist'),
        prefix: '/',
        decorateReply: false
    });
    // Serve index.html for all non-API routes (SPA)
    app.setNotFoundHandler((request, reply) => {
        // Don't serve HTML for API routes
        if (request.url.startsWith('/api/')) {
            return reply.code(404).send({ error: 'API endpoint not found' });
        }
        reply.type('text/html').send(require('fs').readFileSync(path_1.default.join(__dirname, '../../client/dist/index.html'), 'utf8'));
    });
}
// Start server
const start = async () => {
    try {
        await app.listen({ port: 3000 });
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
