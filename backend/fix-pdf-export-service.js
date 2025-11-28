const fs = require('fs');

console.log('🔧 Fixing PDF Export Service Template Literal Issues');
console.log('===================================================\n');

try {
  const filePath = './src/services/pdfExportService.ts';
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  console.log('📊 Original file size:', content.length, 'characters');
  console.log('📊 Original lines:', content.split('\n').length);
  
  let fixCount = 0;
  
  // Fix template literals in string concatenation
  // Pattern: '${variable}' -> variable
  // Pattern: '${expression}' -> (expression)
  
  // Fix simple variable template literals
  content = content.replace(/'\$\{([^}]+)\}'/g, (match, expression) => {
    fixCount++;
    // Check if it's a simple variable or complex expression
    if (expression.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/)) {
      return expression;
    } else {
      return '(' + expression + ')';
    }
  });
  
  // Fix template literals with string concatenation
  content = content.replace(/'\$\{([^}]+)\}\s*\+\s*'/g, (match, expression) => {
    fixCount++;
    return '(' + expression + ') + ';
  });
  
  // Fix template literals at the start of concatenation
  content = content.replace(/'\s*\+\s*\$\{([^}]+)\}'/g, (match, expression) => {
    fixCount++;
    return " + (' + expression + ')";
  });
  
  // Fix broken template literals in the middle of strings
  content = content.replace(/([^']*)\$\{([^}]+)\}([^']*)/g, (match, before, expression, after) => {
    if (before.includes("'") || after.includes("'")) {
      fixCount++;
      return before + "' + (" + expression + ") + '" + after;
    }
    return match;
  });
  
  // Fix specific patterns found in the file
  
  // Fix forEach callback issues
  content = content.replace(/\.forEach\(\([^)]+\)\s*=>\s*\{([^}]+)\}\);/g, (match) => {
    if (match.includes('${')) {
      fixCount++;
      return match.replace(/'\$\{([^}]+)\}'/g, '($1)');
    }
    return match;
  });
  
  // Fix doc.text() calls with template literals
  content = content.replace(/doc\.text\('([^']*\$\{[^}]+\}[^']*)'\)/g, (match, textContent) => {
    fixCount++;
    // Split by template literals and rebuild
    const parts = textContent.split(/(\$\{[^}]+\})/);
    const fixedParts = parts.map(part => {
      if (part.startsWith('${') && part.endsWith('}')) {
        const expression = part.slice(2, -1);
        return "' + (" + expression + ") + '";
      }
      return part;
    });
    return "doc.text('" + fixedParts.join('') + "')";
  });
  
  // Fix specific broken patterns
  content = content.replace(/'\$\{([^}]+)\s+\+\s+'([^']+)'\s*\$\{([^}]+)\}([^']*)'/, (match, expr1, middle, expr2, end) => {
    fixCount++;
    return "(" + expr1 + ") + '" + middle + "' + (" + expr2 + ")" + (end ? " + '" + end + "'" : "");
  });
  
  // Fix remaining template literal fragments
  content = content.replace(/\$\{([^}]+)\}/g, (match, expression) => {
    fixCount++;
    return "' + (" + expression + ") + '";
  });
  
  // Clean up multiple consecutive string concatenations
  content = content.replace(/'\s*\+\s*'/g, '');
  content = content.replace(/\+\s*''\s*\+/g, ' + ');
  content = content.replace(/\+\s*''\s*$/gm, '');
  content = content.replace(/^''\s*\+\s*/gm, '');
  
  // Fix empty string concatenations
  content = content.replace(/\s*\+\s*''\s*/g, '');
  content = content.replace(/\s*''\s*\+\s*/g, '');
  
  // Fix double quotes in concatenation
  content = content.replace(/'\s*\+\s*'/g, '');
  
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
  
  console.log('\n🎉 PDF Export Service template literal fixes completed!');
  
} catch (error) {
  console.error('❌ Error fixing PDF Export Service:', error.message);
  process.exit(1);
}

console.log('\n✅ PDF Export Service fix completed');
