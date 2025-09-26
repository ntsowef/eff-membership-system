const axios = require('axios');

async function testTransactionAPI() {
  try {
    console.log('🔍 Testing financial transaction API endpoint...');

    // First, let's test without authentication to see the error
    console.log('\n📋 **Step 1: Testing without authentication (should get 401)...**');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-transactions/query');
      console.log('❌ Unexpected success:', response.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly returns 401 Unauthorized without token');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test with authentication
    console.log('\n📋 **Step 2: Testing with authentication...**');
    
    // First login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token');

    // Test the query endpoint with correct parameters
    console.log('\n📋 **Step 3: Testing query endpoint with correct parameters...**');
    
    const queryParams = {
      offset: 0,
      limit: 25,
      sort_by: 'created_at',
      sort_order: 'DESC'
    };

    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-transactions/query', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: queryParams
      });

      if (response.data.success) {
        console.log('✅ Query endpoint working correctly');
        const result = response.data.data;
        console.log(`   • Total transactions: ${result.total_count}`);
        console.log(`   • Filtered count: ${result.filtered_count}`);
        console.log(`   • Returned transactions: ${result.transactions.length}`);
        console.log(`   • Total amount: R${result.summary.total_amount}`);
        console.log(`   • Current page: ${result.pagination.current_page}`);
        console.log(`   • Has more: ${result.pagination.has_more}`);
        
        if (result.transactions.length > 0) {
          const firstTransaction = result.transactions[0];
          console.log(`   • First transaction: ${firstTransaction.transaction_id} - R${firstTransaction.amount}`);
        }
      } else {
        console.log('❌ Query failed:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Query error:', error.response?.status, error.response?.data);
      if (error.response?.data?.message) {
        console.log('   Error message:', error.response.data.message);
      }
    }

    // Test with different parameters
    console.log('\n📋 **Step 4: Testing with entity type filter...**');
    
    const filteredParams = {
      offset: 0,
      limit: 10,
      sort_by: 'created_at',
      sort_order: 'DESC',
      entity_type: 'application'
    };

    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-transactions/query', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: filteredParams
      });

      if (response.data.success) {
        console.log('✅ Filtered query working correctly');
        const result = response.data.data;
        console.log(`   • Application transactions: ${result.transactions.length}`);
        console.log(`   • Filters applied: ${result.query_info?.filters_applied?.join(', ') || 'none'}`);
      } else {
        console.log('❌ Filtered query failed:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Filtered query error:', error.response?.status, error.response?.data);
    }

    // Test quick stats endpoint
    console.log('\n📋 **Step 5: Testing quick stats endpoint...**');
    
    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-transactions/quick-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        console.log('✅ Quick stats endpoint working correctly');
        const stats = response.data.data.quick_stats;
        console.log(`   • Total transactions: ${stats.total_transactions}`);
        console.log(`   • Total amount: R${stats.total_amount}`);
        console.log(`   • Completion rate: ${stats.completion_rate}%`);
      } else {
        console.log('❌ Quick stats failed:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Quick stats error:', error.response?.status, error.response?.data);
    }

    console.log('\n✅ API testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testTransactionAPI();
