/**
 * Test the live SQL conversion to debug the issue
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testLiveSQLConversion() {
  console.log('🔧 Testing live SQL conversion...');
  
  try {
    // Test the exact query that's failing
    console.log('\n1. Testing the exact failing query...');
    
    const failingQuery = `SELECT * FROM members_with_voting_districts WHERE 1= TRUE ORDER BY full_name LIMIT ?`;
    
    console.log('Original query:');
    console.log(failingQuery);
    
    // Test the conversion
    const convertedQuery = SQLMigrationService.convertComplexMySQLQuery(failingQuery);
    
    console.log('\nConverted query:');
    console.log(convertedQuery);
    
    // Check if conversion worked
    if (convertedQuery.includes('WHERE 1= TRUE')) {
      console.log('❌ CONVERSION FAILED: Query still contains "WHERE 1= TRUE"');
      
      // Test individual conversion steps
      console.log('\n2. Testing individual conversion steps...');
      
      let testQuery = failingQuery;
      console.log('Step 1 - Original:', testQuery);
      
      // Test parameter conversion
      let parameterIndex = 1;
      testQuery = testQuery.replace(/\?/g, () => {
        return '$' + (parameterIndex++);
      });
      console.log('Step 2 - Parameters:', testQuery);
      
      // Test boolean conversion
      testQuery = testQuery.replace(/WHERE\s+1\s*=\s*TRUE\b/gi, 'WHERE TRUE');
      console.log('Step 3 - Boolean WHERE:', testQuery);
      
      testQuery = testQuery.replace(/WHERE\s+1\s*=\s*1\b/gi, 'WHERE TRUE');
      console.log('Step 4 - Boolean WHERE 1=1:', testQuery);
      
    } else if (convertedQuery.includes('WHERE TRUE')) {
      console.log('✅ CONVERSION SUCCESSFUL: Query converted to "WHERE TRUE"');
    } else {
      console.log('⚠️ UNEXPECTED RESULT: Query converted but not as expected');
    }
    
    // Test variations of the query
    console.log('\n3. Testing query variations...');
    
    const variations = [
      'SELECT * FROM members_with_voting_districts WHERE 1= TRUE ORDER BY full_name LIMIT ?',
      'SELECT * FROM members_with_voting_districts WHERE 1 = TRUE ORDER BY full_name LIMIT ?',
      'SELECT * FROM members_with_voting_districts WHERE 1=TRUE ORDER BY full_name LIMIT ?',
      'SELECT * FROM members_with_voting_districts WHERE 1 =TRUE ORDER BY full_name LIMIT ?',
      'SELECT * FROM members_with_voting_districts WHERE 1= 1 ORDER BY full_name LIMIT ?',
      'SELECT * FROM members_with_voting_districts WHERE 1 = 1 ORDER BY full_name LIMIT ?'
    ];
    
    variations.forEach((query, index) => {
      const converted = SQLMigrationService.convertComplexMySQLQuery(query);
      const success = converted.includes('WHERE TRUE');
      console.log(`Variation ${index + 1}: ${success ? '✅' : '❌'} ${query.substring(query.indexOf('WHERE'), query.indexOf('ORDER'))}`);
      console.log(`  Converted to: ${converted.substring(converted.indexOf('WHERE'), converted.indexOf('ORDER'))}`);
    });
    
    // Test the regex patterns directly
    console.log('\n4. Testing regex patterns directly...');
    
    const testString = 'WHERE 1= TRUE';
    const patterns = [
      /WHERE\s+1\s*=\s*TRUE\b/gi,
      /WHERE\s+1\s*=\s*1\b/gi,
      /WHERE\s*1\s*=\s*TRUE\b/gi,
      /WHERE\s*1\s*=\s*1\b/gi
    ];
    
    patterns.forEach((pattern, index) => {
      const matches = testString.match(pattern);
      console.log(`Pattern ${index + 1}: ${pattern} - ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
      if (matches) {
        console.log(`  Matched: "${matches[0]}"`);
        const replaced = testString.replace(pattern, 'WHERE TRUE');
        console.log(`  Replaced: "${replaced}"`);
      }
    });
    
    console.log('\n🎯 LIVE SQL CONVERSION TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testLiveSQLConversion();
