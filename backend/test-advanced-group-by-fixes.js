/**
 * Test the advanced PostgreSQL GROUP BY strictness fixes
 */

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testAdvancedGroupByFixes() {
  console.log('🧪 Testing advanced PostgreSQL GROUP BY strictness fixes...');
  
  try {
    // Test 1: The membership trends query with ORDER BY column not in GROUP BY
    const membershipTrendsQuery = `
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
    
    const converted1 = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(membershipTrendsQuery) : membershipTrendsQuery;
    
    console.log('=== Test 1: Membership Trends Query ===');
    console.log('Original ORDER BY:', 'ORDER BY ms.date_joined DESC');
    console.log('Converted ORDER BY:', converted1.match(/ORDER BY[^L]+/i)?.[0] || 'Not found');
    
    const hasFixedOrderBy = !converted1.includes('ORDER BY ms.date_joined DESC') && 
                           converted1.includes('ORDER BY TO_CHAR(ms.date_joined');
    
    if (hasFixedOrderBy) {
      console.log('✅ ORDER BY column not in GROUP BY fixed');
    } else {
      console.log('❌ ORDER BY column not in GROUP BY fix failed');
    }
    
    // Test 2: Age group query with CASE expression
    const ageGroupQuery = `
        SELECT
          CASE
            WHEN m.age < 18 THEN 'Under 18'
            WHEN m.age < 25 THEN '18-24'
            WHEN m.age < 35 THEN '25-34'
            WHEN m.age < 45 THEN '35-44'
            WHEN m.age < 55 THEN '45-54'
            WHEN m.age < 65 THEN '55-64'
            ELSE '65+'
          END as age_group,
          COUNT(*) as member_count
        FROM members m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        WHERE 1=1
        AND m.age IS NOT NULL
        GROUP BY age_group
        ORDER BY
          CASE age_group
            WHEN 'Under 18' THEN 1
            WHEN '18-24' THEN 2
            WHEN '25-34' THEN 3
            WHEN '35-44' THEN 4
            WHEN '45-54' THEN 5
            WHEN '55-64' THEN 6
            WHEN '65+' THEN 7
          END
    `;
    
    const converted2 = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(ageGroupQuery) : ageGroupQuery;
    
    console.log('\n=== Test 2: Age Group CASE Expression ===');
    console.log('Original GROUP BY:', 'GROUP BY age_group');
    console.log('Converted has CASE in GROUP BY:', converted2.includes('GROUP BY CASE'));
    
    const hasFixedGroupBy = !converted2.includes('GROUP BY age_group') && 
                           converted2.includes('GROUP BY CASE');
    
    if (hasFixedGroupBy) {
      console.log('✅ CASE expression alias in GROUP BY fixed');
    } else {
      console.log('❌ CASE expression alias in GROUP BY fix failed');
    }
    
    console.log('\n🎉 Advanced GROUP BY testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testAdvancedGroupByFixes();
