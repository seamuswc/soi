# Technical Documentation - SOI Pattaya

## 🪙 Solana Pay Implementation Guide

### Complete Solana Pay Setup for Any Project

#### 1. Required Dependencies
```bash
npm install @solana/web3.js qrcode.react axios
```

#### 2. Solana Pay URL Structure
```typescript
// Base URL format
const solanaPayUrl = `solana:${merchantAddress}?amount=${amount}&spl-token=${USDC_MINT}&reference=${reference}&label=${label}&message=${message}`;

// Real example
const solanaPayUrl = `solana:8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj?amount=1&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=abc123&label=SOI%20Pattaya&message=Property%20Listing%20Payment`;
```

#### 3. USDC Token Configuration
```typescript
// USDC Mint Address (same for all projects)
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Amount in USDC (1 USDC = 1,000,000 micro-USDC)
const amount = 1; // 1 USDC
```

#### 4. Generate Unique Reference
```typescript
import { Keypair } from '@solana/web3.js';

// Generate unique reference for each payment
const reference = Keypair.generate().publicKey.toBase58();
// Example: "8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj"
```

#### 5. Complete Payment Component
```typescript
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Keypair } from '@solana/web3.js';
import axios from 'axios';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function SolanaPayment({ merchantAddress, amount, onSuccess, onClose }) {
  const [reference, setReference] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate unique reference
    const newReference = Keypair.generate().publicKey.toBase58();
    setReference(newReference);
    
    // Create Solana Pay URL
    const solanaPayUrl = `solana:${merchantAddress}?amount=${amount}&spl-token=${USDC_MINT}&reference=${newReference}&label=Your%20App&message=Payment%20for%20Service`;
    setQrUrl(solanaPayUrl);
    setLoading(false);
    
    // Start payment detection
    detectPayment(newReference);
  }, []);

  const detectPayment = async (ref) => {
    // Poll for payment confirmation (2 minutes max)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
      
      try {
        const response = await axios.get(`/api/payment/check/solana/${ref}`);
        if (response.data?.confirmed) {
          setPaid(true);
          onSuccess(response.data);
          return;
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }
    
    // Timeout after 2 minutes
    alert('Payment timeout. Please try again.');
    onClose();
  };

  if (loading) return <div>Generating payment...</div>;
  if (paid) return <div>Payment confirmed!</div>;

  return (
    <div>
      <QRCodeSVG value={qrUrl} size={256} level="H" />
      <p>Scan with your Solana wallet</p>
      <p>Amount: {amount} USDC</p>
      <p>Reference: {reference}</p>
    </div>
  );
}
```

#### 6. Backend Payment Detection
```typescript
// Server-side payment verification
app.get('/api/payment/check/solana/:reference', async (request, reply) => {
  const { reference } = request.params;
  
  try {
    // Connect to Solana RPC
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // Get transaction signatures for the reference
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(merchantAddress),
      { limit: 10 }
    );
    
    // Check each transaction for our reference
    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature);
      
      if (tx && tx.meta?.logMessages?.some(log => 
        log.includes(reference) && log.includes('Transfer')
      )) {
        return { confirmed: true, signature: sig.signature };
      }
    }
    
    return { confirmed: false };
  } catch (error) {
    return { confirmed: false, error: error.message };
  }
});
```

#### 7. Environment Variables Required
```env
# .env file
SOLANA_MERCHANT_ADDRESS=your_solana_wallet_address
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

#### 8. Mobile Wallet Integration
```typescript
// Detect if user has Phantom wallet
const detectPhantom = () => {
  const win = window;
  if (win.solana?.isPhantom) return win.solana;
  if (win.phantom?.solana?.isPhantom) return win.phantom.solana;
  return null;
};

// Direct wallet connection (alternative to QR)
const connectWallet = async () => {
  const phantom = detectPhantom();
  if (!phantom) {
    alert('Please install Phantom wallet');
    return;
  }
  
  try {
    const response = await phantom.connect();
    const publicKey = response.publicKey.toString();
    
    // Use publicKey as merchant address
    // Continue with payment flow
  } catch (error) {
    console.error('Wallet connection failed:', error);
  }
};
```

#### 9. Supported Wallets
- **Phantom Wallet** - Most popular
- **Solflare Wallet** - Alternative
- **Backpack Wallet** - Developer focused
- **Any Solana wallet** - With Solana Pay support

#### 10. Testing on Devnet
```typescript
// For testing, use devnet
const connection = new Connection('https://api.devnet.solana.com');

// Use devnet USDC mint
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

// Test with small amounts
const testAmount = 0.001; // 0.001 USDC for testing
```

#### 11. Production Considerations
```typescript
// Rate limiting for payment checks
const paymentCheckRate = 5000; // 5 seconds between checks
const maxChecks = 40; // 2 minutes total

// Error handling
try {
  const response = await checkPayment(reference);
  if (response.confirmed) {
    // Process payment
    await processPayment(reference, amount);
  }
} catch (error) {
  console.error('Payment processing failed:', error);
  // Handle error appropriately
}

// Database logging
await logPaymentAttempt(reference, amount, status);
```

#### 12. Complete Integration Example
```typescript
// Full payment flow for any project
const processSolanaPayment = async (amount, description) => {
  // 1. Generate reference
  const reference = Keypair.generate().publicKey.toBase58();
  
  // 2. Create Solana Pay URL
  const solanaPayUrl = `solana:${merchantAddress}?amount=${amount}&spl-token=${USDC_MINT}&reference=${reference}&label=${encodeURIComponent(description)}`;
  
  // 3. Show QR code
  setQrCode(solanaPayUrl);
  
  // 4. Start payment detection
  const paymentResult = await detectPayment(reference);
  
  // 5. Process on confirmation
  if (paymentResult.confirmed) {
    await completePayment(reference, amount);
    return { success: true, reference };
  }
  
  return { success: false, error: 'Payment timeout' };
};
```

### Key Points for Other Projects:
1. **USDC Mint is always the same** - `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
2. **Reference must be unique** - Use Keypair.generate().publicKey.toBase58()
3. **Polling is required** - Solana doesn't have webhooks
4. **QR codes work on mobile** - Desktop users need wallet browser extension
5. **Test on devnet first** - Use devnet RPC and test USDC
6. **Handle timeouts** - 2 minutes is reasonable timeout
7. **Log everything** - Payment attempts, confirmations, failures

## 🏠 Local Deploy System

### How Local Deploy Works
```bash
# 1. Build everything
npm run build

# 2. Start backend server (port 3000)
cd server && node dist/index.js &

# 3. Start proxy server (port 8080) 
node proxy-server.js &

# 4. Access at http://localhost:8080
```

### Proxy Server Architecture
```javascript
// proxy-server.js - Handles both static files and API calls
const server = http.createServer((req, res) => {
  // API requests → proxy to backend (port 3000)
  if (req.url.startsWith('/api/')) {
    // Forward to backend server
  }
  
  // Static files → serve from client/dist
  else {
    // Serve React app
  }
});
```

### Local Development Flow
1. **Backend Server** (port 3000) - Handles API calls, database, payments
2. **Proxy Server** (port 8080) - Serves frontend + proxies API calls
3. **Frontend** - React app served from client/dist
4. **Database** - SQLite file in server/database/database.sqlite

## 🚀 Complete Server Setup Command

### `sudo ./deploy.sh` - What It Does

```bash
# 1. SYSTEM SETUP
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# 2. CODE DEPLOYMENT
git clone https://github.com/seamuswc/soi.git /var/www/soi
cd /var/www/soi

# 3. DEPENDENCIES
npm install
cd client && npm install
cd ../server && npm install

# 4. BUILD PROCESS
npm run build  # Builds both client and server

# 5. DATABASE SETUP
cd server
npx prisma generate
npx prisma db push
# Creates database.sqlite with all tables

# 6. ENVIRONMENT CONFIGURATION
# Creates .env files with production settings
# Sets up Google Maps API key
# Configures Tencent SES email
# Sets Solana merchant address

# 7. NGINX CONFIGURATION
# Creates nginx config for reverse proxy
# Sets up SSL with Let's Encrypt
# Configures domain routing

# 8. PM2 PROCESS MANAGEMENT
# Installs PM2 globally
# Creates ecosystem.config.js
# Starts application with PM2
# Sets up auto-restart on server reboot

# 9. SSL CERTIFICATE
# Runs certbot for SSL certificate
# Configures automatic renewal

# 10. FIREWALL CONFIGURATION
# Opens ports 80, 443
# Closes unnecessary ports
```

### Complete Server Architecture After Deploy
```
Internet → Nginx (SSL) → PM2 → Node.js App → SQLite Database
                ↓
            Static Files (React App)
```

### What Gets Installed
- **Node.js & npm** - Runtime environment
- **Nginx** - Reverse proxy and static file server
- **PM2** - Process manager for Node.js
- **Certbot** - SSL certificate management
- **SQLite** - Database (file-based)
- **Prisma** - Database ORM

### Environment Files Created
- **Root .env** - Global configuration
- **Client .env** - Frontend environment variables  
- **Server .env** - Backend configuration
- **Nginx config** - Web server configuration
- **PM2 config** - Process management

### Database Schema Created
```sql
-- Listings table
CREATE TABLE listings (
  id INTEGER PRIMARY KEY,
  building_name TEXT,
  coordinates TEXT,
  latitude REAL,
  longitude REAL,
  -- ... all listing fields
);

-- Promo codes table  
CREATE TABLE promo (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,
  remaining_uses INTEGER,
  -- ... promo fields
);
```

### Services Started
- **PM2 Process** - Main application server
- **Nginx** - Web server and reverse proxy
- **SSL Certificate** - HTTPS encryption
- **Auto-restart** - Application restarts on server reboot

### File Structure After Deploy
```
/var/www/soi/
├── client/dist/          # Built React app
├── server/dist/          # Built Node.js server
├── server/database/      # SQLite database
├── email-templates/       # Email HTML templates
├── .env files            # Environment configuration
└── ecosystem.config.js   # PM2 configuration
```

### Access Points
- **Main Site** - https://yourdomain.com
- **Admin Dashboard** - https://yourdomain.com/dashboard
- **API Endpoints** - https://yourdomain.com/api/*
- **Static Files** - Served by Nginx

### Security Features
- **SSL Encryption** - All traffic encrypted
- **Firewall** - Only necessary ports open
- **Process Management** - PM2 handles crashes
- **Auto-updates** - SSL certificate renewal
- **Environment Protection** - API keys in .env files

---

**This is what `sudo ./deploy.sh` does - complete server setup from scratch.**
