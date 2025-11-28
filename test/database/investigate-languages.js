/**
 * Investigate Languages in Database
 * 
 * Checks what languages are available and how members are distributed
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
console.log('║   Investigate Languages in Database                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function investigate() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check if languages table exists
    console.log('1️⃣  Checking languages table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'languages'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('   ❌ languages table does NOT exist\n');
      client.release();
      await pool.end();
      return;
    }

    console.log('   ✅ languages table exists\n');

    // Get all languages
    console.log('2️⃣  Available languages in database:');
    const languages = await client.query(`
      SELECT 
        language_id,
        language_name,
        language_code,
        is_active
      FROM languages
      ORDER BY language_name
    `);

    console.log(`   Total languages: ${languages.rows.length}\n`);
    languages.rows.forEach(lang => {
      const status = lang.is_active ? '✅' : '❌';
      console.log(`   ${status} ${lang.language_name} (${lang.language_code}) - ID: ${lang.language_id}`);
    });
    console.log('');

    // Check members table structure
    console.log('3️⃣  Checking members table for language_id field...');
    const memberColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'members'
      AND column_name IN ('language_id', 'firstname', 'surname', 'cell_number', 'date_of_birth', 'ward_code')
      ORDER BY column_name
    `);

    console.log('   Relevant columns:');
    memberColumns.rows.forEach(col => {
      console.log(`     - ${col.column_name} (${col.data_type})`);
    });
    console.log('');

    // Check language distribution among members
    console.log('4️⃣  Language distribution among members:');
    const memberLanguages = await client.query(`
      SELECT 
        l.language_name,
        l.language_code,
        COUNT(m.member_id) as member_count,
        ROUND(COUNT(m.member_id) * 100.0 / (SELECT COUNT(*) FROM members), 2) as percentage
      FROM members m
      LEFT JOIN languages l ON m.language_id = l.language_id
      GROUP BY l.language_name, l.language_code
      ORDER BY member_count DESC
    `);

    memberLanguages.rows.forEach(row => {
      const langName = row.language_name || 'NULL (No language set)';
      console.log(`   ${langName}: ${row.member_count} members (${row.percentage}%)`);
    });
    console.log('');

    // Check today's birthdays language distribution
    console.log('5️⃣  Language distribution for today\'s birthdays:');
    const birthdayLanguages = await client.query(`
      SELECT 
        l.language_name,
        l.language_code,
        COUNT(m.member_id) as birthday_count
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
      LEFT JOIN languages l ON m.language_id = l.language_id
      WHERE 
        EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
        AND mst.is_active = true
        AND m.cell_number IS NOT NULL
      GROUP BY l.language_name, l.language_code
      ORDER BY birthday_count DESC
    `);

    if (birthdayLanguages.rows.length > 0) {
      birthdayLanguages.rows.forEach(row => {
        const langName = row.language_name || 'NULL (No language set)';
        console.log(`   ${langName}: ${row.birthday_count} members`);
      });
    } else {
      console.log('   No birthdays today');
    }
    console.log('');

    // Check Gauteng vs other provinces
    console.log('6️⃣  Province distribution for today\'s birthdays:');
    const provinceDistribution = await client.query(`
      SELECT 
        p.province_name,
        p.province_code,
        COUNT(m.member_id) as birthday_count,
        CASE WHEN p.province_code = 'GT' THEN 'Gauteng (English)' ELSE 'Other (Mother Tongue)' END as language_rule
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE 
        EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
        AND mst.is_active = true
        AND m.cell_number IS NOT NULL
      GROUP BY p.province_name, p.province_code
      ORDER BY birthday_count DESC
    `);

    if (provinceDistribution.rows.length > 0) {
      provinceDistribution.rows.forEach(row => {
        const provinceName = row.province_name || 'NULL (No province)';
        console.log(`   ${provinceName}: ${row.birthday_count} members - ${row.language_rule}`);
      });
    } else {
      console.log('   No birthdays today');
    }
    console.log('');

    // Sample members with language info
    console.log('7️⃣  Sample members with language information:');
    const sampleMembers = await client.query(`
      SELECT 
        m.member_id,
        m.firstname,
        m.surname,
        l.language_name,
        l.language_code,
        p.province_name,
        p.province_code
      FROM members m
      LEFT JOIN languages l ON m.language_id = l.language_id
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE m.language_id IS NOT NULL
      LIMIT 10
    `);

    if (sampleMembers.rows.length > 0) {
      sampleMembers.rows.forEach(member => {
        console.log(`   ${member.firstname} ${member.surname} - ${member.language_name} (${member.province_name})`);
      });
    } else {
      console.log('   No members with language set');
    }
    console.log('');

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`✅ Languages table exists with ${languages.rows.length} languages`);
    console.log(`✅ Members table has language_id field`);
    console.log(`✅ Can implement multilingual birthday messages`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Create birthday message templates for each language');
    console.log('   2. Update vw_todays_birthdays view to include language info');
    console.log('   3. Implement language selection logic in birthdaySmsService.ts');
    console.log('   4. Test with members from different provinces and languages');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

investigate();

