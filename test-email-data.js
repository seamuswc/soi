#!/usr/bin/env node
// Test script for data subscription email
// Usage: node test-email-data.js

const axios = require('axios');

async function testDataSubscriptionEmail() {
  console.log('📧 Testing Data Subscription Email...');
  
  try {
    // Test data subscription email endpoint
    const response = await axios.post('https://soipattaya.com/api/auth/register', {
      email: 'seamuswconnolly@gmail.com',
      reference: 'TEST_REFERENCE_12345'
    });
    
    console.log('✅ Data subscription email test successful!');
    console.log('📧 Email sent to: seamuswconnolly@gmail.com');
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Data subscription email test failed:');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testDataSubscriptionEmail();
