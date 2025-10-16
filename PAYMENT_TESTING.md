# Payment and Listing Methodologies Testing

## Test Environment
- **Production Server**: https://soipattaya.com
- **Local Development**: http://localhost:8080 (server), http://localhost:5173 (client)

## Payment Paths to Test

### 1. FREE Promo Code Path
**Test**: Using the automatically created FREE promo code (1000 uses)

**Steps**:
1. Go to create listing page
2. Fill out form details
3. Verify FREE promo is auto-filled in promo code input
4. Click "Pay with Promo" button
5. Verify listing is created successfully
6. Check database: `payment_network = 'promo'`, `promo_code_used = 'free'`

**Expected Result**: ✅ Listing created with FREE promo code

### 2. Existing Promo Code Path
**Test**: Using a manually entered existing promo code

**Steps**:
1. Go to create listing page
2. Fill out form details
3. Enter a valid existing promo code in the input field
4. Click "Pay with Promo" button
5. Verify listing is created successfully
6. Check database: `payment_network = 'promo'`, `promo_code_used = '[entered_code]'`

**Expected Result**: ✅ Listing created with entered promo code

### 3. Buy Promo Code → Use Promo Code Path
**Test**: Complete flow of buying a promo code and then using it

**Steps**:
1. Go to create listing page
2. Select "Buy Promo Code" payment method
3. Choose number of uses (e.g., 2 uses)
4. Complete Solana payment
5. Verify promo code is generated
6. Click "Use This Promo Code" button
7. Verify promo code is auto-filled
8. Click "Pay with Promo" button
9. Verify listing is created successfully
10. Check database: `payment_network = 'promo'`, `promo_code_used = '[generated_code]'`

**Expected Result**: ✅ Complete flow works end-to-end

### 4. Solana Pay 1 USDC Path
**Test**: Direct Solana payment for 1 USDC

**Steps**:
1. Go to create listing page
2. Fill out form details
3. Select "Solana" payment method
4. Click "Pay with Solana" button
5. Complete Solana payment via QR code
6. Verify listing is created successfully
7. Check database: `payment_network = 'solana'`, `promo_code_used = null`

**Expected Result**: ✅ Listing created with Solana payment

### 5. Error Handling Tests

#### 5.1 Invalid Promo Code
**Test**: Enter invalid promo code

**Steps**:
1. Go to create listing page
2. Fill out form details
3. Enter invalid promo code (e.g., "INVALID123")
4. Click "Pay with Promo" button
5. Verify error handling

**Expected Result**: ❌ Error message, listing not created

#### 5.2 Expired Promo Code
**Test**: Use promo code with 0 remaining uses

**Steps**:
1. Create a promo code with 1 use
2. Use it once to create a listing
3. Try to use the same promo code again
4. Verify error handling

**Expected Result**: ❌ Error message, listing not created

## Database Verification

### Promo Code Table
```sql
SELECT * FROM Promo WHERE code = 'free';
-- Should show: remaining_uses = 999 (after first use)
```

### Listing Table
```sql
SELECT building_name, payment_network, promo_code_used, created_at 
FROM Listing 
ORDER BY created_at DESC 
LIMIT 5;
-- Should show recent listings with correct payment_network and promo_code_used
```

## API Endpoints to Test

### 1. FREE Promo Check
```bash
curl -s "https://soipattaya.com/api/promo/free"
# Expected: {"available":true,"remaining_uses":1000}
```

### 2. Promo Code List
```bash
curl -s "https://soipattaya.com/api/promo/list"
# Expected: Array of promo codes with remaining uses
```

### 3. Create Listing (with promo)
```bash
curl -X POST "https://soipattaya.com/api/listings" \
  -H "Content-Type: application/json" \
  -d '{
    "building_name": "Test Building",
    "coordinates": "12.9236,100.8825",
    "floor": "5",
    "sqm": "50",
    "cost": "1000",
    "description": "Test listing",
    "youtube_link": "https://youtube.com/test",
    "reference": "test123",
    "payment_network": "promo",
    "promo_code": "free",
    "rental_type": "living",
    "thai_only": false,
    "has_pool": false,
    "has_parking": false,
    "is_top_floor": false,
    "six_months": false
  }'
```

## Test Results

### ✅ Working Paths
- [ ] FREE promo auto-fill and usage
- [ ] Existing promo code usage
- [ ] Buy promo code → use promo code flow
- [ ] Solana Pay 1 USDC flow
- [ ] Error handling for invalid promo codes

### ❌ Issues Found
- [ ] Local development database setup
- [ ] Any other issues discovered during testing

## Notes
- All tests should be performed on the production server (https://soipattaya.com)
- Local development requires proper database setup
- FREE promo code is automatically created with 1000 uses on server startup
- Generated promo codes should have the correct number of uses based on payment
