const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./server/database/database.sqlite"
    }
  }
});

async function createTestListing() {
  try {
    const listing = await prisma.listing.create({
      data: {
        building_name: "Test Building",
        coordinates: "13.7563,100.5018",
        floor: "1",
        sqm: "50",
        cost: "1000",
        description: "Test listing for delete testing",
        rental_type: "living",
        business_photo: "test.jpg",
        youtube_link: "https://youtube.com",
        reference: "test123",
        payment_network: "solana",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });
    
    console.log('✅ Test listing created with ID:', listing.id);
    return listing.id;
  } catch (error) {
    console.error('❌ Error creating test listing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestListing();
