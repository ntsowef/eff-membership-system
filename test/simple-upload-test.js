const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000';

async function testUpload() {
  try {
    console.log('🔐 Authenticating...');
    
    // Authenticate
    const authResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });
    
    const token = authResponse.data.data.token;
    const user = authResponse.data.data.user;
    
    console.log('✅ Authenticated as:', user.name);
    console.log('   User ID:', user.id);
    console.log('   Role:', user.role);
    console.log('   Token:', token.substring(0, 30) + '...');
    
    // Upload file
    console.log('\n📤 Uploading file...');
    
    const filePath = path.join(__dirname, 'sample-data', 'output', 'member-applications-100.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return;
    }
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const uploadResponse = await axios.post(
      `${API_URL}/api/v1/member-application-bulk-upload/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('✅ Upload successful!');
    console.log('   Upload UUID:', uploadResponse.data.data.upload_uuid);
    console.log('   Status:', uploadResponse.data.data.status);
    console.log('   Message:', uploadResponse.data.message);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Details:', error);
    }
  }
}

testUpload();

