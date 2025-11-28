const fs = require('fs');

console.log('🔍 Finding Template Literal Issues');
console.log('==================================\n');

try {
  const filePath = './src/services/pdfExportService.ts';
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log('📊 Total lines:', lines.length);
  
  let inTemplateString = false;
  let templateStartLine = -1;
  let backtickCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Count backticks in this line
    const backticks = (line.match(/`/g) || []).length;
    backtickCount += backticks;
    
    // Check for template literal starts/ends
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '`') {
        if (!inTemplateString) {
          inTemplateString = true;
          templateStartLine = lineNumber;
          console.log(`✅ Template literal started at line ${lineNumber}: ${line.trim()}`);
        } else {
          inTemplateString = false;
          console.log(`✅ Template literal ended at line ${lineNumber}: ${line.trim()}`);
          templateStartLine = -1;
        }
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('Total backticks found:', backtickCount);
  console.log('Backticks should be even number for proper pairing');
  
  if (inTemplateString) {
    console.log(`❌ ISSUE FOUND: Unclosed template literal started at line ${templateStartLine}`);
    console.log(`Line ${templateStartLine}: ${lines[templateStartLine - 1]}`);
    
    // Show context around the unclosed template literal
    const start = Math.max(0, templateStartLine - 3);
    const end = Math.min(lines.length, templateStartLine + 3);
    
    console.log('\n🔍 Context around unclosed template literal:');
    for (let i = start; i < end; i++) {
      const marker = i === templateStartLine - 1 ? '>>> ' : '    ';
      console.log(`${marker}${i + 1}: ${lines[i]}`);
    }
  } else {
    console.log('✅ All template literals appear to be properly closed');
  }
  
  if (backtickCount % 2 !== 0) {
    console.log('❌ ISSUE: Odd number of backticks found - there may be an unmatched backtick');
    
    // Find lines with backticks
    console.log('\n🔍 Lines containing backticks:');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('`')) {
        console.log(`Line ${i + 1}: ${lines[i].trim()}`);
      }
    }
  } else {
    console.log('✅ Even number of backticks found - pairing looks correct');
  }
  
} catch (error) {
  console.error('❌ Error analyzing template literals:', error.message);
}

console.log('\n✅ Template literal analysis completed');
