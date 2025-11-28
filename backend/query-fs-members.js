const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function queryFSMembers() {
  try {
    console.log('🔍 Querying Free State (FS) members...\n');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_members
      FROM vw_member_details
      WHERE province_code = 'FS'
    `;
    const countResult = await pool.query(countQuery);
    console.log(`📊 Total Members in Free State: ${countResult.rows[0].total_members}\n`);

    // Get sample members
    const membersQuery = `
      SELECT
        member_id,
        CONCAT('MEM', LPAD(member_id::TEXT, 6, '0')) as membership_number,
        firstname,
        surname,
        COALESCE(email, 'N/A') as email,
        COALESCE(cell_number, 'N/A') as cell_number,
        province_name,
        district_name,
        municipality_name,
        ward_number,
        member_created_at
      FROM vw_member_details
      WHERE province_code = 'FS'
      ORDER BY member_created_at DESC
      LIMIT 10
    `;
    const membersResult = await pool.query(membersQuery);

    console.log('📋 Sample Members (First 10):');
    console.log('='.repeat(120));
    membersResult.rows.forEach((member, index) => {
      console.log(`\n${index + 1}. ${member.membership_number} - ${member.firstname} ${member.surname}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Phone: ${member.cell_number}`);
      console.log(`   Location: Ward ${member.ward_number}, ${member.municipality_name}, ${member.district_name}`);
      console.log(`   Joined: ${new Date(member.member_created_at).toLocaleDateString()}`);
    });

    // Get breakdown by district
    const districtQuery = `
      SELECT
        district_code,
        district_name,
        COUNT(*) as member_count
      FROM vw_member_details
      WHERE province_code = 'FS'
      GROUP BY district_code, district_name
      ORDER BY member_count DESC
    `;
    const districtResult = await pool.query(districtQuery);

    console.log('\n\n📊 Members by District/Region:');
    console.log('='.repeat(80));
    districtResult.rows.forEach((district, index) => {
      console.log(`${index + 1}. ${district.district_name} (${district.district_code}): ${district.member_count} members`);
    });

    // Get breakdown by municipality
    const municipalityQuery = `
      SELECT
        municipality_code,
        municipality_name,
        COUNT(*) as member_count
      FROM vw_member_details
      WHERE province_code = 'FS'
      GROUP BY municipality_code, municipality_name
      ORDER BY member_count DESC
      LIMIT 10
    `;
    const municipalityResult = await pool.query(municipalityQuery);

    console.log('\n\n📊 Top 10 Municipalities/Sub-Regions:');
    console.log('='.repeat(80));
    municipalityResult.rows.forEach((municipality, index) => {
      console.log(`${index + 1}. ${municipality.municipality_name} (${municipality.municipality_code}): ${municipality.member_count} members`);
    });

    // Get gender breakdown
    const genderQuery = `
      SELECT
        gender_name,
        COUNT(*) as member_count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM vw_member_details WHERE province_code = 'FS')), 2) as percentage
      FROM vw_member_details
      WHERE province_code = 'FS'
      GROUP BY gender_name
      ORDER BY member_count DESC
    `;
    const genderResult = await pool.query(genderQuery);

    console.log('\n\n📊 Members by Gender:');
    console.log('='.repeat(80));
    genderResult.rows.forEach((gender) => {
      console.log(`${gender.gender_name}: ${gender.member_count} (${gender.percentage}%)`);
    });

    // Get age statistics
    const ageQuery = `
      SELECT
        MIN(age) as min_age,
        MAX(age) as max_age,
        ROUND(AVG(age), 1) as avg_age,
        COUNT(CASE WHEN age < 35 THEN 1 END) as youth_count,
        COUNT(CASE WHEN age >= 35 AND age < 60 THEN 1 END) as middle_age_count,
        COUNT(CASE WHEN age >= 60 THEN 1 END) as senior_count
      FROM vw_member_details
      WHERE province_code = 'FS' AND age IS NOT NULL
    `;
    const ageResult = await pool.query(ageQuery);

    console.log('\n\n📊 Age Statistics:');
    console.log('='.repeat(80));
    const ageStats = ageResult.rows[0];
    console.log(`Age Range: ${ageStats.min_age} - ${ageStats.max_age} years`);
    console.log(`Average Age: ${ageStats.avg_age} years`);
    console.log(`Youth (< 35): ${ageStats.youth_count} members`);
    console.log(`Middle Age (35-59): ${ageStats.middle_age_count} members`);
    console.log(`Seniors (60+): ${ageStats.senior_count} members`);

    console.log('\n✅ Query completed successfully!\n');

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await pool.end();
  }
}

queryFSMembers();

