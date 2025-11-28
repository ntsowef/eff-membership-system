/**
 * Manual Check - Please verify credentials with JSON Applink Manual
 * Location: docs/JSON-Applink-Manual-2024.pdf
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.postgres') });

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     JSON Applink Credentials Verification                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 CURRENT CREDENTIALS IN .env.postgres:');
console.log('─'.repeat(60));
console.log('API URL:', process.env.JSON_APPLINK_API_URL);
console.log('Username:', process.env.JSON_APPLINK_USERNAME);
console.log('Password:', process.env.JSON_APPLINK_PASSWORD);
console.log('API Key:', process.env.JSON_APPLINK_API_KEY);
console.log('From Number:', process.env.JSON_APPLINK_FROM_NUMBER);
console.log('─'.repeat(60));

console.log('\n📖 PLEASE CHECK: docs/JSON-Applink-Manual-2024.pdf');
console.log('\n❓ QUESTIONS TO VERIFY:');
console.log('   1. Are these credentials correct?');
console.log('   2. What authentication method does the manual specify?');
console.log('   3. What field names are required in the request?');
console.log('   4. Is there a sample request in the manual?');

console.log('\n🔍 COMMON ISSUES:');
console.log('   ❌ Wrong username/password');
console.log('   ❌ Account not activated');
console.log('   ❌ IP not whitelisted');
console.log('   ❌ Incorrect API endpoint');
console.log('   ❌ Wrong field names in payload');

console.log('\n💡 NEXT STEPS:');
console.log('   1. Open: docs/JSON-Applink-Manual-2024.pdf');
console.log('   2. Find the "Authentication" or "API Request" section');
console.log('   3. Compare with credentials above');
console.log('   4. Check for sample code/curl command');
console.log('   5. Contact JSON Applink support if credentials are correct');

console.log('\n📞 JSON APPLINK SUPPORT:');
console.log('   - Verify account is active');
console.log('   - Request working code example');
console.log('   - Check IP whitelisting requirements');

console.log('\n' + '='.repeat(60));
console.log('⚠️  AUTHENTICATION IS FAILING WITH CURRENT CREDENTIALS');
console.log('='.repeat(60));

// Try one more simple test
async function finalTest() {
  console.log('\n🧪 FINAL SIMPLE TEST:');
  try {
    const payload = {
      username: process.env.JSON_APPLINK_USERNAME,
      password: process.env.JSON_APPLINK_PASSWORD,
      to: '27796222802',
      message: 'Test'
    };

    console.log('Sending minimal payload...');
    const response = await axios.post(
      process.env.JSON_APPLINK_API_URL,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    console.log('Response:', response.data);
    
    if (response.data.includes('resultCode>0<')) {
      console.log('\n✅ SUCCESS! Credentials are working!');
    } else if (response.data.includes('resultCode>1<')) {
      console.log('\n❌ AUTHENTICATION FAILED');
      console.log('   → Credentials are incorrect or account is not active');
      console.log('   → Please verify with JSON Applink support');
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

finalTest();

