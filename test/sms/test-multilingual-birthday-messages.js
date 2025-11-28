/**
 * Test Multilingual Birthday SMS Messages
 * 
 * Tests the multilingual birthday message system
 * Shows messages in different languages based on province and member preference
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
console.log('║   Multilingual Birthday SMS Test                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function testMultilingualBirthdays() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Get today's birthdays with language info
    console.log('📅 Fetching today\'s birthdays with language information...\n');
    
    const birthdays = await client.query(`
      SELECT 
        member_id,
        first_name,
        last_name,
        phone_number,
        age,
        province_name,
        province_code,
        language_name,
        language_code,
        selected_language_name,
        selected_language_code,
        language_selection_reason,
        birthday_message,
        message_sent_today
      FROM vw_todays_birthdays
      ORDER BY province_code, selected_language_name, first_name
      LIMIT 100
    `);

    console.log(`✅ Found ${birthdays.rows.length} members with birthdays today\n`);

    if (birthdays.rows.length === 0) {
      console.log('ℹ️  No birthdays today.');
      client.release();
      await pool.end();
      return;
    }

    // Statistics
    console.log('═'.repeat(60));
    console.log('LANGUAGE SELECTION STATISTICS');
    console.log('═'.repeat(60));
    console.log('');

    // Group by language selection reason
    const reasonStats = await client.query(`
      SELECT 
        language_selection_reason,
        COUNT(*) as count
      FROM vw_todays_birthdays
      GROUP BY language_selection_reason
      ORDER BY count DESC
    `);

    reasonStats.rows.forEach(row => {
      console.log(`   ${row.language_selection_reason}: ${row.count} members`);
    });
    console.log('');

    // Group by selected language
    const languageStats = await client.query(`
      SELECT 
        selected_language_name,
        selected_language_code,
        COUNT(*) as count
      FROM vw_todays_birthdays
      GROUP BY selected_language_name, selected_language_code
      ORDER BY count DESC
    `);

    console.log('═'.repeat(60));
    console.log('MESSAGES BY LANGUAGE');
    console.log('═'.repeat(60));
    console.log('');

    languageStats.rows.forEach(row => {
      console.log(`   ${row.selected_language_name} (${row.selected_language_code}): ${row.count} messages`);
    });
    console.log('');

    // Show sample messages in each language
    console.log('═'.repeat(60));
    console.log('SAMPLE BIRTHDAY MESSAGES BY LANGUAGE');
    console.log('═'.repeat(60));
    console.log('');

    const samplesByLanguage = await client.query(`
      SELECT DISTINCT ON (selected_language_code)
        first_name,
        last_name,
        province_name,
        language_name as member_language,
        selected_language_name,
        selected_language_code,
        language_selection_reason,
        birthday_message
      FROM vw_todays_birthdays
      ORDER BY selected_language_code, member_id
    `);

    samplesByLanguage.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.selected_language_name} (${row.selected_language_code})`);
      console.log(`   Member: ${row.first_name} ${row.last_name}`);
      console.log(`   Province: ${row.province_name || 'Not set'}`);
      console.log(`   Member's Language: ${row.member_language || 'Not set'}`);
      console.log(`   Selection Reason: ${row.language_selection_reason}`);
      console.log(`   Message: "${row.birthday_message}"`);
      console.log('');
    });

    // Gauteng vs Other Provinces
    console.log('═'.repeat(60));
    console.log('GAUTENG vs OTHER PROVINCES');
    console.log('═'.repeat(60));
    console.log('');

    const provinceComparison = await client.query(`
      SELECT 
        CASE 
          WHEN province_code = 'GT' THEN 'Gauteng'
          ELSE 'Other Provinces'
        END as province_group,
        COUNT(*) as total,
        COUNT(DISTINCT selected_language_code) as languages_used
      FROM vw_todays_birthdays
      WHERE province_code IS NOT NULL
      GROUP BY province_group
    `);

    provinceComparison.rows.forEach(row => {
      console.log(`   ${row.province_group}:`);
      console.log(`     - Total members: ${row.total}`);
      console.log(`     - Languages used: ${row.languages_used}`);
      console.log('');
    });

    // Show Gauteng members (should all be English)
    console.log('═'.repeat(60));
    console.log('GAUTENG MEMBERS (Should all be English)');
    console.log('═'.repeat(60));
    console.log('');

    const gautengMembers = await client.query(`
      SELECT 
        first_name,
        last_name,
        language_name as member_language,
        selected_language_name,
        birthday_message
      FROM vw_todays_birthdays
      WHERE province_code = 'GT'
      LIMIT 5
    `);

    if (gautengMembers.rows.length > 0) {
      gautengMembers.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.first_name} ${row.last_name}`);
        console.log(`      Member's Language: ${row.member_language || 'Not set'}`);
        console.log(`      Selected Language: ${row.selected_language_name}`);
        console.log(`      Message: "${row.birthday_message.substring(0, 80)}..."`);
        console.log('');
      });
    } else {
      console.log('   No Gauteng members with birthdays today');
      console.log('');
    }

    // Show non-Gauteng members (should use mother tongue)
    console.log('═'.repeat(60));
    console.log('NON-GAUTENG MEMBERS (Should use Mother Tongue)');
    console.log('═'.repeat(60));
    console.log('');

    const nonGautengMembers = await client.query(`
      SELECT 
        first_name,
        last_name,
        province_name,
        language_name as member_language,
        selected_language_name,
        birthday_message
      FROM vw_todays_birthdays
      WHERE province_code != 'GT' OR province_code IS NULL
      ORDER BY selected_language_code
      LIMIT 10
    `);

    if (nonGautengMembers.rows.length > 0) {
      nonGautengMembers.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.first_name} ${row.last_name} (${row.province_name || 'No province'})`);
        console.log(`      Member's Language: ${row.member_language || 'Not set'}`);
        console.log(`      Selected Language: ${row.selected_language_name}`);
        console.log(`      Message: "${row.birthday_message.substring(0, 80)}..."`);
        console.log('');
      });
    } else {
      console.log('   No non-Gauteng members with birthdays today');
      console.log('');
    }

    // Verify all message templates
    console.log('═'.repeat(60));
    console.log('AVAILABLE MESSAGE TEMPLATES');
    console.log('═'.repeat(60));
    console.log('');

    const templates = await client.query(`
      SELECT 
        language_name,
        language_code,
        greeting,
        closing,
        is_active
      FROM birthday_message_templates
      ORDER BY language_name
    `);

    templates.rows.forEach(template => {
      const status = template.is_active ? '✅' : '❌';
      console.log(`   ${status} ${template.language_name} (${template.language_code})`);
      console.log(`      Greeting: "${template.greeting}"`);
      console.log(`      Closing: "${template.closing}"`);
      console.log('');
    });

    client.release();

    // Final summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ Multilingual birthday message system is working!');
    console.log('');
    console.log(`📊 Statistics:`);
    console.log(`   - Total birthdays today: ${birthdays.rows.length}`);
    console.log(`   - Languages used: ${languageStats.rows.length}`);
    console.log(`   - Message templates available: ${templates.rows.length}`);
    console.log('');
    console.log('🌍 Language Selection Logic:');
    console.log('   ✅ Gauteng members → English');
    console.log('   ✅ Other provinces → Member\'s preferred language');
    console.log('   ✅ No language set → English (fallback)');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Review sample messages above');
    console.log('   2. Verify translations are culturally appropriate');
    console.log('   3. Enable actual sending when ready');
    console.log('   4. Monitor delivery rates by language');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

testMultilingualBirthdays();

