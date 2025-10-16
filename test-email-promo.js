#!/usr/bin/env node
// Test script for promo code email
// Usage: node test-email-promo.js

const axios = require('axios');

async function testPromoCodeEmail() {
  console.log('📧 Testing Promo Code Email...');
  
  try {
    // Test promo code generation with email
    const response = await axios.post('https://soipattaya.com/api/promo/generate-after-payment', {
      reference: 'TEST_PROMO_REFERENCE_67890',
      uses: 5,
      email: 'seamuswconnolly@gmail.com'
    });
    
    console.log('✅ Promo code email test successful!');
    console.log('📧 Email sent to: seamuswconnolly@gmail.com');
    console.log('🎟️  Promo code generated:', response.data.promoCode);
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Promo code email test failed:');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testPromoCodeEmail();
