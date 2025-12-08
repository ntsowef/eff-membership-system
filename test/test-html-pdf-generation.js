/**
 * Test script for HTML-based PDF Ward Attendance Register Generation
 * Tests the new html-pdf-node implementation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test credentials - Super Admin
const TEST_EMAIL = 'superadmin@eff.org.za';
const TEST_PASSWORD = 'SuperAdmin@123';

// Test ward code (using a ward with members)
const TEST_WARD_CODE = '79800001'; // Example ward code - adjust based on your data

let authToken = null;

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPdfGeneration() {
  console.log('\n🧪 Testing HTML-based PDF Ward Attendance Register Generation\n');
  console.log('='.repeat(60));

  try {
    // Login first
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('❌ Cannot proceed without authentication');
      return;
    }

    // Test: Export PDF format
    console.log('\n📄 Test: Export PDF Format (HTML-based)');
    console.log('-'.repeat(60));
    
    const pdfResponse = await axios.get(
      `${BASE_URL}/members/ward/${TEST_WARD_CODE}/audit-export`,
      {
        params: { format: 'pdf' },
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout for PDF generation
      }
    );

    console.log('✅ PDF Response received');
    console.log(`📊 Status: ${pdfResponse.status}`);
    console.log(`📦 Content-Type: ${pdfResponse.headers['content-type']}`);
    console.log(`📏 Size: ${pdfResponse.data.length} bytes`);
    
    // Check email headers
    const emailStatus = pdfResponse.headers['x-email-status'];
    const emailSentTo = pdfResponse.headers['x-email-sent-to'];
    const emailError = pdfResponse.headers['x-email-error'];
    
    console.log(`📧 Email Status: ${emailStatus || 'not set'}`);
    if (emailSentTo) {
      console.log(`📧 Email Sent To: ${emailSentTo}`);
    }
    if (emailError) {
      console.log(`⚠️ Email Error: ${emailError}`);
    }

    // Save PDF to file
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfFilename = `Ward_${TEST_WARD_CODE}_Attendance_Register_${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfResponse.data);
    
    console.log(`✅ PDF saved to: ${pdfPath}`);
    console.log(`📂 Open the file to verify the PDF content`);

    // Verify PDF header
    const pdfHeader = pdfResponse.data.slice(0, 4).toString();
    if (pdfHeader === '%PDF') {
      console.log('✅ Valid PDF file (header check passed)');
    } else {
      console.warn('⚠️ PDF header not found - file may be corrupted');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   - PDF generated: ${pdfResponse.data.length} bytes`);
    console.log(`   - Email status: ${emailStatus || 'not set'}`);
    console.log(`   - File saved: ${pdfFilename}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Open the generated PDF file to verify content');
    console.log('   2. Check your email inbox for the PDF attachment');
    console.log('   3. Verify the PDF contains ward member data with voting districts');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('='.repeat(60));
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
      console.error(`Headers:`, error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testPdfGeneration().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});

