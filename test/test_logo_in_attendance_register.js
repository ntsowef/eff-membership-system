const path = require('path');
const fs = require('fs');

async function testLogoInAttendanceRegister() {
  try {
    console.log('Testing EFF Logo in Attendance Register...\n');
    
    // Import the service
    const { WordDocumentService } = require('../backend/dist/services/wordDocumentService');
    
    // Test data
    const testWardInfo = {
      ward_code: 'TEST001',
      ward_name: 'Test Ward',
      ward_number: '1',
      municipality_name: 'Test Municipality',
      province_name: 'Gauteng'
    };
    
    const testMembers = [
      {
        membership_number: 'MEM001',
        firstname: 'John',
        surname: 'Doe',
        id_number: '8001015800080',
        cell_number: '0821234567',
        voting_district_name: 'VD001'
      },
      {
        membership_number: 'MEM002',
        firstname: 'Jane',
        surname: 'Smith',
        id_number: '9002025900090',
        cell_number: '0829876543',
        voting_district_name: 'VD001'
      },
      {
        membership_number: 'MEM003',
        firstname: 'Bob',
        surname: 'Johnson',
        id_number: '7503035700070',
        cell_number: '0837654321',
        voting_district_name: 'VD002'
      }
    ];
    
    console.log('📝 Generating Ward Attendance Register with logo...');
    const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(
      testWardInfo,
      testMembers
    );
    
    console.log(`✅ Document generated: ${wordBuffer.length} bytes\n`);
    
    // Save the document
    const outputPath = path.join(__dirname, 'test_attendance_with_logo.docx');
    fs.writeFileSync(outputPath, wordBuffer);
    console.log(`💾 Document saved to: ${outputPath}\n`);
    
    // Check if logo file exists in dist
    const logoPathDist = path.join(__dirname, '..', 'backend', 'dist', 'assets', 'images', 'EFF_Reglogo.png');
    const logoPathSrc = path.join(__dirname, '..', 'backend', 'src', 'assets', 'images', 'EFF_Reglogo.png');
    
    console.log('📂 Logo file locations:');
    console.log(`   Source: ${logoPathSrc}`);
    console.log(`   Exists: ${fs.existsSync(logoPathSrc) ? '✅ YES' : '❌ NO'}`);
    console.log(`   Dist: ${logoPathDist}`);
    console.log(`   Exists: ${fs.existsSync(logoPathDist) ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('🎉 Test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open the generated document: test/test_attendance_with_logo.docx');
    console.log('   2. Verify that the EFF logo appears at the top of the document');
    console.log('   3. If logo is missing, check the console output above for file paths');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testLogoInAttendanceRegister();

