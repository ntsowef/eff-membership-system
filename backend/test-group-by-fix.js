/**
 * Test the PostgreSQL GROUP BY strictness fix
 */

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testGroupByFix() {
  console.log('🧪 Testing PostgreSQL GROUP BY strictness fix...');
  
  try {
    // Test the problematic query from the logs
    const problemQuery = `
        SELECT
          w.ward_code,
          w.ward_name,
          m.municipality_name,
          COUNT(mem.member_id) as member_count
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN members mem ON w.ward_code = mem.ward_code
        GROUP BY w.ward_code, w.ward_name, m.municipality_name
        HAVING member_count > 0
        ORDER BY member_count DESC
        LIMIT 10
    `;
    
    const converted = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(problemQuery) : problemQuery;
    
    console.log('Original Query:');
    console.log(problemQuery.trim());
    console.log('\nConverted Query:');
    console.log(converted.trim());
    
    // Check if the conversion fixed the issues
    const hasOrderByFix = converted.includes('ORDER BY COUNT(mem.member_id) DESC');
    const hasHavingFix = converted.includes('HAVING COUNT(mem.member_id) > 0');
    
    if (hasOrderByFix) {
      console.log('✅ ORDER BY alias converted to aggregate expression');
    } else {
      console.log('❌ ORDER BY alias conversion failed');
    }
    
    if (hasHavingFix) {
      console.log('✅ HAVING alias converted to aggregate expression');
    } else {
      console.log('❌ HAVING alias conversion failed');
    }
    
    // Test another query with different aggregate
    const sumQuery = `
        SELECT
          category,
          SUM(amount) as total_amount
        FROM transactions
        GROUP BY category
        HAVING total_amount > 1000
        ORDER BY total_amount DESC
    `;
    
    const convertedSum = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(sumQuery) : sumQuery;
    
    console.log('\n--- Testing SUM aggregate ---');
    console.log('Original:', sumQuery.trim());
    console.log('Converted:', convertedSum.trim());
    
    const hasSumOrderBy = convertedSum.includes('ORDER BY SUM(amount) DESC');
    const hasSumHaving = convertedSum.includes('HAVING SUM(amount) > 1000');
    
    if (hasSumOrderBy && hasSumHaving) {
      console.log('✅ SUM aggregate aliases converted correctly');
    } else {
      console.log('❌ SUM aggregate alias conversion failed');
    }
    
    console.log('\n🎉 GROUP BY testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testGroupByFix();
