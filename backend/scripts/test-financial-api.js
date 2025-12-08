/**
 * Test script to verify the financial transactions API endpoint
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testFinancialTransactionsAPI() {
  try {
    console.log('🧪 Testing Financial Transactions API...\n');
    
    // Test 1: Query financial transactions
    console.log('Test 1: Querying financial transactions...');
    const response = await axios.get(`${API_BASE_URL}/financial-transactions/query`, {
      params: {
        offset: 0,
        limit: 25,
        sort_by: 'created_at',
        sort_order: 'DESC'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Response Data:');
    console.log('   - Total Count:', response.data.pagination?.total || 0);
    console.log('   - Current Page:', response.data.pagination?.page || 1);
    console.log('   - Transactions:', response.data.transactions?.length || 0);
    console.log('');
    
    if (response.data.transactions && response.data.transactions.length > 0) {
      console.log('Sample transaction:');
      console.log(JSON.stringify(response.data.transactions[0], null, 2));
    } else {
      console.log('ℹ️  No transactions found (database is empty)');
    }
    
    console.log('\n🎉 Financial Transactions API is working correctly!');
    
  } catch (error) {
    console.error('❌ API Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testFinancialTransactionsAPI();

