const fs = require('fs');
const path = require('path');

// Read the git version to get the missing methods
const gitFilePath = path.join(__dirname, 'excelReportService_git.ts');
const gitContent = fs.readFileSync(gitFilePath, 'utf8');
const gitLines = gitContent.split('\n');

// Extract lines 527-1141 from git version (the Daily Report and all other methods + class closing)
// Line 527 is "  /**" comment before generateDailyReport
// Line 1141 is "}" closing the class
const missingMethods = gitLines.slice(526, 1141); // 0-based: 526 to 1140

// Read current file
const currentFilePath = path.join(__dirname, '..', 'backend', 'src', 'services', 'excelReportService.ts');
const currentContent = fs.readFileSync(currentFilePath, 'utf8');
const currentLines = currentContent.split('\n');

console.log('Current file lines:', currentLines.length);
console.log('Missing methods lines:', missingMethods.length);

// Current file ends at line 772 with the closing brace of generateWardAuditReport
// We need to append the missing methods after line 771 (the "  }" closing the method)
// But first check what's at the end of current file
console.log('Last 5 lines of current file:');
currentLines.slice(-5).forEach((l, i) => console.log(`  ${currentLines.length - 4 + i}: ${l}`));

// Remove any trailing empty lines from current file, keep up to line 771
let endIdx = currentLines.length - 1;
while (endIdx > 0 && currentLines[endIdx].trim() === '') endIdx--;
const trimmedCurrent = currentLines.slice(0, endIdx + 1);

console.log('Trimmed current ends at line:', trimmedCurrent.length);
console.log('Last line:', trimmedCurrent[trimmedCurrent.length - 1]);

// Combine: current file (up to method close) + blank line + missing methods
const newContent = [...trimmedCurrent, '', ...missingMethods, ''].join('\n');
fs.writeFileSync(currentFilePath, newContent, 'utf8');
console.log('Done! New file has', newContent.split('\n').length, 'lines');

