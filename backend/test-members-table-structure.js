/**
 * Test to check complete members table structure
 */

const { Pool } = require('pg');

async function testMembersTableStructure() {
  console.log('🔍 Testing complete members table structure...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Get complete members table structure
    console.log('\n1. Complete members table structure...');
    
    const structureQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'members'
      ORDER BY ordinal_position
    `;
    
    const columns = await pool.query(structureQuery);
    console.log('✅ Complete members table columns:');
    columns.rows.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for timestamp columns
    console.log('\n2. Looking for timestamp/date columns...');
    const timestampColumns = columns.rows.filter(col => 
      col.data_type.includes('timestamp') || 
      col.data_type.includes('date') ||
      col.column_name.includes('created') ||
      col.column_name.includes('updated')
    );
    
    console.log('✅ Timestamp/date related columns:');
    timestampColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check for membership-related columns
    console.log('\n3. Looking for membership-related columns...');
    const membershipColumns = columns.rows.filter(col => 
      col.column_name.includes('member') ||
      col.column_name.includes('join') ||
      col.column_name.includes('type') ||
      col.column_name.includes('status')
    );
    
    console.log('✅ Membership-related columns:');
    membershipColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Sample a few records to understand the data
    console.log('\n4. Sample member records...');
    
    const sampleQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        membership_type,
        created_at,
        updated_at
      FROM members 
      LIMIT 3
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    console.log('✅ Sample records:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.firstname} ${row.surname || ''} (ID: ${row.member_id})`);
      console.log(`      Type: ${row.membership_type}, Created: ${row.created_at}, Updated: ${row.updated_at}`);
    });
    
    console.log('\n🎯 MEMBERS TABLE STRUCTURE ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testMembersTableStructure();
