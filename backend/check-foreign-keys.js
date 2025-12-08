const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkForeignKeys() {
  try {
    console.log('🔍 Checking foreign key constraints referencing members table...\n');

    // Find all foreign keys that reference the members table
    const fkQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'members'
      ORDER BY tc.table_name;
    `;
    
    const fkResult = await pool.query(fkQuery);
    console.log('📊 Foreign keys referencing "members" table:');
    console.table(fkResult.rows);
    console.log(`\nTotal: ${fkResult.rows.length} foreign keys found\n`);

    // Check if member_id 765751 exists in members vs members_consolidated
    console.log('🔍 Checking member_id 765751...\n');
    
    const memberCheckQuery = `
      SELECT 
        (SELECT COUNT(*) FROM members WHERE member_id = 765751) as in_members,
        (SELECT COUNT(*) FROM members_consolidated WHERE member_id = 765751) as in_consolidated;
    `;
    const memberCheckResult = await pool.query(memberCheckQuery);
    console.log('📊 Member 765751 existence:');
    console.table(memberCheckResult.rows);
    console.log('');

    // Get sample member data
    const sampleQuery = `
      SELECT member_id, firstname, surname, province_code, district_code
      FROM members_consolidated 
      WHERE member_id = 765751;
    `;
    const sampleResult = await pool.query(sampleQuery);
    if (sampleResult.rows.length > 0) {
      console.log('📊 Member 765751 details from members_consolidated:');
      console.table(sampleResult.rows);
    }

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkForeignKeys();

