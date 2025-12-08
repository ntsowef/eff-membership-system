const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Import the compiled service
const { WordDocumentService } = require('../backend/dist/services/wordDocumentService');

async function testWordServiceDirectly() {
  try {
    console.log('🧪 Testing Word Document Service Directly...\n');

    // Mock ward info
    const wardInfo = {
      ward_code: '79800001',
      ward_name: 'Ward 1',
      ward_number: '1',
      municipality_code: 'TST',
      municipality_name: 'Test Municipality',
      district_code: 'DC01',
      district_name: 'Test District',
      province_code: 'GP',
      province_name: 'Gauteng'
    };

    // Mock members data with different voting districts
    const members = [
      {
        full_name: 'John Doe',
        id_number: '8001015800080',
        cell_number: '0821234567',
        voting_district_name: 'ZENZELENI PRE-SCHOOL',
        voting_district_code: 'VD001'
      },
      {
        full_name: 'Jane Smith',
        id_number: '8502025900081',
        cell_number: '0831234567',
        voting_district_name: 'ZENZELENI PRE-SCHOOL',
        voting_district_code: 'VD001'
      },
      {
        full_name: 'Peter Jones',
        id_number: '9003036000082',
        cell_number: '0841234567',
        voting_district_name: 'RIVERDALE PRIMARY SCHOOL',
        voting_district_code: 'VD002'
      },
      {
        full_name: 'Mary Johnson',
        id_number: '8804047100083',
        cell_number: '0851234567',
        voting_district_name: 'RIVERDALE PRIMARY SCHOOL',
        voting_district_code: 'VD002'
      },
      {
        full_name: 'David Brown',
        id_number: '9205058200084',
        cell_number: '0861234567',
        voting_district_name: 'RIVERDALE PRIMARY SCHOOL',
        voting_district_code: 'VD002'
      }
    ];

    console.log(`📝 Generating Word document with ${members.length} members in ${wardInfo.ward_name}...`);
    
    // Generate the document
    const buffer = await WordDocumentService.generateWardAttendanceRegister(wardInfo, members);
    
    console.log(`✅ Generated ${buffer.length} bytes\n`);

    // Save the file
    const outputPath = path.join(__dirname, '..', 'reports', `TEST_DIRECT_Ward_${wardInfo.ward_code}_Attendance_Register.docx`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`💾 Saved to: ${outputPath}\n`);

    // Extract text to verify content
    console.log('📄 Extracting text content...\n');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Check for key elements
    console.log('=== VERIFICATION CHECKS ===\n');

    const checks = [
      { name: 'FORM A: ATTENDANCE REGISTER', pattern: /FORM A: ATTENDANCE REGISTER/, found: false },
      { name: 'PROVINCE header', pattern: /PROVINCE: Gauteng/, found: false },
      { name: 'Voting District grouping', pattern: /Voting District:/, found: false },
      { name: 'ZENZELENI PRE-SCHOOL', pattern: /ZENZELENI PRE-SCHOOL/, found: false },
      { name: 'RIVERDALE PRIMARY SCHOOL', pattern: /RIVERDALE PRIMARY SCHOOL/, found: false },
      { name: 'NUM column header', pattern: /NUM/, found: false },
      { name: 'WARD NUMBER column', pattern: /WARD NUMBER/, found: false },
      { name: 'REGISTERED VD column', pattern: /REGISTERED VD/, found: false },
      { name: 'NEW CELL NUM column', pattern: /NEW CELL NUM/, found: false },
      { name: 'District total', pattern: /Total Voters in/, found: false },
      { name: 'GRAND TOTAL', pattern: /GRAND TOTAL: 5 MEMBERS/, found: false },
      { name: 'Number of Voting Districts', pattern: /Number of Voting Districts: 2/, found: false }
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
      console.log('\n⚠️  SOME CHECKS FAILED. Showing first 1000 characters of document:\n');
      console.log(text.substring(0, 1000));
      console.log('\n...\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testWordServiceDirectly();

