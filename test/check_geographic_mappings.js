const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkGeographicMappings() {
  try {
    console.log('Checking geographic hierarchy mappings...\n');
    
    // Query 1: Sample wards from Gauteng members
    console.log('=== Sample Ward Codes from Gauteng Members ===');
    const query1 = `
      SELECT DISTINCT ward_code
      FROM members_consolidated 
      WHERE province_code = 'GP'
      LIMIT 10
    `;
    
    const result1 = await pool.query(query1);
    console.table(result1.rows);
    const sampleWardCodes = result1.rows.map(r => r.ward_code);
    
    // Query 2: Check if these wards exist in the wards table
    console.log('\n=== Ward Mappings in Database ===');
    const query2 = `
      SELECT 
        w.ward_code,
        w.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE w.ward_code = ANY($1)
      ORDER BY w.ward_code
    `;
    
    const result2 = await pool.query(query2, [sampleWardCodes]);
    console.table(result2.rows);
    
    // Query 3: Check if wards from members exist in wards table
    console.log('\n=== Ward Codes Missing from Wards Table ===');
    const query3 = `
      SELECT DISTINCT mc.ward_code
      FROM members_consolidated mc
      LEFT JOIN wards w ON mc.ward_code = w.ward_code
      WHERE mc.province_code = 'GP' 
        AND w.ward_code IS NULL
      LIMIT 20
    `;
    
    const result3 = await pool.query(query3);
    console.log(`Found ${result3.rows.length} ward codes in members that don't exist in wards table:`);
    console.table(result3.rows);
    
    // Query 4: Count total wards in members vs wards table
    console.log('\n=== Ward Code Statistics ===');
    const query4a = `
      SELECT COUNT(DISTINCT ward_code) as total_ward_codes
      FROM members_consolidated
      WHERE province_code = 'GP'
    `;
    const result4a = await pool.query(query4a);
    console.log('Total distinct ward codes in Gauteng members:', result4a.rows[0].total_ward_codes);
    
    const query4b = `
      SELECT COUNT(DISTINCT w.ward_code) as total_ward_codes
      FROM wards w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      JOIN districts d ON m.district_code = d.district_code
      WHERE d.province_code = 'GP'
    `;
    const result4b = await pool.query(query4b);
    console.log('Total distinct ward codes in wards table for Gauteng:', result4b.rows[0].total_ward_codes);
    
    // Query 5: Check municipality mappings
    console.log('\n=== Municipality Mappings ===');
    const query5 = `
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      WHERE d.province_code = 'GP' OR m.municipality_code IN ('JHB', 'TSH', 'EKU')
      ORDER BY m.municipality_name
    `;
    
    const result5 = await pool.query(query5);
    console.table(result5.rows);
    
    // Query 6: Check if JHB, TSH, EKU are in municipalities table
    console.log('\n=== Metro Municipalities (JHB, TSH, EKU) ===');
    const query6 = `
      SELECT 
        municipality_code,
        municipality_name,
        district_code,
        municipality_type
      FROM municipalities
      WHERE municipality_code IN ('JHB', 'TSH', 'EKU')
    `;
    
    const result6 = await pool.query(query6);
    console.table(result6.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkGeographicMappings();

