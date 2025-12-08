const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function runFix() {
  try {
    console.log('🔧 Fixing leadership_appointments foreign key constraints...\n');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix-leadership-appointments-fk.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL script...');
    
    // Execute the SQL
    const result = await pool.query(sql);
    
    console.log('✅ Foreign key constraints fixed successfully!\n');
    
    // Show the results
    console.log('📊 Verification Results:');
    console.log('========================\n');
    
    // The result will contain multiple result sets
    if (Array.isArray(result)) {
      result.forEach((r, index) => {
        if (r.rows && r.rows.length > 0) {
          console.log(`Result set ${index + 1}:`);
          console.table(r.rows);
          console.log('');
        }
      });
    } else if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
    }
    
    console.log('\n✅ Fix complete! You can now create leadership appointments.');
    console.log('\n📝 Note: Make sure to use a valid user_id (e.g., 8571) for appointed_by field.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

runFix();

