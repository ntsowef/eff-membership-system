const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const jwt = require('jsonwebtoken');

async function testWordDocumentDownload() {
  try {
    console.log('🧪 Testing Word Document Download...\n');

    // Generate a test JWT token
    const token = jwt.sign(
      {
        userId: 12585,
        email: 'testadmin@eff.org.za',
        adminLevel: 'national'
      },
      'be6bf07fbef553bf6e00bdcf4d3e113b6b4a99157e1aadc7c51d401f4575bf52',
      { expiresIn: '1h' }
    );

    // Test ward code - using a ward that should have members
    const wardCode = '79800001'; // Adjust this to a ward with members in your database

    console.log(`📥 Downloading Word document for ward: ${wardCode}`);

    // Download the Word document
    const response = await axios.get(
      `http://localhost:5000/api/v1/members/ward/${wardCode}/audit-export?format=word`,
      {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log(`✅ Downloaded ${response.data.length} bytes`);

    // Save the file
    const outputPath = path.join(__dirname, '..', 'reports', `TEST_WARD_${wardCode}_Attendance_Register.docx`);
    fs.writeFileSync(outputPath, response.data);
    console.log(`💾 Saved to: ${outputPath}\n`);

    // Extract text to verify content
    console.log('📄 Extracting text content...\n');
    const result = await mammoth.extractRawText({ buffer: response.data });
    const text = result.value;

    // Check for key elements
    console.log('=== VERIFICATION CHECKS ===\n');

    const checks = [
      { name: 'FORM A: ATTENDANCE REGISTER', pattern: /FORM A: ATTENDANCE REGISTER/, found: false },
      { name: 'PROVINCE header', pattern: /PROVINCE:/, found: false },
      { name: 'Voting District grouping', pattern: /Voting District:/, found: false },
      { name: 'NUM column header', pattern: /NUM/, found: false },
      { name: 'WARD NUMBER column', pattern: /WARD NUMBER/, found: false },
      { name: 'REGISTERED VD column', pattern: /REGISTERED VD/, found: false },
      { name: 'NEW CELL NUM column', pattern: /NEW CELL NUM/, found: false },
      { name: 'District total', pattern: /Total Voters in/, found: false },
      { name: 'GRAND TOTAL', pattern: /GRAND TOTAL:/, found: false },
      { name: 'Page numbers', pattern: /Page.*of/, found: false }
    ];

    checks.forEach(check => {
      check.found = check.pattern.test(text);
      const status = check.found ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.found ? 'FOUND' : 'NOT FOUND'}`);
    });

    const allPassed = checks.every(check => check.found);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total checks: ${checks.length}`);
    console.log(`Passed: ${checks.filter(c => c.found).length}`);
    console.log(`Failed: ${checks.filter(c => !c.found).length}`);
    
    if (allPassed) {
      console.log('\n🎉 ALL CHECKS PASSED! The Word document has the new format.');
    } else {
      console.log('\n⚠️  SOME CHECKS FAILED. The document may not have all the new features.');
      console.log('\n📝 First 500 characters of document:');
      console.log(text.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.toString().substring(0, 200));
    }
  }
}

testWordDocumentDownload();

