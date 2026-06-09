const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'services', 'excelReportService.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Total lines before:', lines.length);

// Keep lines 1-1388 (the class closing "}" is at line 1387, line 1388 is blank)
// Remove lines 1389+ (duplicate methods)
const newLines = lines.slice(0, 1388);
const newContent = newLines.join('\n') + '\n';
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Done! New file has', newContent.split('\n').length, 'lines');

