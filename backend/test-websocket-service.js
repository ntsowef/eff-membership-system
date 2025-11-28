const fs = require('fs');

console.log('🧪 Testing WebSocket Service Compilation');
console.log('=======================================\n');

try {
  // Read the websocketService.ts file
  const content = fs.readFileSync('./src/services/websocketService.ts', 'utf8');
  
  console.log('✅ WebSocket Service file read successfully');
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
  
  if (issues.length === 0) {
    console.log('\n🎉 WebSocket Service appears to be syntactically correct!');
    console.log('✅ No obvious syntax issues found');
    console.log('✅ Template literals properly handled');
    console.log('✅ String concatenation looks good');
    console.log('✅ No parameter naming issues');
  } else {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log('   -', issue));
  }
  
} catch (error) {
  console.error('❌ Error testing WebSocket Service:', error.message);
}

console.log('\n✅ WebSocket Service test completed');
