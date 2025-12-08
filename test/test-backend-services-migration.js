/**
 * Test Backend Services with New Database
 * Verifies all backend services work correctly with eff_membership_database
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Import Prisma from backend
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database',
});

async function testMemberService() {
  console.log('\n📋 Testing Member Service...');
  
  try {
    // Test raw SQL query (as used in backend)
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        member_id, 
        firstname, 
        surname, 
        membership_number,
        membership_status_id,
        date_joined,
        expiry_date
      FROM members 
      WHERE membership_status_id IS NOT NULL
      LIMIT 5
    `);
    
    console.log(`   ✅ Raw SQL query successful: ${result.rows.length} members found`);
    
    // Test view query
    const viewResult = await client.query(`
      SELECT * FROM vw_member_details LIMIT 1
    `);
    console.log(`   ✅ View query successful: vw_member_details accessible`);
    
    client.release();
    
    // Test Prisma query
    const prismaMembers = await prisma.members.findMany({
      take: 5,
      where: {
        membership_status_id: { not: null }
      }
    });
    console.log(`   ✅ Prisma query successful: ${prismaMembers.length} members found`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Member Service test failed:`, error.message);
    return false;
  }
}

async function testMembershipService() {
  console.log('\n📋 Testing Membership Service...');
  
  try {
    const client = await pool.connect();
    
    // Test membership_history table
    const result = await client.query(`
      SELECT 
        membership_id,
        member_id,
        membership_number,
        date_joined,
        expiry_date,
        payment_status
      FROM membership_history 
      LIMIT 5
    `);
    console.log(`   ✅ Membership history query successful: ${result.rows.length} records found`);
    
    // Test memberships view (alias for membership_history)
    const viewResult = await client.query(`
      SELECT * FROM memberships LIMIT 1
    `);
    console.log(`   ✅ Memberships view accessible`);
    
    client.release();
    return true;
  } catch (error) {
    console.error(`   ❌ Membership Service test failed:`, error.message);
    return false;
  }
}

async function testConsolidatedTable() {
  console.log('\n📋 Testing Consolidated Table...');
  
  try {
    const client = await pool.connect();
    
    // Test members_consolidated table
    const result = await client.query(`
      SELECT 
        member_id,
        firstname,
        surname,
        membership_number,
        date_joined,
        expiry_date,
        payment_status
      FROM members_consolidated 
      LIMIT 5
    `);
    console.log(`   ✅ Members_consolidated query successful: ${result.rows.length} records found`);
    
    // Test consolidated views
    const viewResult = await client.query(`
      SELECT * FROM vw_member_details_consolidated LIMIT 1
    `);
    console.log(`   ✅ Consolidated views accessible`);
    
    client.release();

    // Note: Prisma model for members_consolidated is not needed since backend uses members table
    console.log(`   ℹ️  Prisma model for members_consolidated not required (backend uses members table)`);

    return true;
  } catch (error) {
    console.error(`   ❌ Consolidated Table test failed:`, error.message);
    return false;
  }
}

async function testGeographicData() {
  console.log('\n📋 Testing Geographic Data...');
  
  try {
    // Test provinces
    const provinces = await prisma.provinces.findMany({ take: 5 });
    console.log(`   ✅ Provinces accessible: ${provinces.length} found`);
    
    // Test wards
    const wards = await prisma.wards.findMany({ take: 5 });
    console.log(`   ✅ Wards accessible: ${wards.length} found`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Geographic Data test failed:`, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Backend Services Migration Tests');
  console.log('=' .repeat(60));
  
  const results = {
    memberService: await testMemberService(),
    membershipService: await testMembershipService(),
    consolidatedTable: await testConsolidatedTable(),
    geographicData: await testGeographicData(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(`   ${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Final Score: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Backend services are ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  await prisma.$disconnect();
  await pool.end();
  
  process.exit(passed === total ? 0 : 1);
}

runAllTests();

