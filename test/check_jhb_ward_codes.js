const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkJHBWardCodes() {
  try {
    console.log('Checking JHB ward codes...\n');
    
    // Query 1: Sample ward codes from members with municipality_code='JHB'
    console.log('=== Sample Ward Codes from Members with municipality_code=JHB ===');
    const query1 = `
      SELECT DISTINCT ward_code
      FROM members_consolidated 
      WHERE municipality_code = 'JHB'
      LIMIT 20
    `;
    
    const result1 = await pool.query(query1);
    console.table(result1.rows);
    const sampleWardCodes = result1.rows.map(r => r.ward_code);
    
    // Query 2: Check if these wards exist in the wards table
    console.log('\n=== Do These Wards Exist in Wards Table? ===');
    const query2 = `
      SELECT 
        w.ward_code,
        w.municipality_code,
        m.municipality_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE w.ward_code = ANY($1)
      ORDER BY w.ward_code
    `;
    
    const result2 = await pool.query(query2, [sampleWardCodes]);
    console.log(`Found ${result2.rows.length} out of ${sampleWardCodes.length} wards in wards table:`);
    console.table(result2.rows);
    
    // Query 3: Check which wards are missing
    console.log('\n=== Missing Ward Codes ===');
    const query3 = `
      SELECT ward_code
      FROM unnest($1::varchar[]) AS ward_code
      WHERE ward_code NOT IN (SELECT ward_code FROM wards)
    `;
    
    const result3 = await pool.query(query3, [sampleWardCodes]);
    console.log(`${result3.rows.length} ward codes are missing from wards table:`);
    console.table(result3.rows);
    
    // Query 4: Count total members with municipality_code='JHB'
    console.log('\n=== Total Members with municipality_code=JHB ===');
    const query4 = `
      SELECT COUNT(*) as total_members
      FROM members_consolidated
      WHERE municipality_code = 'JHB'
    `;
    
    const result4 = await pool.query(query4);
    console.table(result4.rows);
    
    // Query 5: Check all wards in wards table for JHB municipality
    console.log('\n=== All Wards in Wards Table for JHB Municipality ===');
    const query5 = `
      SELECT ward_code
      FROM wards
      WHERE municipality_code = 'JHB'
      ORDER BY ward_code
    `;
    
    const result5 = await pool.query(query5);
    console.log(`Total wards in wards table for JHB: ${result5.rows.length}`);
    console.table(result5.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkJHBWardCodes();

