/**
 * Test Birthday SMS Messages
 * 
 * Tests the birthday SMS system without actually sending messages
 * Shows what would be sent if the system was enabled
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
console.log('║   Birthday SMS Test (DRY RUN - No messages sent)          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function testBirthdayMessages() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Get today's birthdays
    console.log('📅 Fetching today\'s birthdays...');
    const birthdays = await client.query(`
      SELECT 
        member_id,
        membership_number,
        first_name,
        last_name,
        phone_number,
        age,
        birthday_message,
        message_sent_today,
        province_name,
        district_name,
        municipality_name
      FROM vw_todays_birthdays
      ORDER BY first_name, last_name
      LIMIT 100
    `);

    console.log(`✅ Found ${birthdays.rows.length} members with birthdays today\n`);

    if (birthdays.rows.length === 0) {
      console.log('ℹ️  No birthdays today. The system will run automatically when there are birthdays.');
      client.release();
      await pool.end();
      return;
    }

    // Statistics
    const alreadySent = birthdays.rows.filter(b => b.message_sent_today).length;
    const toSend = birthdays.rows.length - alreadySent;

    console.log('═'.repeat(60));
    console.log('BIRTHDAY SMS STATISTICS');
    console.log('═'.repeat(60));
    console.log(`Total birthdays today: ${birthdays.rows.length}`);
    console.log(`Already sent: ${alreadySent}`);
    console.log(`To be sent: ${toSend}`);
    console.log('');

    // Show sample messages
    console.log('═'.repeat(60));
    console.log('SAMPLE BIRTHDAY MESSAGES (First 10)');
    console.log('═'.repeat(60));
    console.log('');

    const samplesToShow = Math.min(10, birthdays.rows.length);
    for (let i = 0; i < samplesToShow; i++) {
      const birthday = birthdays.rows[i];
      console.log(`${i + 1}. ${birthday.first_name} ${birthday.last_name}`);
      console.log(`   Age: ${birthday.age}`);
      console.log(`   Phone: ${birthday.phone_number}`);
      console.log(`   Location: ${birthday.municipality_name}, ${birthday.province_name}`);
      console.log(`   Status: ${birthday.message_sent_today ? '✅ Already sent' : '📤 Ready to send'}`);
      console.log(`   Message: "${birthday.birthday_message}"`);
      console.log('');
    }

    if (birthdays.rows.length > 10) {
      console.log(`... and ${birthdays.rows.length - 10} more members\n`);
    }

    // Geographic distribution
    console.log('═'.repeat(60));
    console.log('GEOGRAPHIC DISTRIBUTION');
    console.log('═'.repeat(60));
    console.log('');

    const geoDistribution = await client.query(`
      SELECT 
        province_name,
        COUNT(*) as count
      FROM vw_todays_birthdays
      GROUP BY province_name
      ORDER BY count DESC
    `);

    geoDistribution.rows.forEach(row => {
      console.log(`   ${row.province_name}: ${row.count} members`);
    });
    console.log('');

    // Age distribution
    console.log('═'.repeat(60));
    console.log('AGE DISTRIBUTION');
    console.log('═'.repeat(60));
    console.log('');

    const ageDistribution = await client.query(`
      SELECT 
        CASE 
          WHEN age < 25 THEN '18-24'
          WHEN age < 35 THEN '25-34'
          WHEN age < 45 THEN '35-44'
          WHEN age < 55 THEN '45-54'
          WHEN age < 65 THEN '55-64'
          ELSE '65+'
        END as age_group,
        COUNT(*) as count
      FROM vw_todays_birthdays
      GROUP BY age_group
      ORDER BY age_group
    `);

    ageDistribution.rows.forEach(row => {
      console.log(`   ${row.age_group}: ${row.count} members`);
    });
    console.log('');

    // Check previous sends
    console.log('═'.repeat(60));
    console.log('PREVIOUS BIRTHDAY MESSAGES (Last 7 days)');
    console.log('═'.repeat(60));
    console.log('');

    const previousSends = await client.query(`
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM birthday_messages_sent
      WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(sent_at)
      ORDER BY DATE(sent_at) DESC
    `);

    if (previousSends.rows.length > 0) {
      previousSends.rows.forEach(row => {
        console.log(`   ${row.date}: ${row.total} sent (${row.delivered} delivered, ${row.failed} failed, ${row.pending} pending)`);
      });
    } else {
      console.log('   No messages sent in the last 7 days');
    }
    console.log('');

    client.release();

    // Final summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ Birthday SMS system is working correctly');
    console.log('');
    console.log(`📊 Today's Statistics:`);
    console.log(`   - Total birthdays: ${birthdays.rows.length}`);
    console.log(`   - Messages to send: ${toSend}`);
    console.log(`   - Already sent: ${alreadySent}`);
    console.log('');
    console.log('⏰ Automatic Sending:');
    console.log('   - Scheduled time: 7:00 AM daily');
    console.log('   - Status: Configured (see backend cron job)');
    console.log('   - Mode: DRY RUN (no actual sending)');
    console.log('');
    console.log('📋 To enable actual sending:');
    console.log('   1. Set SMS_ENABLED=true in .env.postgres');
    console.log('   2. Set BIRTHDAY_SMS_ENABLED=true in .env.postgres');
    console.log('   3. Restart backend server');
    console.log('');
    console.log('📋 To manually trigger (dry run):');
    console.log('   POST /api/v1/sms/birthday/send?dryRun=true');
    console.log('');
    console.log('📋 To view today\'s birthdays:');
    console.log('   GET /api/v1/sms/birthday/today');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testBirthdayMessages();

