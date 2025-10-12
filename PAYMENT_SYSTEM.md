# Payment System Overview

## Supported Payment Methods

### 1. 💜 Solana Payment (Automated)
- **Amount:** 1 USDC (SPL token)
- **Process:** Fully automated with QR code
- **Confirmation:** 2 minutes max (polls every 2 seconds)

**Flow:**
1. Customer fills out listing form
2. Clicks "Pay with Solana" button
3. QR code appears with Solana Pay URL
4. Customer scans with Phantom/Solflare/any Solana wallet
5. Payment sent to merchant wallet with unique reference
6. Frontend polls backend every 2 seconds
7. Backend verifies payment on Solana blockchain
8. **Listing auto-created when payment confirmed**
9. Customer redirected to home page

**Technical Details:**
- USDC Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Reference: 32-byte unique identifier per transaction
- Payment verification via `@solana/web3.js`
- Checks for USDC transfer to merchant address

---

### 2. 💚 Thai Baht Payment (Manual + Promo Code)
- **Amount:** Variable (discussed via LINE)
- **Process:** Manual bank transfer + admin verification
- **Confirmation:** Admin-generated promo code

**Flow:**
1. Customer fills out listing form
2. Clicks "Open LINE Chat" button
3. LINE opens (no pre-filled message)
4. Customer discusses payment and sends via ScanPay (Thai bank transfer)
5. **Admin verifies payment in bank account**
6. **Admin logs into dashboard** (`/dashboard`)
7. **Admin clicks "Generate Code"** button
8. System generates random 8-character promo code (1 use only)
9. **Admin copies code and sends to customer via LINE**
10. Customer enters promo code in listing form
11. **Customer submits listing** (promo code auto-validates)
12. System creates listing and decrements promo usage

**Admin Dashboard Features:**
- 🎟️ **Generate Promo Code** button (top of dashboard)
- One-click code generation (8 chars, alphanumeric)
- Copy to clipboard functionality
- Each code: single-use only
- Perfect for ScanPay payments

---

## Configuration

### Environment Variables

```bash
# Solana Settings
SOLANA_MERCHANT_ADDRESS="YourSolanaWalletAddress"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# LINE Settings
LINE_ACCOUNT="@soipattaya"

# Admin Settings
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
ADMIN_TOKEN="your_secure_token"
```

### Setup Commands

```bash
# Configure Solana merchant address
npm run merchant

# Configure LINE account
npm run line

# Full environment setup
npm run setup
```

---

## Admin Dashboard

### Access
- URL: `https://your-domain.com/dashboard`
- Login required (set in `.env`)

### Features

1. **📊 Statistics**
   - Total listings
   - Active listings
   - Expired listings

2. **🎟️ Promo Code Generator**
   - Generate single-use codes
   - Copy to clipboard
   - For Thai Baht payments

3. **📋 Listings Table**
   - View all listings
   - Payment method indicators
   - Active/Expired status
   - Creation dates

---

## Payment Comparison

| Feature | Solana | Thai Baht (LINE) |
|---------|--------|------------------|
| **Automation** | ✅ Fully automated | ⚠️ Manual verification |
| **Speed** | 🚀 2 minutes max | ⏱️ Varies (human-dependent) |
| **Confirmation** | ✅ On-chain verification | 📱 Admin approval |
| **Tech Stack** | Solana blockchain | ScanPay + Promo codes |
| **User Experience** | Scan QR → Done | Chat → Pay → Wait → Code → Submit |
| **Admin Work** | None | Generate & send promo code |
| **Amount** | Fixed (1 USDC) | Negotiable |
| **Best For** | Tech-savvy users | Thai locals without crypto |

---

## Promo Code System

### Manual Promo Codes (CLI)
```bash
npm run promo "WELCOME20" 100
```
Creates code with 100 uses (for marketing/promotions)

### Auto-Generated Promo Codes (Dashboard)
- Admin clicks button → instant 8-char code
- Single use only
- Perfect for payment confirmations
- Example: `X7K9M2Q1`

### Code Validation
- Case-insensitive
- Checked against database
- Decrements usage count on success
- Skips payment verification entirely

---

## Security & Validation

### Solana Payments
- ✅ On-chain verification via RPC
- ✅ Reference-based transaction matching
- ✅ Amount validation (1 USDC minimum)
- ✅ Merchant address verification
- ✅ SPL token transfer checks

### Promo Codes
- ✅ Database-backed validation
- ✅ Usage tracking (decrements on use)
- ✅ Admin-only generation (protected endpoint)
- ✅ No reuse possible (single-use for payments)
- ✅ Bypasses payment verification

---

## Troubleshooting

### Solana Payment Not Detected
1. Check `SOLANA_MERCHANT_ADDRESS` is correct
2. Verify Solana RPC is accessible
3. Ensure USDC was sent (not SOL)
4. Confirm transaction includes reference
5. Wait full 2 minutes before timing out

### Promo Code Issues
1. Ensure admin is logged in
2. Check database connection
3. Verify code hasn't been used already
4. Case doesn't matter (codes are case-insensitive)

### LINE Chat Not Opening
1. Verify `LINE_ACCOUNT` format: `@username`
2. Ensure browser allows popups
3. Check LINE app is installed on mobile

---

## Future Enhancements (Optional)

- [ ] Admin notification when Solana payment received
- [ ] Bulk promo code generation
- [ ] Promo code expiration dates
- [ ] Payment history tracking
- [ ] Multi-use promo codes with custom limits
- [ ] LINE bot integration for auto-responses
- [ ] Webhook for bank transfer notifications
- [ ] SMS promo code delivery

---

## Support

For issues or questions:
1. Check logs: `pm2 logs soipattaya`
2. Review environment variables: `cat .env`
3. Test Solana RPC: `curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`
4. Verify database: `cd server && npx prisma studio`

