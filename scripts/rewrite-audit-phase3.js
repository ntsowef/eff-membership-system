const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'services', 'excelReportService.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Total lines before:', lines.length);

// The method properly ends at line 771 (  })
// Lines 772-1654 are duplicate junk
// Line 1655+ is the Daily Report method and rest of the class
// We need to keep lines 1-771 and 1655+

const before = lines.slice(0, 771); // lines 1-771
const after = lines.slice(1654);     // lines 1655+

const newContent = [...before, '', ...after].join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Phase 3 done - removed duplicate code (lines 772-1654)');
console.log('New file has', newContent.split('\n').length, 'lines');

