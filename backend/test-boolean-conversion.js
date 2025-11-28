/**
 * Test boolean conversion in SQL Migration Service
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

function testBooleanConversion() {
  console.log('🔧 Testing boolean conversion...');
  
  // Test 1: Simple boolean conversion
  const testQuery1 = "SELECT * FROM table WHERE is_active = 1";
  console.log('\nTest 1: Simple boolean');
  console.log('Original:', testQuery1);
  const converted1 = SQLMigrationService.convertComplexMySQLQuery(testQuery1);
  console.log('Converted:', converted1);
  console.log('✅ Boolean converted:', converted1.includes('= true') ? 'YES' : 'NO');
  
  // Test 2: Table prefix boolean conversion
  const testQuery2 = "SELECT * FROM table WHERE vd.is_active = 1";
  console.log('\nTest 2: Table prefix boolean');
  console.log('Original:', testQuery2);
  const converted2 = SQLMigrationService.convertComplexMySQLQuery(testQuery2);
  console.log('Converted:', converted2);
  console.log('✅ Boolean converted:', converted2.includes('= true') ? 'YES' : 'NO');
  
  // Test 3: Complex query with boolean
  const testQuery3 = `
    SELECT vd.voting_district_code as id
    FROM voting_districts vd
    WHERE vd.is_active = 1
    AND vd.voting_district_name LIKE ?
  `;
  console.log('\nTest 3: Complex query with boolean');
  console.log('Original:', testQuery3);
  const converted3 = SQLMigrationService.convertComplexMySQLQuery(testQuery3);
  console.log('Converted:', converted3);
  console.log('✅ Boolean converted:', converted3.includes('= true') ? 'YES' : 'NO');
  console.log('✅ Parameter converted:', converted3.includes('$1') ? 'YES' : 'NO');
  
  // Test 4: Multiple boolean conditions
  const testQuery4 = "SELECT * FROM table WHERE vd.is_active = 1 AND vs.is_active = 0";
  console.log('\nTest 4: Multiple boolean conditions');
  console.log('Original:', testQuery4);
  const converted4 = SQLMigrationService.convertComplexMySQLQuery(testQuery4);
  console.log('Converted:', converted4);
  console.log('✅ True conversion:', converted4.includes('= true') ? 'YES' : 'NO');
  console.log('✅ False conversion:', converted4.includes('= false') ? 'YES' : 'NO');
  
  console.log('\n🎯 BOOLEAN CONVERSION TEST COMPLETE!');
}

testBooleanConversion();
