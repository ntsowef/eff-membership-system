const PDFDocument = require('pdfkit');
const fs = require('fs');

console.log('Testing PDF generation...');

try {
  // Create a simple PDF document
  const doc = new PDFDocument();
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    fs.writeFileSync('test-simple.pdf', pdfBuffer);
    console.log('✅ Simple PDF generated successfully!');
    console.log('File size:', pdfBuffer.length, 'bytes');
  });

  doc.on('error', (error) => {
    console.error('❌ PDF generation error:', error);
  });

  // Add some content
  doc.fontSize(20).text('Test PDF Document', 100, 100);
  doc.fontSize(12).text('This is a test to verify PDFKit is working correctly.', 100, 150);
  
  // End the document
  doc.end();

} catch (error) {
  console.error('❌ Error creating PDF:', error);
}
