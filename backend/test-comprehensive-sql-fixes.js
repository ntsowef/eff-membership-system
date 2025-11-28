/**
 * Comprehensive test of all SQL conversion fixes
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testComprehensiveSQLFixes() {
  console.log('🔍 Testing comprehensive SQL conversion fixes...');
  
  const tests = [
    {
      name: 'ORDER BY with GROUP BY fix',
      query: `
        SELECT DATE_FORMAT(ms.date_joined, '%Y-%m') as month_year, COUNT(*) as total
        FROM memberships ms
        GROUP BY DATE_FORMAT(ms.date_joined, '%Y-%m')
        ORDER BY ms.date_joined DESC
      `,
      expectedContains: ['ORDER BY TO_CHAR(ms.date_joined, \'YYYY-MM\') DESC'],
      expectedNotContains: ['ORDER BY TO_CHAR(ms.date_joined DESC']
    },
    {
      name: 'NULLIF function preservation',
      query: `
        SELECT NULLIF(m.phone, '') as phone, COUNT(*) as count
        FROM members m
        GROUP BY NULLIF(m.phone, '')
      `,
      expectedContains: ['NULLIF(m.phone, \'\')'],
      expectedNotContains: ['CASE WHEN m.phone = \'\' THEN NULL']
    },
    {
      name: 'Parameter placeholder conversion',
      query: `
        SELECT * FROM members WHERE age > ? AND province_code = ?
      `,
      expectedContains: ['WHERE age > $1 AND province_code = $2'],
      expectedNotContains: ['WHERE age > ? AND province_code = ?']
    },
    {
      name: 'DATE_SUB with parameters',
      query: `
        SELECT * FROM memberships WHERE date_joined >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      `,
      expectedContains: ['WHERE date_joined >= (CURRENT_DATE - ($1 || \' month\')::INTERVAL)'],
      expectedNotContains: ['INTERVAL $1 MONTH']
    },
    {
      name: 'Complex CASE expression in GROUP BY',
      query: `
        SELECT 
          CASE WHEN m.age < 18 THEN 'Under 18' WHEN m.age < 25 THEN '18-24' ELSE '25+' END as age_group,
          COUNT(*) as count
        FROM members m
        GROUP BY age_group
        ORDER BY age_group
      `,
      expectedContains: ['GROUP BY (CASE WHEN m.age < 18 THEN \'Under 18\' WHEN m.age < 25 THEN \'18-24\' ELSE \'25+\' END)'],
      expectedNotContains: ['GROUP BY age_group']
    },
    {
      name: 'Multiple MySQL function conversions',
      query: `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          MONTHNAME(created_at) as month_name,
          YEAR(created_at) as year,
          DATE(created_at) as date_only
        FROM test_table
      `,
      expectedContains: [
        'TO_CHAR(created_at, \'YYYY-MM\')',
        'TO_CHAR(created_at, \'Month\')',
        'EXTRACT(YEAR FROM created_at)',
        'created_at::DATE'
      ],
      expectedNotContains: ['DATE_FORMAT', 'MONTHNAME', 'YEAR(']
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    try {
      const converted = SQLMigrationService.convertComplexMySQLQuery ? 
        SQLMigrationService.convertComplexMySQLQuery(test.query) : test.query;
      
      let testPassed = true;
      
      // Check expected contains
      for (const expected of test.expectedContains) {
        if (!converted.includes(expected)) {
          console.log(`❌ Missing expected: "${expected}"`);
          testPassed = false;
        }
      }
      
      // Check expected not contains
      for (const notExpected of test.expectedNotContains) {
        if (converted.includes(notExpected)) {
          console.log(`❌ Found unexpected: "${notExpected}"`);
          testPassed = false;
        }
      }
      
      if (testPassed) {
        console.log(`✅ ${test.name} - PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name} - FAILED`);
        console.log('Converted query:', converted);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
    }
  }
  
  console.log(`\n📊 RESULTS: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SQL CONVERSION FIXES ARE WORKING CORRECTLY!');
    return true;
  } else {
    console.log('❌ Some SQL conversion fixes need attention');
    return false;
  }
}

// Run the comprehensive test
testComprehensiveSQLFixes().then(success => {
  if (success) {
    console.log('\n✅ Comprehensive SQL conversion testing completed successfully!');
    console.log('🚀 The hybrid MySQL-to-PostgreSQL system is working correctly!');
  } else {
    console.log('\n❌ Some issues remain in the SQL conversion system');
  }
});
