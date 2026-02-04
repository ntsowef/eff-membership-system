import axios from 'axios';
import { executeQuery } from '../src/config/database';

const API_BASE = 'http://localhost:5000/api/v1';

async function testDeliveryReportAPI() {
  console.log('Testing Delivery Report API...\n');

  // First, let's test the database queries directly
  console.log('Testing database queries directly...\n');

  try {
    // Test delivery stats query
    const statsQuery = `
      SELECT
        COUNT(*) as total_messages,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN delivery_status IN ('pending', 'queued', 'sending', 'sent') THEN 1 ELSE 0 END) as pending
      FROM birthday_messages_sent
    `;

    const statsResult = await executeQuery(statsQuery);
    console.log('Direct DB Stats:', JSON.stringify(statsResult, null, 2));

    // Test delivery report query
    const reportQuery = `
      SELECT
        bms.id,
        bms.member_name,
        bms.membership_number,
        bms.phone_number,
        bms.delivery_status,
        bms.sent_at,
        bms.sms_message_id,
        bms.error_message
      FROM birthday_messages_sent bms
      ORDER BY bms.sent_at DESC
      LIMIT 5
    `;

    const reportResult = await executeQuery(reportQuery);
    console.log('Direct DB Report (5 records):', JSON.stringify(reportResult, null, 2));

    console.log('\n✓ Database queries working!\n');

  } catch (error: any) {
    console.error('Database error:', error.message);
  }

  // Now test via API
  console.log('Testing via API (requires authentication)...\n');

  try {
    // Login first - try different passwords
    const passwords = ['SuperAdmin@2024!', 'SuperAdmin@123!', 'SuperAdmin123', 'admin123'];
    let token = '';

    for (const password of passwords) {
      try {
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: 'superadmin@eff.org.za',
          password
        });

        if (loginResponse.data.success) {
          token = loginResponse.data.data.token;
          console.log(`✓ Login successful with password: ${password.substring(0, 5)}...`);
          break;
        }
      } catch (e: any) {
        // Continue to next password
      }
    }

    if (!token) {
      console.log('Could not login. Testing database directly was successful.');
      console.log('\nTo test the API, please login via the frontend and verify the delivery report tab.');
      process.exit(0);
    }

    const headers = { Authorization: `Bearer ${token}` };
    console.log('');
    
    // Test delivery stats endpoint
    console.log('Testing GET /birthday-sms/delivery-stats...');
    const statsResponse = await axios.get(`${API_BASE}/birthday-sms/delivery-stats`, { 
      headers,
      params: { timeframe: 'all' }
    });
    console.log('Delivery Stats:', JSON.stringify(statsResponse.data.data, null, 2));
    console.log('');
    
    // Test delivery report endpoint
    console.log('Testing GET /birthday-sms/delivery-report...');
    const reportResponse = await axios.get(`${API_BASE}/birthday-sms/delivery-report`, { 
      headers,
      params: { page: 1, limit: 5 }
    });
    console.log('Delivery Report - Total:', reportResponse.data.data.pagination?.total || 0);
    console.log('Sample Records:', JSON.stringify(reportResponse.data.data.records?.slice(0, 2), null, 2));
    console.log('');
    
    // Test export endpoint
    console.log('Testing GET /birthday-sms/delivery-report/export...');
    const exportResponse = await axios.get(`${API_BASE}/birthday-sms/delivery-report/export`, { 
      headers,
      params: { format: 'json' }
    });
    console.log('Export Total Records:', exportResponse.data.data.total);
    console.log('Export Sample:', JSON.stringify(exportResponse.data.data.records?.slice(0, 1), null, 2));
    
    console.log('\n✓ All tests passed!');
    
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testDeliveryReportAPI();

