const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkMunicipalityStructure() {
  const client = await pool.connect();
  
  try {
    console.log('=== Checking Municipality Structure ===\n');
    
    // Check the specific municipalities that have NULL issues
    const municipalityCheckResult = await client.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE m.municipality_code IN ('FS194', 'GT421', 'FS196', 'FS184', 'FS192', 'FS204', 'GT422')
      ORDER BY m.municipality_code
    `);
    
    console.log('Sample Municipalities with Issues:');
    console.table(municipalityCheckResult.rows);
    
    // Count how many municipalities have NULL district_code
    const nullDistrictCountResult = await client.query(`
      SELECT 
        COUNT(*) as total_municipalities,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as without_district,
        COUNT(CASE WHEN district_code IS NOT NULL THEN 1 END) as with_district
      FROM municipalities
    `);
    
    console.log('\nMunicipality District Status:');
    console.table(nullDistrictCountResult.rows);
    
    // Get a sample of municipalities without district_code
    const noDistrictSampleResult = await client.query(`
      SELECT 
        municipality_code,
        municipality_name,
        district_code
      FROM municipalities
      WHERE district_code IS NULL
      ORDER BY municipality_code
      LIMIT 30
    `);
    
    console.log('\nSample Municipalities WITHOUT district_code:');
    console.table(noDistrictSampleResult.rows);
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkMunicipalityStructure().catch(console.error);

