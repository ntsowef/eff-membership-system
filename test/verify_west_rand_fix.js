const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function verifyWestRandFix() {
  const client = await pool.connect();
  
  try {
    console.log('=== Verifying West Rand Geographic Data Fix ===\n');
    
    // 1. Check West Rand District (DC48)
    const westRandDistrictResult = await client.query(`
      SELECT 
        district_code,
        district_name,
        COUNT(*) as member_count
      FROM members_consolidated
      WHERE district_code = 'DC48'
      GROUP BY district_code, district_name
    `);
    
    console.log('West Rand District (DC48):');
    console.table(westRandDistrictResult.rows);
    
    // 2. Check West Rand Municipalities
    const westRandMunicipalitiesResult = await client.query(`
      SELECT 
        municipality_code,
        municipality_name,
        district_code,
        COUNT(*) as member_count
      FROM members_consolidated
      WHERE district_code = 'DC48'
      GROUP BY municipality_code, municipality_name, district_code
      ORDER BY municipality_code
    `);
    
    console.log('\nWest Rand Municipalities:');
    console.table(westRandMunicipalitiesResult.rows);
    
    // 3. Check Gauteng Province totals
    const gautengResult = await client.query(`
      SELECT 
        province_code,
        province_name,
        COUNT(*) as member_count
      FROM members_consolidated
      WHERE province_code = 'GT' OR province_code = 'GP'
      GROUP BY province_code, province_name
      ORDER BY province_code
    `);
    
    console.log('\nGauteng Province:');
    console.table(gautengResult.rows);
    
    // 4. Overall verification - check for any remaining NULLs
    const nullCheckResult = await client.query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district,
        COUNT(CASE WHEN province_code IS NULL THEN 1 END) as null_province
      FROM members_consolidated
    `);
    
    console.log('\n=== Overall Database Status ===');
    console.table(nullCheckResult.rows);
    
    // 5. Sample some West Rand members to verify data quality
    const sampleMembersResult = await client.query(`
      SELECT 
        member_id,
        first_name,
        last_name,
        ward_code,
        municipality_code,
        municipality_name,
        district_code,
        district_name,
        province_code,
        province_name
      FROM members_consolidated
      WHERE district_code = 'DC48'
      LIMIT 5
    `);
    
    console.log('\nSample West Rand Members (First 5):');
    console.table(sampleMembersResult.rows);
    
    console.log('\n✅ Verification Complete!');
    
  } finally {
    client.release();
    await pool.end();
  }
}

verifyWestRandFix().catch(console.error);

