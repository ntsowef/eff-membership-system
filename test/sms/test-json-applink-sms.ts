/**
 * JSON Applink SMS Test Script
 * 
 * This script tests the JSON Applink SMS API integration
 * by sending a test SMS to a specified phone number.
 * 
 * Usage:
 *   ts-node test/sms/test-json-applink-sms.ts
 * 
 * Or with npm:
 *   npm run test:sms
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.postgres') });

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  response?: any;
}

class JSONApplinkSMSTester {
  private apiUrl: string;
  private apiKey: string;
  private username: string;
  private password: string;
  private fromNumber: string;

  constructor() {
    this.apiUrl = process.env.JSON_APPLINK_API_URL || '';
    this.apiKey = process.env.JSON_APPLINK_API_KEY || '';
    this.username = process.env.JSON_APPLINK_USERNAME || '';
    this.password = process.env.JSON_APPLINK_PASSWORD || '';
    this.fromNumber = process.env.JSON_APPLINK_FROM_NUMBER || 'EFF';

    this.validateConfig();
  }

  private validateConfig(): void {
    const missing: string[] = [];

    if (!this.apiUrl) missing.push('JSON_APPLINK_API_URL');
    if (!this.apiKey) missing.push('JSON_APPLINK_API_KEY');
    if (!this.username) missing.push('JSON_APPLINK_USERNAME');
    if (!this.password) missing.push('JSON_APPLINK_PASSWORD');

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ Configuration loaded successfully');
    console.log(`📡 API URL: ${this.apiUrl}`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 4)}***`);
    console.log(`👤 Username: ${this.username}`);
    console.log(`📱 From Number: ${this.fromNumber}`);
  }

  async sendTestSMS(to: string, message: string): Promise<SMSResponse> {
    try {
      console.log('\n📤 Sending SMS...');
      console.log(`   To: ${to}`);
      console.log(`   Message: ${message}`);
      console.log(`   From: ${this.fromNumber}`);

      // Prepare the request payload
      // Note: Adjust this based on your actual JSON Applink API specification
      const payload = {
        username: this.username,
        password: this.password,
        api_key: this.apiKey,
        to: to,
        from: this.fromNumber,
        message: message,
        // Add any other required fields based on your API documentation
      };

      console.log('\n🔄 Request Payload:');
      console.log(JSON.stringify({
        ...payload,
        password: '***',
        api_key: this.apiKey.substring(0, 4) + '***'
      }, null, 2));

      const startTime = Date.now();

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any additional headers required by your API
        },
        timeout: 30000, // 30 second timeout
      });

      const duration = Date.now() - startTime;

      console.log(`\n✅ SMS sent successfully! (${duration}ms)`);
      console.log('📥 Response:');
      console.log(JSON.stringify(response.data, null, 2));

      return {
        success: true,
        messageId: response.data.message_id || response.data.id || response.data.reference,
        response: response.data
      };

    } catch (error: any) {
      console.error('\n❌ SMS sending failed!');
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('📥 Error Response:');
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
        
        return {
          success: false,
          error: error.response.data.message || error.response.data.error || 'API Error',
          response: error.response.data
        };
      } else if (error.request) {
        // The request was made but no response was received
        console.error('📡 No response received from server');
        console.error('   Request:', error.request);
        
        return {
          success: false,
          error: 'No response from server - check API URL and network connection'
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('⚠️ Error:', error.message);
        
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('\n🔍 Testing API connection...');
      
      // Try to make a simple request to check if the API is reachable
      const response = await axios.get(this.apiUrl.replace('/send/sms/', ''), {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });

      console.log(`✅ API is reachable (Status: ${response.status})`);
      return true;
    } catch (error: any) {
      console.error('❌ API connection test failed:', error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         JSON Applink SMS API Test Script                  ║');
  console.log('║         EFF Membership Management System                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize the tester
    const tester = new JSONApplinkSMSTester();

    // Test API connection first
    await tester.testConnection();

    // Test phone number
    const testPhoneNumber = '27796222802';
    
    // Test message
    const testMessage = `Hello from EFF Membership System! This is a test SMS sent at ${new Date().toLocaleString()}. If you receive this, the SMS integration is working correctly.`;

    console.log('\n' + '='.repeat(60));
    console.log('SENDING TEST SMS');
    console.log('='.repeat(60));

    // Send the test SMS
    const result = await tester.sendTestSMS(testPhoneNumber, testMessage);

    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULT');
    console.log('='.repeat(60));

    if (result.success) {
      console.log('✅ TEST PASSED');
      console.log(`📨 Message ID: ${result.messageId || 'N/A'}`);
      console.log('📱 Please check your phone for the test SMS');
    } else {
      console.log('❌ TEST FAILED');
      console.log(`⚠️ Error: ${result.error}`);
      console.log('\n💡 Troubleshooting Tips:');
      console.log('   1. Verify your API credentials in .env.postgres');
      console.log('   2. Check if the API URL is correct');
      console.log('   3. Ensure your account has sufficient credits');
      console.log('   4. Verify the phone number format (should include country code)');
      console.log('   5. Check your network connection');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Test script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script error:', error);
      process.exit(1);
    });
}

export { JSONApplinkSMSTester };

