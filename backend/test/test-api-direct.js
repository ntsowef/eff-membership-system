// Test the monthly stats API directly
const { Client } = require('pg');

async function testAPI() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Test the exact query used in the API
    const result = await client.query(`
      SELECT
        birth_month,
        month_name,
        total_birthdays::INTEGER,
        good_standing_count::INTEGER,
        sms_eligible_count::INTEGER,
        not_good_standing_count::INTEGER,
        no_phone_count::INTEGER,
        good_standing_percentage::FLOAT,
        sms_eligible_percentage::FLOAT
      FROM vw_birthday_monthly_stats
      ORDER BY birth_month
    `);

    console.log('\nQuery returned', result.rows.length, 'rows');
    console.log('\nFirst row:', JSON.stringify(result.rows[0], null, 2));

    // Calculate totals like the API does
    const totals = {
      total_birthdays: 0,
      good_standing_count: 0,
      sms_eligible_count: 0,
      not_good_standing_count: 0,
      no_phone_count: 0
    };

    result.rows.forEach((row) => {
      totals.total_birthdays += row.total_birthdays;
      totals.good_standing_count += row.good_standing_count;
      totals.sms_eligible_count += row.sms_eligible_count;
      totals.not_good_standing_count += row.not_good_standing_count;
      totals.no_phone_count += row.no_phone_count;
    });

    console.log('\nTotals:', JSON.stringify(totals, null, 2));

    // Format response like the API
    const response = {
      success: true,
      data: {
        monthly_stats: result.rows,
        totals: {
          ...totals,
          good_standing_percentage: totals.total_birthdays > 0
            ? Math.round((totals.good_standing_count / totals.total_birthdays) * 10000) / 100
            : 0,
          sms_eligible_percentage: totals.total_birthdays > 0
            ? Math.round((totals.sms_eligible_count / totals.total_birthdays) * 10000) / 100
            : 0
        }
      }
    };

    console.log('\nAPI Response format:');
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testAPI();

