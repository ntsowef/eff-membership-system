/**
 * Debug the boolean pattern matching
 */

function debugBooleanPattern() {
  console.log('🔧 Debugging boolean pattern matching...');
  
  // Test string
  const testString = 'SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)';
  
  console.log('Test string:', testString);
  
  // Test different patterns
  const patterns = [
    /\bis_active\s*=\s*1\b/gi,
    /(\s|^|,|\()is_active\s*=\s*1\b/gi,
    /is_active\s*=\s*1/gi,
    /WHEN\s+is_active\s*=\s*1/gi,
    /WHEN\s+is_active\s*=\s*1\s+THEN/gi
  ];
  
  patterns.forEach((pattern, index) => {
    console.log(`\nPattern ${index + 1}: ${pattern}`);
    const matches = testString.match(pattern);
    console.log('Matches:', matches);
    
    if (matches) {
      const replaced = testString.replace(pattern, (match, ...args) => {
        console.log('Match details:', { match, args });
        if (args[0]) {
          return args[0] + 'is_active = true';
        } else {
          return match.replace('= 1', '= true');
        }
      });
      console.log('Replaced:', replaced);
    }
  });
  
  // Test the actual conversion function
  console.log('\n--- Testing actual conversion ---');
  
  let convertedQuery = testString;
  
  // Apply the exact same logic as in the service
  console.log('Step 1 - Original:', convertedQuery);
  
  // Table-prefixed boolean columns first
  convertedQuery = convertedQuery.replace(/(\w+\.is_active)\s*=\s*1\b/gi, '$1 = true');
  console.log('Step 2 - Table prefixed:', convertedQuery);
  
  // Non-prefixed boolean columns
  convertedQuery = convertedQuery.replace(/(\s|^|,|\()is_active\s*=\s*1\b/gi, '$1is_active = true');
  console.log('Step 3 - Non-prefixed:', convertedQuery);
  
  // Try a simpler approach
  console.log('\n--- Testing simpler approach ---');
  
  let simpleQuery = testString;
  console.log('Original:', simpleQuery);
  
  // Just replace all is_active = 1 patterns
  simpleQuery = simpleQuery.replace(/is_active\s*=\s*1\b/gi, 'is_active = true');
  console.log('Simple replacement:', simpleQuery);
  
  // Test with the full admin query
  console.log('\n--- Testing full admin query ---');
  
  const adminQuery = `
        SELECT
          admin_level,
          COUNT(*) as count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count
        FROM users
        WHERE admin_level IS NOT NULL AND admin_level != 'none'
        GROUP BY admin_level
  `;
  
  console.log('Admin query original:');
  console.log(adminQuery);
  
  let convertedAdminQuery = adminQuery;
  
  // Apply simple replacements
  convertedAdminQuery = convertedAdminQuery.replace(/is_active\s*=\s*1\b/gi, 'is_active = true');
  convertedAdminQuery = convertedAdminQuery.replace(/is_active\s*=\s*0\b/gi, 'is_active = false');
  
  console.log('Admin query converted:');
  console.log(convertedAdminQuery);
  
  console.log('\n🎯 BOOLEAN PATTERN DEBUG COMPLETE!');
}

debugBooleanPattern();
