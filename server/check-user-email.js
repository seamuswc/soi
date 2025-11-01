const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const email = 'jamesthaiphone@gmail.com';
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('\n📧 User Information:');
    console.log('====================');
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Created: ${user.created_at}`);
    console.log(`Expires: ${user.expires_at}`);
    console.log(`Payment Reference: ${user.payment_reference}`);
    console.log('\n💡 Check server logs for email sending status:');
    console.log(`   grep -i "${email}" in PM2 logs`);
    console.log('   Look for: "✅ Subscription email sent to ..."');
    console.log('   Or: "❌ Error sending subscription email"\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();

