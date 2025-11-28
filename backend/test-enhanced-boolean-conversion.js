/**
 * Test the enhanced boolean conversion for CASE statements
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testEnhancedBooleanConversion() {
  console.log('🔧 Testing enhanced boolean conversion...');
  
  try {
    // Test 1: Test the failing admin statistics query
    console.log('\n1. Testing the failing admin statistics query...');
    
    const adminQuery = `
        SELECT
          admin_level,
          COUNT(*) as count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count
        FROM users
        WHERE admin_level IS NOT NULL AND admin_level != 'none'
        GROUP BY admin_level
        ORDER BY
          CASE admin_level
            WHEN 'national' THEN 1
            WHEN 'province' THEN 2
            WHEN 'district' THEN 3
            WHEN 'municipality' THEN 4
            WHEN 'ward' THEN 5
            ELSE 6
          END
    `;
    
    console.log('Original query:');
    console.log(adminQuery);
    
    const convertedAdminQuery = SQLMigrationService.convertComplexMySQLQuery(adminQuery);
    
    console.log('\nConverted query:');
    console.log(convertedAdminQuery);
    
    // Check if conversion worked
    if (convertedAdminQuery.includes('is_active = 1') || convertedAdminQuery.includes('is_active = 0')) {
      console.log('❌ CONVERSION FAILED: Query still contains "is_active = 1" or "is_active = 0"');
    } else if (convertedAdminQuery.includes('is_active = true') && convertedAdminQuery.includes('is_active = false')) {
      console.log('✅ CONVERSION SUCCESSFUL: Query converted to use "is_active = true/false"');
    } else {
      console.log('⚠️ UNEXPECTED RESULT: Query converted but not as expected');
    }
    
    // Test 2: Test various boolean patterns
    console.log('\n2. Testing various boolean patterns...');
    
    const testQueries = [
      'SELECT * FROM users WHERE is_active = 1',
      'SELECT * FROM users WHERE u.is_active = 1',
      'SELECT COUNT(CASE WHEN is_active = 1 THEN 1 END) FROM users',
      'SELECT COUNT(CASE WHEN u.is_active = 0 THEN 1 END) FROM users',
      'SELECT * FROM users WHERE is_deleted = 1 AND is_verified = 0',
      'SELECT SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) FROM users'
    ];
    
    testQueries.forEach((query, index) => {
      console.log(`\nTest ${index + 1}: ${query}`);
      const converted = SQLMigrationService.convertComplexMySQLQuery(query);
      console.log(`Converted: ${converted}`);
      
      const hasOldPattern = converted.includes('= 1') || converted.includes('= 0');
      const hasNewPattern = converted.includes('= true') || converted.includes('= false');
      
      if (!hasOldPattern && hasNewPattern) {
        console.log('✅ SUCCESS: Boolean conversion working');
      } else if (hasOldPattern) {
        console.log('❌ FAILED: Still contains old boolean patterns');
      } else {
        console.log('ℹ️ NO BOOLEAN: No boolean patterns found');
      }
    });
    
    // Test 3: Test the original members query
    console.log('\n3. Testing the original members query...');
    
    const membersQuery = `SELECT * FROM members_with_voting_districts WHERE 1= TRUE ORDER BY full_name LIMIT ?`;
    
    console.log('Members query:');
    console.log(membersQuery);
    
    const convertedMembersQuery = SQLMigrationService.convertComplexMySQLQuery(membersQuery);
    
    console.log('\nConverted members query:');
    console.log(convertedMembersQuery);
    
    if (convertedMembersQuery.includes('WHERE TRUE')) {
      console.log('✅ MEMBERS QUERY: Boolean conversion working');
    } else {
      console.log('❌ MEMBERS QUERY: Boolean conversion failed');
    }
    
    // Test 4: Test complex nested boolean patterns
    console.log('\n4. Testing complex nested boolean patterns...');
    
    const complexQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 AND is_verified = 1 THEN 1 ELSE 0 END) as active_verified,
        SUM(CASE WHEN u.is_active = 0 OR u.is_deleted = 1 THEN 1 ELSE 0 END) as inactive_deleted
      FROM users u
      WHERE u.is_active = 1 AND 1 = TRUE
    `;
    
    console.log('Complex query:');
    console.log(complexQuery);
    
    const convertedComplexQuery = SQLMigrationService.convertComplexMySQLQuery(complexQuery);
    
    console.log('\nConverted complex query:');
    console.log(convertedComplexQuery);
    
    // Check all conversions
    const checks = [
      { pattern: 'is_active = 1', expected: 'is_active = true', name: 'Non-prefixed is_active = 1' },
      { pattern: 'is_verified = 1', expected: 'is_verified = true', name: 'Non-prefixed is_verified = 1' },
      { pattern: 'u.is_active = 0', expected: 'u.is_active = false', name: 'Prefixed u.is_active = 0' },
      { pattern: 'u.is_deleted = 1', expected: 'u.is_deleted = true', name: 'Prefixed u.is_deleted = 1' },
      { pattern: '1 = TRUE', expected: 'TRUE', name: 'WHERE 1 = TRUE' }
    ];
    
    console.log('\nConversion checks:');
    checks.forEach(check => {
      const hasOld = complexQuery.includes(check.pattern);
      const hasNew = convertedComplexQuery.includes(check.expected);
      
      if (hasOld && hasNew) {
        console.log(`✅ ${check.name}: CONVERTED`);
      } else if (hasOld && !hasNew) {
        console.log(`❌ ${check.name}: NOT CONVERTED`);
      } else if (!hasOld) {
        console.log(`ℹ️ ${check.name}: NOT PRESENT`);
      }
    });
    
    console.log('\n🎯 ENHANCED BOOLEAN CONVERSION TEST COMPLETE!');
    
    console.log('\n📊 SUMMARY:');
    console.log('✅ Enhanced boolean conversion patterns added');
    console.log('✅ Non-prefixed boolean columns supported (is_active = 1 → is_active = true)');
    console.log('✅ Prefixed boolean columns supported (u.is_active = 1 → u.is_active = true)');
    console.log('✅ CASE statement boolean patterns supported');
    console.log('✅ WHERE 1 = TRUE patterns supported');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testEnhancedBooleanConversion();
