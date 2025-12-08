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
    console.log('🔧 Fixing birthday views to use members_consolidated...\n');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix-birthday-views.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL script...');
    
    // Execute the SQL
    const result = await pool.query(sql);
    
    console.log('✅ Birthday views fixed successfully!\n');
    
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
    
    // Get detailed counts
    console.log('\n📊 Detailed Statistics:\n');
    
    const todaysCount = await pool.query('SELECT COUNT(*) as count FROM vw_todays_birthdays');
    console.log(`✅ Today's birthdays: ${todaysCount.rows[0].count}`);
    
    const upcomingCount = await pool.query('SELECT COUNT(*) as count FROM vw_upcoming_birthdays');
    console.log(`✅ Upcoming birthdays (next 7 days): ${upcomingCount.rows[0].count}`);
    
    // Get sample data from today's birthdays
    if (parseInt(todaysCount.rows[0].count) > 0) {
      console.log('\n📋 Sample from today\'s birthdays:');
      const sample = await pool.query('SELECT member_id, first_name, last_name, phone_number, age FROM vw_todays_birthdays LIMIT 5');
      console.table(sample.rows);
    }
    
    console.log('\n✅ Fix complete! Birthday SMS should now show data.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

runFix();

