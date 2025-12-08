const axios = require('axios');

async function testRenewalProcess() {
  try {
    console.log('🧪 Testing Renewal Process Endpoint...\n');

    const renewalData = {
      id_number: '7501165402082',
      payment_method: 'Cash',
      payment_reference: 'TEST-RENEWAL-001',
      amount_paid: 150.00,
      updated_member_data: {
        email: 'frans.updated@example.com',
        cell_number: '0796222802'
      }
    };

    console.log('📤 Sending renewal request:');
    console.log(JSON.stringify(renewalData, null, 2));
    console.log('');

    const response = await axios.post(
      'http://localhost:5000/api/v1/renewals/process',
      renewalData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Renewal processed successfully!');
    console.log('');
    console.log('📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error processing renewal:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testRenewalProcess();

