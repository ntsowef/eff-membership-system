/**
 * Debug TIMESTAMPDIFF conversion step by step
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

function debugTimestampdiffConversion() {
  console.log('🔍 Debugging TIMESTAMPDIFF conversion...');
  
  // Test simple cases first
  const testCases = [
    {
      name: 'Simple TIMESTAMPDIFF MONTH',
      mysql: 'SELECT TIMESTAMPDIFF(MONTH, start_date, end_date) as months'
    },
    {
      name: 'TIMESTAMPDIFF with NOW()',
      mysql: 'SELECT TIMESTAMPDIFF(MONTH, start_date, NOW()) as months'
    },
    {
      name: 'TIMESTAMPDIFF with COALESCE',
      mysql: 'SELECT TIMESTAMPDIFF(MONTH, start_date, COALESCE(end_date, NOW())) as months'
    },
    {
      name: 'Full leadership query',
      mysql: `SELECT
              lp.position_name,
              AVG(TIMESTAMPDIFF(MONTH, la.start_date, COALESCE(la.end_date, NOW()))) as average_tenure_months,
              COUNT(CASE WHEN la.appointment_status = 'Active' THEN 1 END) as current_appointments
            FROM leadership_positions lp
            LEFT JOIN leadership_appointments la ON lp.id = la.position_id
            WHERE lp.is_active = TRUE
            GROUP BY lp.id, lp.position_name
            ORDER BY average_tenure_months DESC`
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log('MySQL:', testCase.mysql);
    
    try {
      const converted = SQLMigrationService.convertComplexMySQLQuery(testCase.mysql);
      console.log('PostgreSQL:', converted);
      
      // Check if conversion looks correct
      if (converted.includes('TIMESTAMPDIFF')) {
        console.log('❌ TIMESTAMPDIFF not converted!');
      } else if (converted.includes('NOW(')) {
        console.log('⚠️  NOW() not fully converted!');
      } else if (converted.includes('EXTRACT(EPOCH')) {
        console.log('✅ Conversion looks good!');
      } else {
        console.log('❓ Conversion unclear');
      }
      
    } catch (error) {
      console.log('❌ Conversion failed:', error.message);
    }
  });
  
  // Test the regex patterns directly
  console.log('\n🔧 Testing regex patterns directly...');
  
  const directTests = [
    'TIMESTAMPDIFF(MONTH, start_date, end_date)',
    'TIMESTAMPDIFF(MONTH, la.start_date, NOW())',
    'TIMESTAMPDIFF(MONTH, la.start_date, COALESCE(la.end_date, NOW()))'
  ];
  
  directTests.forEach((test, index) => {
    console.log(`\nDirect test ${index + 1}: ${test}`);
    
    // Test the regex pattern
    const regex = /TIMESTAMPDIFF\(\s*MONTH\s*,\s*([^,]+),\s*([^)]+)\)/gi;
    const match = regex.exec(test);
    
    if (match) {
      console.log('✅ Regex matched!');
      console.log('  Start date:', match[1]);
      console.log('  End date:', match[2]);
      
      // Apply the conversion logic
      let cleanStart = match[1].trim().replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
      let cleanEnd = match[2].trim().replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
      const result = `EXTRACT(EPOCH FROM (${cleanEnd} - ${cleanStart})) / 2629746`;
      console.log('  Converted:', result);
    } else {
      console.log('❌ Regex did not match!');
    }
  });
}

debugTimestampdiffConversion();
