# Solana Pay Implementation Reference

## Overview
This document explains how Solana Pay is correctly implemented in this project, based on the working template from `/Users/seamus/Desktop/solana-pay-template/`.

## Key Components

### 1. Constants and Configuration
```typescript
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const USDC_DECIMALS = 6;
const USDC_AMOUNT = 1000000; // 1 USDC with 6 decimals
```

### 2. Helper Functions

#### Get Associated Token Address
```typescript
function getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}
```

#### Convert Number to u64 Bytes (Little-Endian)
```typescript
function u64ToLeBytes(value: number): Uint8Array {
  const out = new Uint8Array(8);
  let n = BigInt(value);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}
```

#### Create Idempotent ATA Instruction (Opcode 1)
```typescript
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
```

#### Transfer Checked Instruction with Reference (Opcode 12)
```typescript
function transferCheckedInstruction(
  src: PublicKey,
  mint: PublicKey,
  dst: PublicKey,
  owner: PublicKey,
  amountUnits: bigint,
  decimals: number,
  ref: PublicKey
): TransactionInstruction {
  const data = new Uint8Array(1 + 8 + 1);
  data[0] = 12; // TransferChecked opcode
  data.set(u64ToLeBytes(Number(amountUnits)), 1);
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
    data: Buffer.from(data)
  });
}
```

### 3. Payment Validation

#### Clean Reference Handling
```typescript
async function validateSolanaPayment(reference: string): Promise<boolean> {
  try {
    if (!reference || reference.length < 32) return false;
    
    // Clean reference - remove any suffixes like :1 that might be added by browsers
    const cleanReference = reference.split(':')[0];
    
    // Convert reference to PublicKey
    const referencePublicKey = new PublicKey(cleanReference);
    
    // Get signatures for the reference address
    // If the reference appears in any transaction, payment was made
    const signatures = await connection.getSignaturesForAddress(referencePublicKey, { limit: 1 });
    
    return signatures && signatures.length > 0;
  } catch (error: any) {
    app.log.error('Solana payment validation error:', error);
    return false;
  }
}
```

### 4. Transaction Building

#### Build USDC Transaction
```typescript
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
  } catch (error) {
    app.log.error('Transaction build error:', error);
    return reply.code(500).send({ error: error.message || 'Failed to build transaction' });
  }
});
```

### 5. Payment Checking

#### Check Payment Status
```typescript
app.get('/api/payment/check/:reference', async (request, reply) => {
  try {
    const { reference } = request.params;
    
    const isValid = await validateSolanaPayment(reference);
    return { confirmed: isValid };
  } catch (error) {
    app.log.error('Payment check error:', error);
    return { confirmed: false };
  }
});
```

## Key Implementation Details

### 1. Reference Handling
- **Clean Reference**: Remove browser suffixes like `:1` that might be added
- **Reference as Key**: Include reference as a read-only key in the transfer instruction
- **This is crucial**: Wallets detect payments by scanning for the reference in transaction keys

### 2. ATA Creation
- **Idempotent**: Use opcode 1 (CreateIdempotent) to avoid errors if ATA already exists
- **Automatic**: Create recipient ATA if it doesn't exist

### 3. Transfer Instruction
- **TransferChecked**: Use opcode 12 with amount and decimals
- **Reference Key**: Include reference as a read-only key
- **Amount Conversion**: Convert to smallest units (6 decimals for USDC)

### 4. Transaction Serialization
- **No Signatures**: Serialize without requiring signatures
- **Base64**: Return as base64 string for frontend consumption

## Frontend Integration

### 1. Generate Reference
```javascript
// Generate unique reference (Solana public key)
const reference = Keypair.generate().publicKey.toBase58();
```

### 2. Build Transaction
```javascript
const response = await fetch('/api/transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    payer: wallet.publicKey.toBase58(),
    recipient: merchantAddress,
    amount: 1, // 1 USDC
    reference: reference
  })
});

const { transaction } = await response.json();
```

### 3. Sign and Send
```javascript
const transactionBuffer = Buffer.from(transaction, 'base64');
const transactionObj = Transaction.from(transactionBuffer);

// Sign with wallet
const signedTransaction = await wallet.signTransaction(transactionObj);

// Send to network
const signature = await connection.sendRawTransaction(signedTransaction.serialize());
```

### 4. Check Payment
```javascript
// Poll for payment confirmation
const checkPayment = async () => {
  const response = await fetch(`/api/payment/check/${reference}`);
  const { confirmed } = await response.json();
  return confirmed;
};
```

## Environment Variables

```bash
SOLANA_MERCHANT_ADDRESS=your_merchant_wallet_address
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Testing

### 1. Test Transaction Building
```bash
curl -X POST "https://soipattaya.com/api/transaction" \
  -H "Content-Type: application/json" \
  -d '{
    "payer": "test_payer_address",
    "recipient": "merchant_address", 
    "amount": 1,
    "reference": "test_reference"
  }'
```

### 2. Test Payment Validation
```bash
curl "https://soipattaya.com/api/payment/check/test_reference"
```

## Common Issues and Solutions

### 1. Reference Not Detected
- **Issue**: Payment not detected even after transaction
- **Solution**: Ensure reference is included as a key in transfer instruction

### 2. ATA Creation Errors
- **Issue**: "Account does not exist" errors
- **Solution**: Use idempotent ATA creation (opcode 1)

### 3. Browser Suffixes
- **Issue**: Reference has `:1` suffix from browser
- **Solution**: Clean reference by splitting on `:` and taking first part

### 4. Amount Conversion
- **Issue**: Wrong USDC amounts
- **Solution**: Convert to smallest units (multiply by 1,000,000 for USDC)

## Best Practices

1. **Always use idempotent ATA creation**
2. **Include reference as a key in transfer instruction**
3. **Clean reference strings before validation**
4. **Use proper amount conversion (6 decimals for USDC)**
5. **Handle errors gracefully in validation**
6. **Use confirmed commitment for better reliability**

This implementation ensures reliable Solana Pay integration with proper QR code scanning and payment detection.
