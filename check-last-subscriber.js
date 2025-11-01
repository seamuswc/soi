// Check last subscriber and email status
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'server', 'node_modules', '@prisma', 'client'));

// Initialize Prisma with the correct database path
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, 'server', 'prisma', 'database', 'database.sqlite')}`
    }
  }
});

async function checkLastSubscriber() {
  try {
    // Get the most recent subscriber
    const lastUser = await prisma.user.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!lastUser) {
      console.log('❌ No subscribers found in database');
      return;
    }

    console.log('\n📧 Last Subscriber Information:');
    console.log('============================');
    console.log(`Email: ${lastUser.email}`);
    console.log(`Created: ${lastUser.created_at}`);
    console.log(`Expires: ${lastUser.expires_at}`);
    console.log(`Payment Reference: ${lastUser.payment_reference}`);
    console.log(`Password: ${lastUser.password}`);
    console.log('============================\n');

    // Check server logs for email sending
    console.log('⚠️  To verify email was sent, check server logs for:');
    console.log(`   - "✅ Subscription email sent to ${lastUser.email}"`);
    console.log(`   - Or "❌ Error sending subscription email"`);
    console.log('\n💡 Email sending happens in server/src/index.ts line 574');
    console.log('   The email service uses Tencent SES with template ID 66908');
    console.log('   Check PM2 logs: pm2 logs proxy-server --lines 200\n');

  } catch (error) {
    console.error('❌ Error checking subscriber:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLastSubscriber();

