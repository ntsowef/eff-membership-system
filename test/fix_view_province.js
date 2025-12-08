const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function fixView() {
  try {
    console.log('Reading SQL file...\n');
    const sqlFile = path.join(__dirname, '..', 'database-recovery', 'fix_optimized_view_use_member_province.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Executing SQL to fix view...\n');
    const result = await pool.query(sql);
    
    console.log('✅ View fixed successfully!\n');
    console.log('Verification result:');
    console.log(result[result.length - 1].rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

fixView();

