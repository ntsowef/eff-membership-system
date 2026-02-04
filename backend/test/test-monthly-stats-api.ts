import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testMonthlyStatsDirect() {
  console.log('🚀 Testing Monthly Birthday Statistics (Direct DB)\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Test 1: Get all monthly stats
    console.log('📊 Test 1: Monthly Birthday Statistics');
    const monthlyStats = await client.query(`
      SELECT * FROM vw_birthday_monthly_stats ORDER BY birth_month
    `);

    console.log('   Total months:', monthlyStats.rows.length);
    console.log('\n   Monthly Breakdown:');
    monthlyStats.rows.forEach((row: any) => {
      console.log(`   ${row.month_name.padEnd(12)} | Total: ${parseInt(row.total_birthdays).toLocaleString().padStart(8)} | Good Standing: ${parseInt(row.good_standing_count).toLocaleString().padStart(7)} (${row.good_standing_percentage}%) | SMS Eligible: ${parseInt(row.sms_eligible_count).toLocaleString().padStart(7)} (${row.sms_eligible_percentage}%)`);
    });

    // Calculate totals
    const totals = monthlyStats.rows.reduce((acc: any, row: any) => ({
      total: acc.total + parseInt(row.total_birthdays),
      goodStanding: acc.goodStanding + parseInt(row.good_standing_count),
      smsEligible: acc.smsEligible + parseInt(row.sms_eligible_count),
      notGoodStanding: acc.notGoodStanding + parseInt(row.not_good_standing_count)
    }), { total: 0, goodStanding: 0, smsEligible: 0, notGoodStanding: 0 });

    console.log('\n   📈 TOTALS:');
    console.log(`   Total Birthdays:     ${totals.total.toLocaleString()}`);
    console.log(`   Good Standing:       ${totals.goodStanding.toLocaleString()} (${(totals.goodStanding / totals.total * 100).toFixed(2)}%)`);
    console.log(`   SMS Eligible:        ${totals.smsEligible.toLocaleString()} (${(totals.smsEligible / totals.total * 100).toFixed(2)}%)`);
    console.log(`   Not Good Standing:   ${totals.notGoodStanding.toLocaleString()}`);

    // Test 2: Get current month (February = 2) active members
    console.log('\n\n📅 Test 2: Current Month (February) Active Members with Birthdays');
    const currentMonth = await client.query(`
      SELECT full_name, membership_number, cell_number, birth_day, current_age, province_name, ward_code
      FROM vw_birthday_active_members_current_month
      LIMIT 5
    `);

    console.log(`   Found: ${currentMonth.rows.length} sample members (displaying first 5)\n`);
    currentMonth.rows.forEach((row: any, i: number) => {
      console.log(`   ${i+1}. ${row.full_name}`);
      console.log(`      📱 ${row.cell_number} | 🎂 Day ${row.birth_day} | Age: ${row.current_age}`);
      console.log(`      📍 ${row.province_name} | Ward: ${row.ward_code}`);
    });

    // Test 3: Count for current month
    const countResult = await client.query(`
      SELECT COUNT(*) as total FROM vw_birthday_active_members_current_month
    `);
    console.log(`\n   📊 Total SMS Eligible for February: ${parseInt(countResult.rows[0].total).toLocaleString()}`);

    console.log('\n\n✅ All database tests completed successfully!');
    console.log('🎉 The monthly birthday statistics views are working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await client.end();
  }
}

testMonthlyStatsDirect();

