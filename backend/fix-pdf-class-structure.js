const fs = require('fs');

console.log('🔧 Fixing PDF Export Service Class Structure');
console.log('============================================\n');

try {
  const filePath = './src/services/pdfExportService.ts';
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  console.log('📊 Original file size:', content.length, 'characters');
  console.log('📊 Original lines:', content.split('\n').length);
  
  let fixCount = 0;
  
  // Fix the main structural issues
  
  // 1. Fix broken template literals that are still causing issues
  const templateLiteralRegex = /'\$\{([^}]+)\}'/g;
  content = content.replace(templateLiteralRegex, (match, expression) => {
    fixCount++;
    // Check if it's a simple variable or complex expression
    if (expression.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/)) {
      return expression;
    } else {
      return '(' + expression + ')';
    }
  });
  
  // 2. Fix specific broken patterns in doc.text() calls
  content = content.replace(/doc\.text\('([^']*)\$\{([^}]+)\}([^']*)'\)/g, (match, before, expression, after) => {
    fixCount++;
    return `doc.text('${before}' + (${expression}) + '${after}')`;
  });
  
  // 3. Fix forEach callback issues with template literals
  content = content.replace(/\.forEach\(\([^)]+\)\s*=>\s*\{[^}]*doc\.text\('([^']*)\$\{([^}]+)\}([^']*)'\)[^}]*\}\);/g, (match) => {
    fixCount++;
    return match.replace(/'\$\{([^}]+)\}'/g, "' + ($1) + '");
  });
  
  // 4. Fix specific broken patterns in the file
  content = content.replace(/doc\.text\(([^)]*)\$\{([^}]+)\}([^)]*)\)/g, (match, before, expression, after) => {
    fixCount++;
    return `doc.text(${before}' + (${expression}) + '${after})`;
  });
  
  // 5. Fix remaining template literal fragments
  content = content.replace(/([^']*)\$\{([^}]+)\}([^']*)/g, (match, before, expression, after) => {
    // Only fix if it's within a string context
    if (before.includes("'") || after.includes("'")) {
      fixCount++;
      return before + "' + (" + expression + ") + '" + after;
    }
    return match;
  });
  
  // 6. Clean up multiple consecutive string concatenations
  content = content.replace(/'\s*\+\s*'/g, '');
  content = content.replace(/\+\s*''\s*\+/g, ' + ');
  content = content.replace(/\+\s*''\s*$/gm, '');
  content = content.replace(/^''\s*\+\s*/gm, '');
  
  // 7. Fix empty string concatenations
  content = content.replace(/\s*\+\s*''\s*/g, '');
  content = content.replace(/\s*''\s*\+\s*/g, '');
  
  // 8. Fix specific patterns that are causing compilation errors
  content = content.replace(/doc\.text\('([^']*)\s*\+\s*\([^)]+\)\s*\+\s*'([^']*)'\)/g, (match, before, after) => {
    return match; // Keep as is if already properly formatted
  });
  
  // 9. Fix broken string concatenation in map functions
  content = content.replace(/\.map\(\([^)]+\)\s*=>\s*'([^']*)\$\{([^}]+)\}([^']*)'\)/g, (match, param, before, expression, after) => {
    fixCount++;
    return match.replace(/'\$\{([^}]+)\}'/g, "' + ($1) + '");
  });
  
  // 10. Fix specific broken patterns found in the error log
  content = content.replace(/doc\.text\('([^']*)\$\{([^}]+)\s*\+\s*'([^']*)\$\{([^}]+)\}([^']*)'\)/g, (match, before1, expr1, middle, expr2, after) => {
    fixCount++;
    return `doc.text('${before1}' + (${expr1}) + '${middle}' + (${expr2}) + '${after}')`;
  });
  
  // Write the fixed content back
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('✅ File updated successfully');
    console.log('📊 New file size:', content.length, 'characters');
    console.log('📊 New lines:', content.split('\n').length);
    console.log('🔧 Total fixes applied:', fixCount);
  } else {
    console.log('ℹ️  No changes needed');
  }
  
  console.log('\n🎉 PDF Export Service class structure fixes completed!');
  
} catch (error) {
  console.error('❌ Error fixing PDF Export Service:', error.message);
  process.exit(1);
}

console.log('\n✅ PDF Export Service class structure fix completed');
