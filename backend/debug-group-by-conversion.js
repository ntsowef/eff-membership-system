/**
 * Debug the GROUP BY conversion issues
 */

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function debugGroupByConversion() {
  console.log('🔍 Debugging GROUP BY conversion issues...');
  
  try {
    // Test the membership trends query
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
    
    const converted = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(membershipTrendsQuery) : membershipTrendsQuery;
    
    console.log('=== FULL CONVERTED QUERY ===');
    console.log(converted);
    console.log('\n=== ANALYSIS ===');
    console.log('Contains GROUP BY:', converted.includes('GROUP BY'));
    console.log('Contains ORDER BY ms.date_joined:', converted.includes('ORDER BY ms.date_joined'));
    console.log('Contains TO_CHAR:', converted.includes('TO_CHAR'));
    
    // Test age group query
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
    
    console.log('\n=== AGE GROUP CONVERTED QUERY ===');
    console.log(converted2);
    console.log('\n=== AGE GROUP ANALYSIS ===');
    console.log('Contains CASE...END as age_group:', converted2.includes('END as age_group'));
    console.log('Contains GROUP BY age_group:', converted2.includes('GROUP BY age_group'));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

// Run the debug
debugGroupByConversion();
