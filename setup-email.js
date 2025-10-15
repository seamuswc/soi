#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📧 Setting up Email Configuration for soiPattaya');
console.log('================================================');

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.log('❌ .env file not found. Please run setup-env.js first.');
  process.exit(1);
}

// Check if email config already exists
if (envContent.includes('EMAIL_HOST')) {
  console.log('✅ Email configuration already exists in .env file');
  console.log('Current email settings:');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('EMAIL_')) {
      console.log(`   ${line}`);
    }
  });
  process.exit(0);
}

// Add email configuration
const emailConfig = `

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"`;

const updatedEnvContent = envContent + emailConfig;

// Write updated .env file
fs.writeFileSync(envPath, updatedEnvContent);

console.log('✅ Email configuration added to .env file');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Update EMAIL_USER with your Gmail address');
console.log('2. Update EMAIL_PASS with your Gmail App Password');
console.log('3. For Gmail, enable 2-factor authentication and create an App Password');
console.log('4. Alternative: Use other SMTP providers (SendGrid, Mailgun, etc.)');
console.log('');
console.log('📧 Gmail Setup Instructions:');
console.log('1. Go to Google Account settings');
console.log('2. Enable 2-Factor Authentication');
console.log('3. Go to Security > App passwords');
console.log('4. Generate a new app password for "Mail"');
console.log('5. Use that password as EMAIL_PASS');
console.log('');
console.log('🔧 Alternative SMTP Providers:');
console.log('- SendGrid: smtp.sendgrid.net:587');
console.log('- Mailgun: smtp.mailgun.org:587');
console.log('- AWS SES: email-smtp.us-east-1.amazonaws.com:587');
console.log('');
console.log('✅ Email configuration setup complete!');
