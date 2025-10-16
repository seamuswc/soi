const axios = require('axios');

async function testDeleteFunctionality() {
  try {
    console.log('🧪 Testing Delete Listing Functionality');
    console.log('=====================================');
    
    // Test 1: Try to delete a non-existent listing
    console.log('\n1️⃣ Testing delete of non-existent listing (ID: 999)');
    try {
      const response = await axios.delete('http://localhost:3000/api/listings/999', {
        headers: { Authorization: 'Bearer admin-token-123' }
      });
      console.log('❌ Unexpected success:', response.data);
    } catch (error) {
      if (error.response?.data?.error === 'Failed to delete listing') {
        console.log('✅ Correctly returned error for non-existent listing');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Test 2: Check dashboard (should be empty)
    console.log('\n2️⃣ Checking dashboard (should be empty)');
    try {
      const response = await axios.get('http://localhost:3000/api/listings/dashboard', {
        headers: { Authorization: 'Bearer admin-token-123' }
      });
      console.log('✅ Dashboard response:', response.data);
      
      if (response.data.listings.length === 0) {
        console.log('✅ Dashboard is empty as expected');
      } else {
        console.log('📋 Found listings:', response.data.listings.length);
        // Test delete on first listing
        const firstListing = response.data.listings[0];
        console.log(`\n3️⃣ Testing delete of existing listing (ID: ${firstListing.id})`);
        try {
          const deleteResponse = await axios.delete(`http://localhost:3000/api/listings/${firstListing.id}`, {
            headers: { Authorization: 'Bearer admin-token-123' }
          });
          console.log('✅ Delete successful:', deleteResponse.data);
          
          // Verify it was deleted
          const verifyResponse = await axios.get('http://localhost:3000/api/listings/dashboard', {
            headers: { Authorization: 'Bearer admin-token-123' }
          });
          console.log('✅ Verification - Dashboard after delete:', verifyResponse.data);
          
        } catch (error) {
          console.log('❌ Delete failed:', error.response?.data || error.message);
        }
      }
    } catch (error) {
      console.log('❌ Dashboard error:', error.response?.data || error.message);
    }
    
    console.log('\n🎯 Delete functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeleteFunctionality();
