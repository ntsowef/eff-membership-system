const path = require('path');
const fs = require('fs');

async function testWordToPdf() {
  try {
    console.log('Testing Word to PDF conversion...\n');
    
    // Check if docx-pdf is installed
    try {
      const docxPdf = require('docx-pdf');
      console.log('✅ docx-pdf library is installed');
    } catch (error) {
      console.error('❌ docx-pdf library is NOT installed');
      console.error('   Run: npm install docx-pdf');
      return;
    }
    
    // Try to import the service
    const { WordToPdfService } = require('../backend/dist/services/wordToPdfService');
    console.log('✅ WordToPdfService imported successfully\n');
    
    // Create a test Word document first
    const { WordDocumentService } = require('../backend/dist/services/wordDocumentService');
    
    const testWardInfo = {
      ward_code: 'TEST001',
      ward_name: 'Test Ward',
      ward_number: '1',
      municipality_name: 'Test Municipality',
      province_name: 'Test Province'
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
      }
    ];
    
    console.log('📝 Generating test Word document...');
    const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(
      testWardInfo,
      testMembers
    );
    console.log(`✅ Word document generated: ${wordBuffer.length} bytes\n`);
    
    // Save Word document for inspection
    const wordPath = path.join(__dirname, 'test_attendance.docx');
    fs.writeFileSync(wordPath, wordBuffer);
    console.log(`💾 Word document saved to: ${wordPath}\n`);
    
    // Try to convert to PDF
    console.log('🔄 Attempting Word to PDF conversion...');
    try {
      const pdfBuffer = await WordToPdfService.convertWordBufferToPdf(wordBuffer, __dirname);
      console.log(`✅ PDF conversion successful: ${pdfBuffer.length} bytes\n`);
      
      // Save PDF for inspection
      const pdfPath = path.join(__dirname, 'test_attendance.pdf');
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`💾 PDF saved to: ${pdfPath}\n`);
      
      console.log('🎉 All tests passed!');
    } catch (conversionError) {
      console.error('❌ PDF conversion failed:');
      console.error('   Error:', conversionError.message);
      console.error('\n📋 Possible issues:');
      console.error('   1. docx-pdf requires PhantomJS which may not work on Windows');
      console.error('   2. The library may need LibreOffice installed');
      console.error('   3. Consider using an alternative approach (HTML to PDF)');
      console.error('\n💡 Recommendation:');
      console.error('   Use the Word document directly (.docx) instead of PDF');
      console.error('   Or implement HTML-to-PDF conversion using puppeteer');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testWordToPdf();

