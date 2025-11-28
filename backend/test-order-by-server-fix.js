/**
 * Test the ORDER BY fix with the running server
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testOrderByServerFix() {
  console.log('🔍 Testing ORDER BY fix with running server...');
  
  try {
    // Test the exact query that was failing
    const query = `
        SELECT
          DATE_FORMAT(ms.date_joined, '%Y-%m') as month_year,
          YEAR(ms.date_joined) as year,
          MONTHNAME(ms.date_joined) as month,
          COUNT(CASE WHEN st.subscription_type_id = 1 THEN 1 END) as new_members,
          COUNT(CASE WHEN st.subscription_type_id = 2 THEN 1 END) as renewals,
          COUNT(*) as total
        FROM memberships ms
        LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id
        WHERE ms.date_joined >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(ms.date_joined, '%Y-%m'), YEAR(ms.date_joined), MONTHNAME(ms.date_joined)
        ORDER BY ms.date_joined DESC
    `;
    
    console.log('=== ORIGINAL QUERY ===');
    console.log(query);
    
    const converted = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(query) : query;
    
    console.log('\n=== CONVERTED QUERY ===');
    console.log(converted);
    
    console.log('\n=== VALIDATION ===');
    
    // Check for the specific syntax error
    const hasInvalidOrderBy = converted.includes('ORDER BY TO_CHAR(ms.date_joined DESC');
    const hasValidOrderBy = converted.includes('ORDER BY TO_CHAR(ms.date_joined, \'YYYY-MM\') DESC');
    
    console.log('❌ Has invalid ORDER BY syntax:', hasInvalidOrderBy);
    console.log('✅ Has valid ORDER BY syntax:', hasValidOrderBy);
    
    // Check for other conversions
    console.log('✅ Has DATE_FORMAT conversion:', converted.includes('TO_CHAR(ms.date_joined, \'YYYY-MM\')'));
    console.log('✅ Has MONTHNAME conversion:', converted.includes('TO_CHAR(ms.date_joined, \'Month\')'));
    console.log('✅ Has YEAR conversion:', converted.includes('EXTRACT(YEAR FROM ms.date_joined)'));
    console.log('✅ Has DATE_SUB conversion:', converted.includes('(CURRENT_DATE - ($1 || \' month\')::INTERVAL)'));
    console.log('✅ Has parameter conversion:', converted.includes('$1'));
    
    if (hasValidOrderBy && !hasInvalidOrderBy) {
      console.log('\n🎉 ORDER BY FIX IS WORKING CORRECTLY!');
      return true;
    } else {
      console.log('\n❌ ORDER BY fix is not working correctly');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testOrderByServerFix().then(success => {
  if (success) {
    console.log('\n✅ All tests passed! The ORDER BY syntax error has been resolved.');
  } else {
    console.log('\n❌ Tests failed. The ORDER BY syntax error still exists.');
  }
});
