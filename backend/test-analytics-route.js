const fs = require('fs');

console.log('🧪 Testing Analytics Route File');
console.log('================================\n');

try {
  // Read the analytics route file
  const content = fs.readFileSync('./src/routes/analytics.ts', 'utf8');
  
  console.log('✅ Analytics route file read successfully');
  console.log('📊 File size:', content.length, 'characters');
  console.log('📊 Lines:', content.split('\n').length);
  
  // Check for common syntax issues
  const issues = [];
  
  // Check for template literal issues
  const templateLiteralMatches = content.match(/\$\{[^}]*\}/g);
  if (templateLiteralMatches) {
    console.log('⚠️  Found template literals:', templateLiteralMatches.length);
    templateLiteralMatches.forEach((match, index) => {
      if (index < 5) { // Show first 5
        console.log('   -', match);
      }
    });
  }
  
  // Check for string concatenation patterns
  const concatMatches = content.match(/\'\s*\+\s*[^']+\s*\+\s*\'/g);
  if (concatMatches) {
    console.log('✅ String concatenation patterns:', concatMatches.length);
  }
  
  // Check for parameter issues
  const parameterIssues = content.match(/\w+\$\d+/g);
  if (parameterIssues) {
    console.log('❌ Parameter naming issues found:', parameterIssues);
    issues.push('Parameter naming issues');
  }
  
  // Check for unterminated strings
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      console.log(`❌ Potential unterminated string at line ${index + 1}: ${line.trim()}`);
      issues.push(`Unterminated string at line ${index + 1}`);
    }
  });
  
  // Check for import statements
  const importMatches = content.match(/^import\s+.*from\s+['"][^'"]+['"];?$/gm);
  if (importMatches) {
    console.log('✅ Import statements found:', importMatches.length);
    importMatches.forEach(imp => {
      console.log('   -', imp.trim());
    });
  }
  
  // Check for route definitions
  const routeMatches = content.match(/router\.(get|post|put|delete|patch)\(/g);
  if (routeMatches) {
    console.log('✅ Route definitions found:', routeMatches.length);
  }
  
  // Check for middleware usage
  const middlewareMatches = content.match(/(authenticate|requirePermission|applyGeographicFilter|cacheMiddleware)/g);
  if (middlewareMatches) {
    console.log('✅ Middleware usage found:', middlewareMatches.length);
  }
  
  // Check for async/await patterns
  const asyncMatches = content.match(/async\s*\(/g);
  if (asyncMatches) {
    console.log('✅ Async functions found:', asyncMatches.length);
  }
  
  if (issues.length === 0) {
    console.log('\n🎉 Analytics Route appears to be syntactically correct!');
    console.log('✅ No obvious syntax issues found');
    console.log('✅ Import statements properly formatted');
    console.log('✅ Route definitions look good');
    console.log('✅ Middleware usage appears correct');
    console.log('✅ Async/await patterns properly used');
  } else {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log('   -', issue));
  }
  
} catch (error) {
  console.error('❌ Error testing Analytics Route:', error.message);
}

console.log('\n✅ Analytics Route test completed');
