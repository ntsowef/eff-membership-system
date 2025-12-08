/**
 * Test Database Connection to eff_membership_database
 * This script tests the connection to the new PostgreSQL database
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '../backend/.env' });

async function testConnection() {
  console.log('🔍 Testing PostgreSQL Connection to New Database...\n');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'eff_admin',
    password: process.env.DB_PASSWORD || 'Frames!123',
    database: process.env.DB_NAME || 'eff_membership_database',
    connectionTimeoutMillis: 5000,
  });
  
  try {
    console.log('📋 Connection Configuration:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'eff_membership_database'}`);
    console.log(`   User: ${process.env.DB_USER || 'eff_admin'}`);
    console.log('');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');
    
    // Test query - Check database name
    const dbResult = await client.query('SELECT current_database()');
    console.log(`📊 Current Database: ${dbResult.rows[0].current_database}`);
    
    // Check if members table exists
    const membersCheck = await client.query(`
      SELECT COUNT(*) as count FROM members LIMIT 1
    `);
    console.log(`✅ Members table accessible: ${membersCheck.rows[0].count} records found`);
    
    // Check if members_consolidated table exists
    const consolidatedCheck = await client.query(`
      SELECT COUNT(*) as count FROM members_consolidated LIMIT 1
    `);
    console.log(`✅ Members_consolidated table accessible: ${consolidatedCheck.rows[0].count} records found`);
    
    // Check if membership_history table exists
    const membershipCheck = await client.query(`
      SELECT COUNT(*) as count FROM membership_history LIMIT 1
    `);
    console.log(`✅ Membership_history table accessible: ${membershipCheck.rows[0].count} records found`);
    
    // Check views
    const viewsCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vw_%'
    `);
    console.log(`✅ Views available: ${viewsCheck.rows[0].count} views found`);
    
    // Test a sample query from members
    const sampleMember = await client.query(`
      SELECT 
        member_id, 
        firstname, 
        surname, 
        membership_number,
        membership_status_id
      FROM members 
      LIMIT 1
    `);
    
    if (sampleMember.rows.length > 0) {
      console.log('\n📝 Sample Member Record:');
      console.log(`   ID: ${sampleMember.rows[0].member_id}`);
      console.log(`   Name: ${sampleMember.rows[0].firstname} ${sampleMember.rows[0].surname}`);
      console.log(`   Membership #: ${sampleMember.rows[0].membership_number || 'N/A'}`);
      console.log(`   Status ID: ${sampleMember.rows[0].membership_status_id || 'N/A'}`);
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ All tests passed! Database is ready for use.');
    console.log('\n🎉 Migration to eff_membership_database successful!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('Code:', error.code);
    await pool.end();
    process.exit(1);
  }
}

testConnection();

