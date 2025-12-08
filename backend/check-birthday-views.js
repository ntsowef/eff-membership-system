const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkBirthdayViews() {
  try {
    console.log('🔍 Checking birthday views...\n');
    
    // Check if views exist
    const viewsQuery = `
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name IN ('vw_todays_birthdays', 'vw_upcoming_birthdays')
      ORDER BY table_name
    `;
    
    const viewsResult = await pool.query(viewsQuery);
    
    if (viewsResult.rows.length === 0) {
      console.log('❌ No birthday views found!');
    } else {
      console.log(`✅ Found ${viewsResult.rows.length} birthday views:\n`);
      
      viewsResult.rows.forEach(view => {
        console.log(`📋 View: ${view.table_name}`);
        console.log('Definition:');
        console.log(view.view_definition);
        console.log('\n' + '='.repeat(80) + '\n');
      });
    }
    
    // Try to query the views
    console.log('🔍 Testing vw_todays_birthdays...\n');
    try {
      const todaysResult = await pool.query('SELECT COUNT(*) as count FROM vw_todays_birthdays');
      console.log(`✅ vw_todays_birthdays: ${todaysResult.rows[0].count} records`);
      
      // Get sample data
      const sampleResult = await pool.query('SELECT * FROM vw_todays_birthdays LIMIT 3');
      if (sampleResult.rows.length > 0) {
        console.log('\nSample data:');
        console.table(sampleResult.rows);
      }
    } catch (error) {
      console.error('❌ Error querying vw_todays_birthdays:', error.message);
    }
    
    console.log('\n🔍 Testing vw_upcoming_birthdays...\n');
    try {
      const upcomingResult = await pool.query('SELECT COUNT(*) as count FROM vw_upcoming_birthdays');
      console.log(`✅ vw_upcoming_birthdays: ${upcomingResult.rows[0].count} records`);
      
      // Get sample data
      const sampleResult = await pool.query('SELECT * FROM vw_upcoming_birthdays LIMIT 3');
      if (sampleResult.rows.length > 0) {
        console.log('\nSample data:');
        console.table(sampleResult.rows);
      }
    } catch (error) {
      console.error('❌ Error querying vw_upcoming_birthdays:', error.message);
    }
    
    // Check members_consolidated for birthdays
    console.log('\n🔍 Checking members_consolidated for birthday data...\n');
    const membersCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(date_of_birth) as members_with_dob,
        COUNT(CASE WHEN date_of_birth IS NOT NULL AND cell_number IS NOT NULL THEN 1 END) as members_with_dob_and_phone
      FROM members_consolidated
    `);
    
    console.log('Members Consolidated Stats:');
    console.table(membersCheck.rows);
    
    // Check if there are any birthdays today in members_consolidated
    const todaysBirthdaysCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
        AND cell_number IS NOT NULL
        AND cell_number != ''
    `);
    
    console.log(`\n📅 Birthdays today in members_consolidated: ${todaysBirthdaysCheck.rows[0].count}`);
    
    // Check upcoming birthdays (next 7 days)
    const upcomingBirthdaysCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE (
        (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) 
         AND EXTRACT(DAY FROM date_of_birth) >= EXTRACT(DAY FROM CURRENT_DATE))
        OR
        (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '7 days')
         AND EXTRACT(DAY FROM date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '7 days'))
      )
      AND cell_number IS NOT NULL
      AND cell_number != ''
    `);
    
    console.log(`📅 Upcoming birthdays (next 7 days) in members_consolidated: ${upcomingBirthdaysCheck.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

checkBirthdayViews();

