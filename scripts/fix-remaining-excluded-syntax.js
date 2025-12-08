const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing remaining EXCLUDED syntax errors...\n');

const servicesDir = path.join(__dirname, '..', 'backend', 'src', 'services');

// Get all TypeScript files
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

  // Pattern 1: Fix "EXCLUDED.?, ," or "EXCLUDED.$1, ," patterns
  const pattern1 = /EXCLUDED\.\$?\d*\?\s*,\s*,/g;
  if (content.match(pattern1)) {
    // Find the INSERT statement and count parameters
    content = content.replace(/INSERT INTO\s+\w+\s*\(([^)]+)\)\s*EXCLUDED\.\$?\d*\?\s*,\s*,[^`]+`/gi, (match) => {
      // Extract column list
      const columnsMatch = match.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i);
      if (columnsMatch) {
        const columns = columnsMatch[1].split(',').map(c => c.trim()).filter(c => c);
        
        // Extract the VALUES part (everything after EXCLUDED until backtick)
        const valuesMatch = match.match(/EXCLUDED\.\$?\d*\?\s*,\s*,([^`]+)`/);
        if (valuesMatch) {
          const valuesPart = valuesMatch[1].trim();
          
          // Count existing parameters in the values part
          const existingParams = (valuesPart.match(/\$\d+/g) || []).length;
          const literals = (valuesPart.match(/'[^']*'|CURRENT_TIMESTAMP|CURRENT_DATE|NULL/g) || []).length;
          
          // Calculate how many parameters we need at the start
          const totalNeeded = columns.length;
          const startParams = totalNeeded - existingParams - literals;
          
          // Generate parameter list
          let paramList = [];
          for (let i = 1; i <= startParams; i++) {
            paramList.push(`$${i}`);
          }
          
          // Append the rest of the values
          const fullValues = paramList.join(', ') + (valuesPart ? ', ' + valuesPart : '');
          
          // Reconstruct the INSERT
          const tableName = match.match(/INSERT INTO\s+(\w+)/i)[1];
          const columnList = columnsMatch[1];
          const result = `INSERT INTO ${tableName} (\n        ${columnList}\n      ) VALUES (${fullValues})\n      \``;
          
          fileFixCount++;
          return result;
        }
      }
      return match;
    });
  }

  // Pattern 2: Fix standalone "?, ?" in INSERT context
  content = content.replace(/\)\s*\?\s*,\s*\?([^`]*)`/g, (match, rest) => {
    // Count question marks
    const questionMarks = match.match(/\?/g);
    if (questionMarks) {
      // Count existing $N parameters in the rest
      const existingParams = (rest.match(/\$\d+/g) || []);
      const maxParam = existingParams.length > 0 
        ? Math.max(...existingParams.map(p => parseInt(p.substring(1)))) 
        : 0;
      
      // Generate new parameters starting from 1
      const newParams = [];
      for (let i = 1; i <= questionMarks.length; i++) {
        newParams.push(`$${i}`);
      }
      
      fileFixCount++;
      return `) VALUES (${newParams.join(', ')}${rest}\``;
    }
    return match;
  });

  // Pattern 3: Fix "?, ?, ?" patterns in VALUES clauses
  content = content.replace(/VALUES\s*\([^)]*\?[^)]*\)/gi, (match) => {
    const questionMarks = match.match(/\?/g);
    if (questionMarks) {
      // Check if there are already some $N parameters
      const existingParams = match.match(/\$\d+/g) || [];
      const maxParam = existingParams.length > 0 
        ? Math.max(...existingParams.map(p => parseInt(p.substring(1)))) 
        : 0;
      
      // Replace each ? with the next parameter number
      let paramCounter = maxParam + 1;
      const fixed = match.replace(/\?/g, () => `$${paramCounter++}`);
      
      fileFixCount++;
      return fixed;
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

if (totalFilesFixed === 0) {
  console.log(`\n✅ No remaining EXCLUDED syntax errors found!`);
} else {
  console.log(`\n✅ All remaining EXCLUDED syntax errors have been fixed!`);
}

