const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Test bulk upload endpoint
async function testBulkUpload() {
  console.log('🧪 Testing Bulk Upload Endpoint');
  console.log('=' .repeat(80));

  // First, login to get a valid token
  console.log('\n1. Logging in to get authentication token...');
  
  const loginData = JSON.stringify({
    email: 'national.admin@eff.org.za',
    password: 'Admin@2024'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const token = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data && response.data.token) {
            console.log('✅ Login successful');
            resolve(response.data.token);
          } else {
            console.error('❌ Login failed:', response);
            reject(new Error('Login failed'));
          }
        } catch (error) {
          console.error('❌ Failed to parse login response:', error);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log(`Token: ${token.substring(0, 50)}...`);

  // Create a test Excel file
  console.log('\n2. Creating test Excel file...');
  const testFilePath = path.join(__dirname, 'test-upload.xlsx');
  
  // Check if test file exists, if not create a simple one
  if (!fs.existsSync(testFilePath)) {
    console.log('⚠️  Test file not found. Please create a test Excel file at:', testFilePath);
    console.log('For now, we will test with any existing file...');
    
    // Try to find any xlsx file in the repository
    const uploadsDir = path.join(__dirname, '..', '_upload_file_directory');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.xlsx'));
      if (files.length > 0) {
        const existingFile = path.join(uploadsDir, files[0]);
        console.log(`Using existing file: ${existingFile}`);
        fs.copyFileSync(existingFile, testFilePath);
      }
    }
  }

  if (!fs.existsSync(testFilePath)) {
    console.error('❌ No test file available. Please create test-upload.xlsx');
    return;
  }

  // Upload the file
  console.log('\n3. Uploading file...');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath));

  const uploadOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/self-data-management/bulk-upload',
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${token}`,
      'X-No-Retry': 'true'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(uploadOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\nResponse Status: ${res.statusCode}`);
        console.log('Response Headers:', res.headers);
        console.log('\nResponse Body:');
        try {
          const response = JSON.parse(data);
          console.log(JSON.stringify(response, null, 2));
          
          if (response.success) {
            console.log('\n✅ Upload successful!');
            console.log(`File ID: ${response.data.file_id}`);
          } else {
            console.log('\n❌ Upload failed!');
            console.log('Error:', response.error || response.message);
          }
        } catch (error) {
          console.log(data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    form.pipe(req);
  });
}

// Run the test
testBulkUpload().catch(console.error);

