# Solana + LINE Payment Migration

## Overview
This application has been updated to support **only Solana and LINE (Thai Baht) payments**, removing all Ethereum/EVM-based payment options.

## ✅ Changes Made

### Backend (`server/`)
- ✅ Removed all EVM payment validation (Ethereum, Arbitrum, Base)
- ✅ Added Solana payment verification using `@solana/web3.js`
- ✅ Updated payment validation to check Solana blockchain for USDC transfers
- ✅ Simplified merchant address configuration to only require `SOLANA_MERCHANT_ADDRESS`
- ✅ Updated API endpoints to `/api/payment/check/solana/:reference`
- ✅ Updated Prisma schema to only allow `'solana'` and `'thb'` payment networks

### Frontend (`client/`)
- ✅ Removed all wagmi/Reown/EVM dependencies
- ✅ Replaced with Solana Pay QR code generation using `qrcode.react`
- ✅ Updated `PaymentQRModal` to show Solana Pay QR codes
- ✅ Added auto-polling every 2 seconds for payment confirmation
- ✅ Auto-submits listing when Solana payment is confirmed
- ✅ Updated `CreatePage` to only show Solana and LINE payment options
- ✅ LINE payment opens chat without pre-filled message

### Dependencies
**Removed:**
- `@reown/appkit`
- `@reown/appkit-adapter-wagmi`
- `@tanstack/react-query`
- `@wagmi/connectors`
- `@wagmi/core`
- `viem`
- `wagmi`

**Added:**
- `@solana/web3.js` (both client and server)
- `qrcode.react` (client)

### Configuration Files
- ✅ Updated `setup-env.js` to only configure Solana and LINE
- ✅ Updated `set-merchant.js` to only manage Solana merchant address
- ✅ Removed `wagmiConfig.js`

## 🚀 How It Works

### Solana Payment Flow
1. User fills out property listing form
2. Clicks "Pay with Solana" button
3. QR code modal appears with Solana Pay URL
4. User scans with Phantom, Solflare, or any Solana wallet
5. Payment is sent to merchant address with unique reference
6. Frontend polls backend every 2 seconds to check for payment
7. Backend verifies payment on Solana blockchain
8. Once confirmed, listing is automatically created
9. User is redirected to home page

### LINE Payment Flow
1. User fills out property listing form
2. Clicks "Open LINE Chat" button
3. Opens LINE chat in new tab/window
4. User discusses payment details directly with merchant
5. After manual confirmation, user can submit listing

## 📦 Environment Variables

Required in `.env`:
```bash
SOLANA_MERCHANT_ADDRESS="YourSolanaWalletAddress"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
LINE_ACCOUNT="@soipattaya"
```

## 🔧 Setup Commands

```bash
# Configure Solana merchant address
npm run merchant

# Configure LINE account
npm run line

# Full setup
npm run setup
```

## 📝 Payment Details

- **Solana Payment:** 1 USDC (USDC SPL token on Solana mainnet)
- **USDC Mint Address:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **LINE Payment:** Manual payment via LINE chat, amount discussed directly

## 🧪 Testing

### Test Solana Payment (Devnet)
1. Change `SOLANA_RPC_URL` to devnet: `https://api.devnet.solana.com`
2. Use a devnet wallet with devnet USDC
3. Test the payment flow

### Test LINE Payment
1. Configure LINE account in `.env`
2. Click "Thai Baht" payment option
3. Verify LINE chat opens correctly

## 🔒 Security Notes

- Payment validation happens on-chain via Solana blockchain
- Reference is a unique 32-byte identifier per transaction
- Backend verifies USDC transfer amount and destination
- LINE payments require manual verification by merchant

## 📱 Supported Wallets

- **Solana:** Phantom, Solflare, Backpack, any Solana Pay compatible wallet
- **LINE:** Any device with LINE app installed

## 🐛 Troubleshooting

### Payment not detected
- Ensure Solana RPC URL is working
- Check merchant address is correct in `.env`
- Verify USDC was sent (not SOL)
- Check transaction includes the reference

### QR Code not scanning
- Ensure wallet supports Solana Pay
- Try copying the URL manually
- Check QR code is fully visible on screen

### LINE chat not opening
- Verify LINE account format: `@username` (without https://)
- Ensure LINE app is installed on mobile
- Check browser allows popups

