/**
 * Test the ORDER BY fix specifically
 */

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testOrderByFix() {
  console.log('🔍 Testing ORDER BY fix specifically...');
  
  try {
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
    
    const converted = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(query) : query;
    
    console.log('=== GROUP BY SECTION ===');
    const groupByMatch = converted.match(/GROUP BY\s+([^O]+)ORDER/i);
    if (groupByMatch) {
      console.log('GROUP BY:', groupByMatch[1].trim());
    }
    
    console.log('\n=== ORDER BY SECTION ===');
    const orderByMatch = converted.match(/ORDER BY\s+([^$]+)/i);
    if (orderByMatch) {
      console.log('ORDER BY:', orderByMatch[1].trim());
    }
    
    console.log('\n=== FIRST GROUP BY EXPRESSION ===');
    const firstGroupByMatch = converted.match(/GROUP BY\s+([^,]+)/i);
    if (firstGroupByMatch) {
      console.log('First expression:', firstGroupByMatch[1].trim());
    }
    
    // Check if the ORDER BY is syntactically correct
    const hasValidOrderBy = !converted.includes('ORDER BY TO_CHAR(ms.date_joined DESC') && 
                           converted.includes('ORDER BY TO_CHAR(ms.date_joined, \'YYYY-MM\') DESC');
    
    console.log('\n=== VALIDATION ===');
    console.log('Has invalid ORDER BY:', converted.includes('ORDER BY TO_CHAR(ms.date_joined DESC'));
    console.log('Has valid ORDER BY:', converted.includes('ORDER BY TO_CHAR(ms.date_joined, \'YYYY-MM\') DESC'));
    
    if (hasValidOrderBy) {
      console.log('✅ ORDER BY syntax is correct');
    } else {
      console.log('❌ ORDER BY syntax is incorrect');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testOrderByFix();
