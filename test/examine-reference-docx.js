const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function examineDocument() {
  try {
    const docPath = path.join(__dirname, '..', 'reports', 'MSUNDUZIWard_52205016_Attendance_Register.docx');
    
    console.log('📄 Examining reference Word document...\n');
    
    // Extract raw text to understand structure
    const result = await mammoth.extractRawText({ path: docPath });
    console.log('=== DOCUMENT TEXT CONTENT ===');
    console.log(result.value);
    console.log('\n=== END OF TEXT CONTENT ===\n');
    
    // Extract with styling information
    const htmlResult = await mammoth.convertToHtml({ path: docPath });
    console.log('=== HTML REPRESENTATION (for styling analysis) ===');
    console.log(htmlResult.value.substring(0, 2000)); // First 2000 chars
    console.log('\n... (truncated) ...\n');
    
  } catch (error) {
    console.error('❌ Error examining document:', error.message);
  }
}

examineDocument();

