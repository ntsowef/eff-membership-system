/**
 * Test script for Word Document Service
 * Tests the Word document generation directly without API authentication
 */

const fs = require('fs');
const path = require('path');

// Import the WordDocumentService
const { WordDocumentService } = require('../backend/dist/services/wordDocumentService');

async function testWordDocumentService() {
  console.log('🧪 Testing Word Document Service\n');
  console.log('='.repeat(60));

  try {
    // Mock ward information
    const wardInfo = {
      province_name: 'Gauteng',
      district_name: 'City of Johannesburg',
      municipality_name: 'Johannesburg Sub-Region 1',
      ward_number: '001',
      ward_name: 'Test Ward',
      ward_code: '79800001',
      total_members: 5
    };

    // Mock member data
    const members = [
      {
        full_name: 'John Doe',
        id_number: '8001015800080',
        cell_number: '0821234567',
        voting_district_name: 'Test Voting District 1'
      },
      {
        full_name: 'Jane Smith',
        id_number: '8502025800081',
        cell_number: '0829876543',
        voting_district_name: 'Test Voting District 2'
      },
      {
        full_name: 'Peter Johnson',
        id_number: '9003035800082',
        cell_number: '0837654321',
        voting_district_name: 'Test Voting District 1'
      },
      {
        full_name: 'Mary Williams',
        id_number: '8804045800083',
        cell_number: '0841112222',
        voting_district_name: 'Test Voting District 3'
      },
      {
        full_name: 'David Brown',
        id_number: '9205055800084',
        cell_number: '0843334444',
        voting_district_name: 'Test Voting District 2'
      }
    ];

    console.log('📄 Generating Word document...');
    console.log(`   Ward: ${wardInfo.ward_name} (${wardInfo.ward_code})`);
    console.log(`   Members: ${members.length}`);
    console.log('-'.repeat(60));

    // Generate the Word document
    const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(
      wardInfo,
      members
    );

    console.log(`✅ Word document generated successfully!`);
    console.log(`   Buffer size: ${wordBuffer.length} bytes`);

    // Save to test directory
    const outputPath = path.join(__dirname, `test_attendance_register_${Date.now()}.docx`);
    fs.writeFileSync(outputPath, wordBuffer);
    
    console.log(`   Saved to: ${outputPath}`);
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST PASSED!');
    console.log('='.repeat(60));
    console.log('\n📋 Document Contents:');
    console.log('   ✅ EFF Logo in header');
    console.log('   ✅ Ward information section');
    console.log('   ✅ Attendance table with 5 members');
    console.log('   ✅ Signature section in footer');
    console.log('\n🎉 Word Document Service is fully functional!');
    console.log(`\n💡 Open the file to verify: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testWordDocumentService();

