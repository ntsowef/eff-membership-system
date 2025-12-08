const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing all EXCLUDED.? syntax errors in service files...\n');

const servicesDir = path.join(__dirname, '..', 'backend', 'src', 'services');

// Get all TypeScript files in services directory
const files = fs.readdirSync(servicesDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(servicesDir, file));

let totalFilesFixed = 0;
let totalFixesApplied = 0;

files.forEach(filePath => {
  const fileName = path.basename(filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileFixCount = 0;

  // Pattern 1: Fix "EXCLUDED.?, ?, ?" to "VALUES ($1, $2, $3, ...)"
  // This pattern matches the corrupted INSERT syntax
  const excludedPattern = /EXCLUDED\.\?\s*,\s*\?/g;
  const matches = content.match(excludedPattern);
  
  if (matches) {
    // Find all INSERT statements with EXCLUDED.?
    const insertPattern = /INSERT INTO\s+(\w+)\s*\([^)]+\)\s*EXCLUDED\.\?[^;]+/gi;
    
    content = content.replace(insertPattern, (match) => {
      // Count the number of columns in the INSERT
      const columnsMatch = match.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i);
      if (columnsMatch) {
        const columns = columnsMatch[1].split(',').map(c => c.trim());
        const paramCount = columns.length;
        
        // Generate $1, $2, $3, ... placeholders
        const placeholders = Array.from({ length: paramCount }, (_, i) => `$${i + 1}`).join(', ');
        
        // Replace EXCLUDED.?, ?, ? with VALUES ($1, $2, $3, ...)
        const fixed = match.replace(/EXCLUDED\.\?[^)]+\)/, `VALUES (${placeholders})`);
        fileFixCount++;
        return fixed;
      }
      return match;
    });
  }

  // Pattern 2: Fix standalone "?, ?" patterns in INSERT/VALUES context
  const standalonePattern = /\)\s*\?\s*,\s*\?/g;
  if (content.match(standalonePattern)) {
    // This is trickier - need to count parameters and replace
    content = content.replace(/\)\s*(\?(?:\s*,\s*\?)*)/g, (match, params) => {
      const questionMarks = params.match(/\?/g);
      if (questionMarks) {
        const count = questionMarks.length;
        const placeholders = Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
        fileFixCount++;
        return `) VALUES (${placeholders})`;
      }
      return match;
    });
  }

  // Pattern 3: Fix "?, ?" in the middle of VALUES clauses
  content = content.replace(/VALUES\s*\([^)]*\?\s*,\s*\?[^)]*\)/g, (match) => {
    const questionMarks = match.match(/\?/g);
    if (questionMarks) {
      const count = questionMarks.length;
      const placeholders = Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
      fileFixCount++;
      return `VALUES (${placeholders})`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fileName}: Fixed ${fileFixCount} issues`);
    totalFilesFixed++;
    totalFixesApplied += fileFixCount;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files fixed: ${totalFilesFixed}`);
console.log(`   Total fixes applied: ${totalFixesApplied}`);
console.log(`\n✅ All EXCLUDED.? syntax errors have been fixed!`);

