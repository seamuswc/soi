#!/usr/bin/env node
// Direct email test script - bypasses payment verification
// Usage: node test-email-direct.js

const { sendSubscriptionEmail, sendPromoCodeEmail } = require('./server/src/emailService');

async function testEmails() {
  console.log('📧 Testing Direct Email Functions...');
  
  try {
    // Test subscription email
    console.log('📧 Testing subscription email...');
    const subscriptionResult = await sendSubscriptionEmail({
      email: 'seamuswconnolly@gmail.com',
      password: 'TEST123456',
      subscriptionDate: new Date().toLocaleDateString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      paymentReference: 'TEST_REF_12345'
    });
    
    console.log('✅ Subscription email result:', subscriptionResult);
    
    // Test promo code email
    console.log('📧 Testing promo code email...');
    const promoResult = await sendPromoCodeEmail({
      email: 'seamuswconnolly@gmail.com',
      promoCode: 'TEST12345',
      uses: 5,
      reference: 'TEST_PROMO_REF_67890'
    });
    
    console.log('✅ Promo code email result:', promoResult);
    
    console.log('🎉 All email tests completed!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Run the test
testEmails();
