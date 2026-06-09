const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkViewColumns() {
  try {
    console.log('Checking vw_ward_membership_audit columns:\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vw_ward_membership_audit' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    result.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
    console.log('\n\nExpected columns from routes:');
    const expected = [
      'ward_code', 'ward_name', 'municipality_code', 'municipality_name',
      'district_code', 'district_name', 'province_code', 'province_name',
      'active_members', 'expired_members', 'inactive_members', 'total_members',
      'ward_standing', 'standing_level', 'active_percentage',
      'target_achievement_percentage', 'members_needed_next_level', 'last_updated'
    ];
    expected.forEach(col => console.log(`  - ${col}`));
    
    // Check which columns are missing
    const currentCols = result.rows.map(r => r.column_name);
    const missing = expected.filter(col => !currentCols.includes(col));
    
    console.log('\n\nMissing columns:');
    if (missing.length === 0) {
      console.log('  None - all columns present!');
    } else {
      missing.forEach(col => console.log(`  ❌ ${col}`));
    }
    
    // Test query
    console.log('\n\nTesting view query...');
    const testResult = await pool.query('SELECT COUNT(*) as count FROM vw_ward_membership_audit');
    console.log(`Total rows in view: ${testResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkViewColumns();

