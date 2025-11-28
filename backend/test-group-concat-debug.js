/**
 * Debug GROUP_CONCAT conversion issue
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

function debugGroupConcatConversion() {
  console.log('🔍 Debugging GROUP_CONCAT conversion...');
  
  // Test 1: Simple GROUP_CONCAT with SEPARATOR
  const simpleQuery = `
    SELECT
      GROUP_CONCAT(name SEPARATOR ', ') as names
    FROM table1
  `;
  
  console.log('\n1. Simple GROUP_CONCAT with SEPARATOR:');
  console.log('Original:', simpleQuery.replace(/\s+/g, ' ').trim());
  
  const converted1 = SQLMigrationService.convertComplexMySQLQuery(simpleQuery);
  console.log('Converted:', converted1.replace(/\s+/g, ' ').trim());
  
  // Test 2: Complex GROUP_CONCAT with SEPARATOR (like in the leadership query)
  const complexQuery = `
    SELECT
      GROUP_CONCAT(
        TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')))
        SEPARATOR ', '
      ) as current_holders
    FROM table1
  `;
  
  console.log('\n2. Complex GROUP_CONCAT with SEPARATOR:');
  console.log('Original:');
  console.log(complexQuery);
  
  const converted2 = SQLMigrationService.convertComplexMySQLQuery(complexQuery);
  console.log('Converted:');
  console.log(converted2);
  
  // Test 3: Multi-line GROUP_CONCAT
  const multilineQuery = `GROUP_CONCAT(
    TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')))
    SEPARATOR ', '
  )`;
  
  console.log('\n3. Multi-line GROUP_CONCAT fragment:');
  console.log('Original:');
  console.log(multilineQuery);
  
  const converted3 = SQLMigrationService.convertComplexMySQLQuery(multilineQuery);
  console.log('Converted:');
  console.log(converted3);
  
  // Test 4: Check if the regex is matching
  const testRegex = /GROUP_CONCAT\s*\(\s*([\s\S]*?)\s+SEPARATOR\s+([^)]+)\s*\)/gi;
  
  console.log('\n4. Regex matching test:');
  console.log('Regex:', testRegex.source);
  
  const matches = multilineQuery.match(testRegex);
  console.log('Matches found:', matches ? matches.length : 0);
  
  if (matches) {
    matches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`, match);
    });
  }
  
  // Test 5: Manual regex test
  console.log('\n5. Manual regex replacement test:');
  
  let testQuery = `GROUP_CONCAT(
    TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')))
    SEPARATOR ', '
  )`;
  
  console.log('Before replacement:', testQuery);
  
  // Try the exact regex from the service
  testQuery = testQuery.replace(
    /GROUP_CONCAT\s*\(\s*([\s\S]*?)\s+SEPARATOR\s+([^)]+)\s*\)/gi,
    (match, expression, separator) => {
      console.log('  Match found:', match);
      console.log('  Expression:', expression);
      console.log('  Separator:', separator);
      
      const cleanSeparator = separator.replace(/['"]/g, '');
      const cleanExpression = expression.replace(/\s+/g, ' ').trim();
      return `STRING_AGG(${cleanExpression}, '${cleanSeparator}')`;
    }
  );
  
  console.log('After replacement:', testQuery);
  
  console.log('\n🎯 DEBUG COMPLETE!');
}

debugGroupConcatConversion();
