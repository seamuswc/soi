# Payment System Explanation

## How It Works

### 1. **Wallet Address vs Reference**
- **Wallet Address**: The destination wallet that receives payments 
  - Solana: `8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj`
  - Aptos: `0x3ee3f84b9e045db6bcb610b7503f200cf6b91908fbc7b886a65e9ad8f1a7e7b3`
- **Reference**: A unique identifier for each payment (e.g., `ABC123XYZ_abc123`)

### 2. **Payment Flow**
1. User fills out listing form
2. System generates a **unique reference** for this payment
3. QR code contains: wallet address + amount + reference
4. User pays using QR code or wallet buttons
5. System verifies payment by checking:
   - ✅ Payment received by the correct wallet address
   - ✅ Correct amount (1 USDC)
   - ✅ Reference included in transaction

### 3. **Copying Address Works Fine!**

**YES, you can copy the wallet address and paste it into your browser wallet!** 

Here's why it works:

#### **Scenario 1: Using QR Code (Recommended)**
- QR code contains: `solana:8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj?amount=1&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=ABC123XYZ_abc123`
- Wallet automatically fills: address, amount, token, and reference
- **Payment verification works perfectly**

#### **Scenario 2: Copying Address Only**
- You copy: `8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj` (Solana) or `0x3ee3f84b9e045db6bcb610b7503f200cf6b91908fbc7b886a65e9ad8f1a7e7b3` (Aptos)
- You manually enter: 1 USDC
- **You need to include the reference in the memo/note field**
- Payment verification will work if reference is included

#### **Scenario 3: Copying Address Without Reference**
- You copy address and send 1 USDC
- **Payment verification will FAIL** because no reference is found

## **The Fix I Made**

### **Before (Broken):**
```php
// ❌ Wrong: Checking transactions for reference address
$url = "https://api.helius.xyz/v0/addresses/{$this->reference}/transactions";
```

### **After (Fixed):**
```php
// ✅ Correct: Checking transactions for recipient wallet
$url = "https://api.helius.xyz/v0/addresses/{$recipientWallet}/transactions";

// ✅ Then checking if reference is included in transaction
if (str_contains($txData, $this->reference)) {
    return true; // Payment verified!
}
```

## **Best Practices**

### **✅ Recommended:**
1. Use QR code (includes everything automatically)
2. Use "Open Phantom/Solflare" buttons
3. If copying address, include reference in memo field

### **⚠️ Works but requires manual steps:**
1. Copy wallet address
2. Paste in wallet
3. Set amount to 1 USDC
4. **Important**: Add reference to memo/note field
5. Send payment

### **❌ Won't work:**
1. Copy address only
2. Send payment without reference
3. Payment verification will fail

## **No Conflicts!**

Each payment is uniquely identified by:
- **Wallet Address**: Always the same (your business wallet)
- **Reference**: Unique for each transaction
- **Amount**: Always 1 USDC

So you can copy the address multiple times - the system tracks each payment by its unique reference!

## **Your Wallet Addresses**

### **Solana (Mainnet)**
```
8zS5w8MHSDQ4Pc12DZRLYQ78hgEwnBemVJMrfjUN6xXj
```

### **Aptos (Mainnet)**
```
0x3ee3f84b9e045db6bcb610b7503f200cf6b91908fbc7b886a65e9ad8f1a7e7b3
```

These addresses are now configured in your application and will be used for all payment QR codes and verification!
