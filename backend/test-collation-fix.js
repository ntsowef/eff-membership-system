const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testCollationFix() {
  console.log('🧪 Testing MySQL COLLATE clause conversion...\n');

  try {
    // Test the original failing query
    const originalQuery = `
      SELECT COUNT(*) as total_count
      FROM vw_ward_membership_audit
      WHERE ward_standing COLLATE utf8mb4_unicode_ci = ? AND province_code = ? AND (ward_name LIKE ? OR municipality_name LIKE ?)
    `;

    console.log('1. Original failing query:');
    console.log(originalQuery);

    // Test the conversion
    const testResult = SQLMigrationService.testQueryConversion(originalQuery);
    
    console.log('\n2. Converted query:');
    console.log(testResult.converted);

    console.log('\n3. Conversion warnings:');
    if (testResult.warnings.length > 0) {
      testResult.warnings.forEach(warning => console.log(`⚠️  ${warning}`));
    } else {
      console.log('✅ No warnings');
    }

    // Test various collation patterns
    console.log('\n4. Testing various MySQL collation patterns...');
    
    const testQueries = [
      "SELECT * FROM table WHERE column COLLATE utf8mb4_unicode_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE utf8mb4_general_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE utf8_unicode_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE utf8_general_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE latin1_swedish_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE ascii_general_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE utf8mb4_bin = 'value'",
      "SELECT * FROM table WHERE column COLLATE custom_collation_ci = 'value'"
    ];

    testQueries.forEach((query, index) => {
      const result = SQLMigrationService.testQueryConversion(query);
      console.log(`\nTest ${index + 1}:`);
      console.log(`Original: ${query}`);
      console.log(`Converted: ${result.converted}`);
      
      // Check if collation was removed
      if (!result.converted.includes('COLLATE')) {
        console.log('✅ Collation successfully removed');
      } else {
        console.log('❌ Collation still present');
      }
    });

    // Test the actual database query execution
    console.log('\n5. Testing actual database query execution...');
    
    // Use a valid province code from our data
    const testParams = ['Needs Improvement', 'GP', '%64%', '%64%'];
    
    try {
      const result = await SQLMigrationService.executeConvertedQuery(originalQuery, testParams);
      console.log('✅ Database query executed successfully!');
      console.log(`Result: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
    }

    // Test with a simpler query to verify the fix
    console.log('\n6. Testing simpler collation query...');
    const simpleQuery = `
      SELECT ward_standing, COUNT(*) as count
      FROM vw_ward_membership_audit
      WHERE ward_standing COLLATE utf8mb4_unicode_ci IN ('Good Standing', 'Acceptable Standing')
      GROUP BY ward_standing
    `;

    try {
      const result = await SQLMigrationService.executeConvertedQuery(simpleQuery, []);
      console.log('✅ Simple collation query executed successfully!');
      console.log(`Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('❌ Simple collation query failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testCollationFix().catch(console.error);
