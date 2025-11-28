/**
 * Test simple replacement
 */

function testReplacement() {
  console.log('🔍 Testing simple replacement...');
  
  let testQuery = `
    SELECT * FROM test
    GROUP BY TO_CHAR(ms.date_joined, 'YYYY-MM'), EXTRACT(YEAR FROM ms.date_joined)
    ORDER BY __FIRST_GROUP_BY_EXPR__ DESC
  `;
  
  console.log('Before replacement:');
  console.log(testQuery);
  console.log('Contains placeholder:', testQuery.includes('__FIRST_GROUP_BY_EXPR__'));
  
  // Manual extraction
  const groupByStart = testQuery.indexOf('GROUP BY') + 9;
  let firstGroupByExpr = '';
  let parenCount = 0;
  let i = groupByStart;
  
  // Skip leading whitespace
  while (i < testQuery.length && /\s/.test(testQuery[i])) i++;
  
  // Extract the first expression
  while (i < testQuery.length) {
    const char = testQuery[i];
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    
    // Stop at comma only if we're not inside parentheses
    if (char === ',' && parenCount === 0) break;
    
    firstGroupByExpr += char;
    i++;
  }
  
  firstGroupByExpr = firstGroupByExpr.trim();
  console.log('Extracted expression:', `"${firstGroupByExpr}"`);
  
  // Replace
  testQuery = testQuery.replace(/__FIRST_GROUP_BY_EXPR__/g, firstGroupByExpr);
  
  console.log('After replacement:');
  console.log(testQuery);
  console.log('Contains placeholder:', testQuery.includes('__FIRST_GROUP_BY_EXPR__'));
}

testReplacement();
