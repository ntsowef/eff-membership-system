/**
 * Verify Birthday Views and Tables
 * Checks if birthday system is properly set up
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Verify Birthday SMS System                               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function verify() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check table
    console.log('1️⃣  Checking birthday_messages_sent table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'birthday_messages_sent'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('   ✅ birthday_messages_sent table exists');
      const count = await client.query('SELECT COUNT(*) FROM birthday_messages_sent');
      console.log(`   Records: ${count.rows[0].count}`);
    } else {
      console.log('   ❌ birthday_messages_sent table does NOT exist');
    }
    console.log('');

    // Check vw_todays_birthdays
    console.log('2️⃣  Checking vw_todays_birthdays view...');
    const todaysViewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_todays_birthdays'
      );
    `);

    if (todaysViewCheck.rows[0].exists) {
      console.log('   ✅ vw_todays_birthdays view exists');
      const count = await client.query('SELECT COUNT(*) FROM vw_todays_birthdays');
      console.log(`   Today's birthdays: ${count.rows[0].count} members`);
      
      // Show sample
      if (parseInt(count.rows[0].count) > 0) {
        const sample = await client.query('SELECT * FROM vw_todays_birthdays LIMIT 3');
        console.log('');
        console.log('   Sample birthdays today:');
        sample.rows.forEach(row => {
          console.log(`     - ${row.first_name} ${row.last_name} (Age: ${row.age}, Phone: ${row.phone_number})`);
        });
      }
    } else {
      console.log('   ❌ vw_todays_birthdays view does NOT exist');
    }
    console.log('');

    // Check vw_upcoming_birthdays
    console.log('3️⃣  Checking vw_upcoming_birthdays view...');
    const upcomingViewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_upcoming_birthdays'
      );
    `);

    if (upcomingViewCheck.rows[0].exists) {
      console.log('   ✅ vw_upcoming_birthdays view exists');
      const count = await client.query('SELECT COUNT(*) FROM vw_upcoming_birthdays');
      console.log(`   Upcoming birthdays (next 7 days): ${count.rows[0].count} members`);
      
      // Show sample
      if (parseInt(count.rows[0].count) > 0) {
        const sample = await client.query('SELECT * FROM vw_upcoming_birthdays LIMIT 5');
        console.log('');
        console.log('   Sample upcoming birthdays:');
        sample.rows.forEach(row => {
          console.log(`     - ${row.first_name} ${row.last_name} (In ${row.days_until_birthday} days, Age: ${row.current_age})`);
        });
      }
    } else {
      console.log('   ❌ vw_upcoming_birthdays view does NOT exist');
    }
    console.log('');

    // Check vw_birthday_messages_stats
    console.log('4️⃣  Checking vw_birthday_messages_stats view...');
    const statsViewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_birthday_messages_stats'
      );
    `);

    if (statsViewCheck.rows[0].exists) {
      console.log('   ✅ vw_birthday_messages_stats view exists');
      const count = await client.query('SELECT COUNT(*) FROM vw_birthday_messages_stats');
      console.log(`   Stats records: ${count.rows[0].count} days`);
    } else {
      console.log('   ❌ vw_birthday_messages_stats view does NOT exist');
    }
    console.log('');

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    
    const allExist = tableCheck.rows[0].exists && 
                     todaysViewCheck.rows[0].exists && 
                     upcomingViewCheck.rows[0].exists && 
                     statsViewCheck.rows[0].exists;

    if (allExist) {
      console.log('✅ Birthday SMS system is fully set up!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. View today\'s birthdays:');
      console.log('      SELECT * FROM vw_todays_birthdays;');
      console.log('');
      console.log('   2. Test birthday SMS (without sending):');
      console.log('      node test/sms/test-birthday-messages.js');
      console.log('');
      console.log('   3. Configure cron job to run at 7am daily');
      console.log('      See: backend/src/services/birthdaySmsService.ts');
    } else {
      console.log('❌ Some components are missing!');
      console.log('');
      console.log('📋 To create missing components:');
      console.log('   node scripts/execute-sql-file.js database-recovery/create-birthday-views-and-tables.sql');
    }
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verify();

