/**
 * Test script to verify Prisma is working with the backend
 */

const { PrismaClient } = require('./src/generated/prisma');

async function testPrismaIntegration() {
  console.log('🧪 Testing Prisma Integration...\n');

  try {
    // Test 1: Initialize Prisma client
    console.log('1️⃣ Initializing Prisma client...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Prisma client connected successfully\n');

    // Test 2: Test basic Prisma queries
    console.log('2️⃣ Testing basic Prisma queries...');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`✅ User count query successful: ${userCount} users found`);

    // Count members
    const memberCount = await prisma.member.count();
    console.log(`✅ Member count query successful: ${memberCount} members found`);

    // Count roles
    const roleCount = await prisma.role.count();
    console.log(`✅ Role count query successful: ${roleCount} roles found`);

    // Test 3: Test Prisma relations
    console.log('\n3️⃣ Testing Prisma relations...');
    
    // Get users with roles (limit to 3 for testing)
    const usersWithRoles = await prisma.user.findMany({
      take: 3,
      include: {
        role: true,
        province: true,
        member: true
      }
    });
    console.log(`✅ Users with relations query successful: ${usersWithRoles.length} users with relations`);

    // Test 4: Test complex queries
    console.log('\n4️⃣ Testing complex Prisma queries...');

    // Get active users by admin level
    const adminUsers = await prisma.user.findMany({
      where: {
        is_active: true,
        admin_level: {
          not: null
        }
      },
      include: {
        role: true
      },
      take: 5
    });
    console.log(`✅ Complex query successful: ${adminUsers.length} active admin users found`);

    // Test 5: Test aggregation
    console.log('\n5️⃣ Testing Prisma aggregations...');

    const userStats = await prisma.user.aggregate({
      _count: {
        user_id: true
      },
      where: {
        is_active: true
      }
    });
    console.log(`✅ Aggregation query successful: ${userStats._count.user_id} active users`);

    // Test 6: Test raw queries through Prisma
    console.log('\n6️⃣ Testing raw queries through Prisma...');

    const rawResult = await prisma.$queryRaw`
      SELECT
        admin_level,
        COUNT(*) as user_count
      FROM users
      WHERE is_active = true
      GROUP BY admin_level
      LIMIT 5
    `;
    console.log(`✅ Raw query through Prisma successful: ${rawResult.length} results`);

    // Test 7: Test transactions
    console.log('\n7️⃣ Testing Prisma transactions...');

    const transactionResult = await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count();
      const memberCount = await tx.member.count();
      return { userCount, memberCount };
    });
    console.log(`✅ Transaction successful: ${transactionResult.userCount} users, ${transactionResult.memberCount} members`);

    // Disconnect Prisma client
    await prisma.$disconnect();

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ Prisma client initialization: SUCCESS');
    console.log('✅ Basic queries: SUCCESS');
    console.log('✅ Relations: SUCCESS');
    console.log('✅ Complex queries: SUCCESS');
    console.log('✅ Aggregations: SUCCESS');
    console.log('✅ Raw queries: SUCCESS');
    console.log('✅ Transactions: SUCCESS');

    console.log('\n🎉 Prisma is working perfectly with your backend!');
    console.log('\n📋 Available Features:');
    console.log('   • Type-safe database queries');
    console.log('   • Automatic relation loading');
    console.log('   • Complex filtering and sorting');
    console.log('   • Aggregations and grouping');
    console.log('   • Raw SQL query support');
    console.log('   • Transaction support');
    console.log('   • Connection pooling');
    console.log('   • Query optimization');
    console.log('   • Schema introspection');
    console.log('   • Migration support');

  } catch (error) {
    console.error('❌ Prisma test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPrismaIntegration();
