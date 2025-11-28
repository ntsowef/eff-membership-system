const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function checkAvailableProvinces() {
  console.log('🔍 Checking available provinces and municipalities...\n');

  try {
    // 1. Check available provinces
    console.log('1. Available provinces:');
    const provincesQuery = `
      SELECT DISTINCT province_code, province_name, COUNT(*) as ward_count
      FROM vw_ward_membership_audit
      WHERE province_code IS NOT NULL
      GROUP BY province_code, province_name
      ORDER BY ward_count DESC;
    `;
    
    const provincesResult = await pool.query(provincesQuery);
    console.table(provincesResult.rows);

    // 2. Check municipalities for a specific province (use the one with most wards)
    if (provincesResult.rows.length > 0) {
      const topProvince = provincesResult.rows[0];
      console.log(`\n2. Municipalities in ${topProvince.province_name} (${topProvince.province_code}):`);
      
      const municipalitiesQuery = `
        SELECT 
          municipality_code,
          municipality_name,
          district_code,
          district_name,
          COUNT(*) as ward_count,
          SUM(active_members) as total_active_members,
          SUM(total_members) as total_all_members
        FROM vw_ward_membership_audit
        WHERE province_code = $1
        GROUP BY municipality_code, municipality_name, district_code, district_name
        ORDER BY total_active_members DESC
        LIMIT 10;
      `;
      
      const municipalitiesResult = await pool.query(municipalitiesQuery, [topProvince.province_code]);
      console.table(municipalitiesResult.rows);
    }

    // 3. Test the data that would be used to create the municipality performance view
    console.log('\n3. Sample municipality performance data:');
    const sampleQuery = `
      SELECT 
        municipality_code,
        municipality_name,
        district_code,
        district_name,
        province_code,
        province_name,
        COUNT(*) as total_wards,
        SUM(CASE WHEN standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
        SUM(CASE WHEN standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
        SUM(CASE WHEN standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,
        SUM(CASE WHEN standing_level IN (1, 2) THEN 1 ELSE 0 END) as compliant_wards,
        ROUND(
          (SUM(CASE WHEN standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
          NULLIF(COUNT(*), 0), 2
        ) as compliance_percentage,
        SUM(active_members) as total_active_members,
        SUM(total_members) as total_all_members,
        ROUND(AVG(active_members), 1) as avg_active_per_ward
      FROM vw_ward_membership_audit
      GROUP BY municipality_code, municipality_name, district_code, district_name, province_code, province_name
      ORDER BY total_active_members DESC
      LIMIT 5;
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    console.table(sampleResult.rows);

  } catch (error) {
    console.error('❌ Error checking provinces:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkAvailableProvinces().catch(console.error);
