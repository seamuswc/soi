#!/usr/bin/env node
// Simple email test - calls server endpoints directly
// Usage: node test-email-simple.js

const axios = require('axios');

async function testEmails() {
  console.log('📧 Testing Email Functions via Server...');
  
  try {
    // Test 1: Create a test promo code with email
    console.log('📧 Test 1: Creating promo code with email...');
    const promoResponse = await axios.post('https://soipattaya.com/api/promo/generate-after-payment', {
      reference: 'TEST_PROMO_EMAIL_12345',
      uses: 3,
      email: 'seamuswconnolly@gmail.com'
    });
    
    console.log('✅ Promo code created:', promoResponse.data.promoCode);
    console.log('📧 Email should be sent to: seamuswconnolly@gmail.com');
    
    // Test 2: Try to register (this will fail payment but might send email)
    console.log('📧 Test 2: Testing registration email...');
    try {
      const registerResponse = await axios.post('https://soipattaya.com/api/auth/register', {
        email: 'seamuswconnolly@gmail.com',
        reference: 'TEST_REGISTER_EMAIL_67890'
      });
      console.log('✅ Registration successful:', registerResponse.data);
    } catch (error) {
      console.log('⚠️  Registration failed (expected):', error.response?.data?.error || error.message);
      console.log('📧 Check if any email was sent despite payment failure');
    }
    
    console.log('🎉 Email tests completed!');
    console.log('📧 Check seamuswconnolly@gmail.com for emails');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmails();
