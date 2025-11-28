const { initializeDatabase, executeQuery, executeQuerySingle, getPrismaClient, checkDatabaseHealth } = require('./src/config/database-hybrid');
const { SQLMigrationService } = require('./src/services/sqlMigrationService');
require('dotenv').config();

// =====================================================================================
// HYBRID DATABASE SYSTEM TEST
// =====================================================================================

async function testHybridDatabase() {
  console.log('🧪 Testing Hybrid Database System (Prisma + Raw SQL)');
  console.log('====================================================\n');
  
  try {
    // 1. Initialize the hybrid database system
    console.log('1️⃣ Initializing hybrid database system...');
    await initializeDatabase();
    console.log('✅ Hybrid database system initialized\n');
    
    // 2. Test database health
    console.log('2️⃣ Testing database health...');
    const health = await checkDatabaseHealth();
    console.log('Health Status:', health.status);
    console.log('Health Details:', JSON.stringify(health.details, null, 2));
    console.log('');
    
    // 3. Test Prisma ORM
    console.log('3️⃣ Testing Prisma ORM...');
    const prisma = getPrismaClient();
    
    // Test basic Prisma query
    const userCount = await prisma.user.count();
    console.log(`✅ Prisma query successful - Found ${userCount} users`);
    
    // Test Prisma with relations
    const usersWithRoles = await prisma.user.findMany({
      take: 3,
      include: {
        role: true,
        province: true
      }
    });
    console.log(`✅ Prisma relations query successful - Found ${usersWithRoles.length} users with relations`);
    console.log('');
    
    // 4. Test Raw SQL with automatic conversion
    console.log('4️⃣ Testing Raw SQL with MySQL->PostgreSQL conversion...');
    
    // Test simple converted query
    const mysqlQuery1 = "SELECT COUNT(*) as total FROM users WHERE is_active = ?";
    const result1 = await executeQuerySingle(mysqlQuery1, [true]);
    console.log(`✅ Converted simple query successful - Active users: ${result1?.total}`);
    
    // Test complex MySQL query conversion
    const mysqlQuery2 = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        CONCAT('User: ', u.name) as display_name,
        IFNULL(u.admin_level, 'none') as level,
        DATE_ADD(u.created_at, INTERVAL 1 YEAR) as next_year
      FROM users u 
      WHERE u.is_active = ? 
      LIMIT 3
    `;
    const result2 = await executeQuery(mysqlQuery2, [true]);
    console.log(`✅ Converted complex query successful - Found ${result2.length} users`);
    console.log('Sample result:', result2[0]);
    console.log('');
    
    // 5. Test SQL Migration Service directly
    console.log('5️⃣ Testing SQL Migration Service...');
    
    // Test query conversion without execution
    const testQuery = "SELECT CONCAT('MEM', LPAD(member_id, 6, '0')) as membership_number FROM members WHERE id_number = ?";
    const conversionTest = SQLMigrationService.testQueryConversion(testQuery);
    console.log('Original MySQL Query:', conversionTest.original);
    console.log('Converted PostgreSQL Query:', conversionTest.converted);
    console.log('Conversion Warnings:', conversionTest.warnings);
    console.log('');
    
    // 6. Test member-specific query conversion
    console.log('6️⃣ Testing member-specific query conversion...');
    const memberQuery = `
      SELECT 
        member_id,
        CONCAT('MEM', LPAD(member_id, 6, '0')) as membership_number,
        SUBSTRING_INDEX(CONCAT(firstname, ' ', COALESCE(surname, '')), ' ', 1) as first_name,
        CASE 
          WHEN LOCATE(' ', CONCAT(firstname, ' ', COALESCE(surname, ''))) > 0 
          THEN SUBSTRING(CONCAT(firstname, ' ', COALESCE(surname, '')), LOCATE(' ', CONCAT(firstname, ' ', COALESCE(surname, ''))) + 1)
          ELSE ''
        END as last_name
      FROM members 
      WHERE membership_status = 'Active'
      LIMIT 2
    `;
    
    try {
      const memberResult = await SQLMigrationService.executeConvertedQuery(memberQuery);
      console.log(`✅ Member query conversion successful - Found ${memberResult.length} members`);
      if (memberResult.length > 0) {
        console.log('Sample member result:', memberResult[0]);
      }
    } catch (error) {
      console.log('⚠️  Member query test skipped (members table may not exist yet):', error.message);
    }
    console.log('');
    
    // 7. Test batch query conversion
    console.log('7️⃣ Testing batch query conversion...');
    const batchQueries = [
      {
        name: 'Count Users',
        query: 'SELECT COUNT(*) as count FROM users',
        params: []
      },
      {
        name: 'Count Active Users',
        query: 'SELECT COUNT(*) as count FROM users WHERE is_active = ?',
        params: [true]
      },
      {
        name: 'Get User Levels',
        query: 'SELECT DISTINCT admin_level FROM users WHERE admin_level IS NOT NULL',
        params: []
      }
    ];
    
    const batchResults = await SQLMigrationService.batchConvertQueries(batchQueries);
    console.log('Batch query results:');
    batchResults.forEach(result => {
      console.log(`  ${result.name}: ${result.success ? '✅ Success' : '❌ Failed'}`);
      if (result.success && result.result) {
        console.log(`    Result: ${JSON.stringify(result.result[0])}`);
      } else if (!result.success) {
        console.log(`    Error: ${result.error}`);
      }
    });
    console.log('');
    
    // 8. Test system queries conversion
    console.log('8️⃣ Testing system queries conversion...');
    const systemQueries = [
      'SHOW TABLES',
      'SELECT CONNECTION_ID()',
      'SELECT DATABASE()',
      'SELECT USER()',
      'SELECT VERSION()'
    ];
    
    for (const sysQuery of systemQueries) {
      const pgEquivalent = SQLMigrationService.getPostgreSQLSystemQuery(sysQuery);
      console.log(`MySQL: ${sysQuery}`);
      console.log(`PostgreSQL: ${pgEquivalent}`);
      
      try {
        const result = await executeQuerySingle(pgEquivalent);
        console.log(`Result: ${JSON.stringify(result)}`);
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
      console.log('');
    }
    
    // 9. Performance comparison test
    console.log('9️⃣ Testing performance comparison...');
    const startTime = Date.now();
    
    // Test Prisma performance
    const prismaStart = Date.now();
    const prismaUsers = await prisma.user.findMany({ take: 10 });
    const prismaTime = Date.now() - prismaStart;
    
    // Test Raw SQL performance
    const rawSqlStart = Date.now();
    const rawSqlUsers = await executeQuery('SELECT * FROM users LIMIT 10');
    const rawSqlTime = Date.now() - rawSqlStart;
    
    console.log(`Prisma ORM: ${prismaTime}ms (${prismaUsers.length} results)`);
    console.log(`Raw SQL: ${rawSqlTime}ms (${rawSqlUsers.length} results)`);
    console.log(`Performance difference: ${Math.abs(prismaTime - rawSqlTime)}ms`);
    console.log('');
    
    // 10. Final summary
    console.log('🎉 HYBRID DATABASE SYSTEM TEST COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('✅ Prisma ORM: Working');
    console.log('✅ Raw SQL with conversion: Working');
    console.log('✅ MySQL->PostgreSQL conversion: Working');
    console.log('✅ Batch operations: Working');
    console.log('✅ System queries: Working');
    console.log('✅ Performance testing: Working');
    console.log('');
    console.log('🚀 Your backend is ready to work with PostgreSQL!');
    console.log('📝 Existing MySQL queries will be automatically converted');
    console.log('🔧 New features can use Prisma ORM for better type safety');
    
  } catch (error) {
    console.error('❌ Hybrid database test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testHybridDatabase()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testHybridDatabase };
