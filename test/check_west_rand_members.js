const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkWestRandMembers() {
  try {
    console.log('Checking West Rand municipalities for members...\n');
    
    // Query 1: Check members by municipality_code for West Rand municipalities
    console.log('=== Members by Municipality Code (GT481, GT484, GT485) ===');
    const query1 = `
      SELECT 
        municipality_code,
        COUNT(*) as member_count
      FROM members_consolidated
      WHERE municipality_code IN ('GT481', 'GT484', 'GT485')
      GROUP BY municipality_code
      ORDER BY municipality_code
    `;
    
    const result1 = await pool.query(query1);
    console.table(result1.rows);
    
    // Query 2: Check wards that belong to these municipalities
    console.log('\n=== Wards for West Rand Municipalities ===');
    const query2 = `
      SELECT 
        w.municipality_code,
        m.municipality_name,
        COUNT(DISTINCT w.ward_code) as ward_count,
        array_agg(DISTINCT w.ward_code ORDER BY w.ward_code) as sample_wards
      FROM wards w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE w.municipality_code IN ('GT481', 'GT484', 'GT485')
      GROUP BY w.municipality_code, m.municipality_name
      ORDER BY w.municipality_code
    `;
    
    const result2 = await pool.query(query2);
    console.table(result2.rows);
    
    // Query 3: Check if any members have ward codes from these municipalities
    console.log('\n=== Members with Ward Codes from West Rand Municipalities ===');
    const query3 = `
      SELECT 
        w.municipality_code,
        m.municipality_name,
        COUNT(DISTINCT mc.id_number) as member_count
      FROM wards w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN members_consolidated mc ON w.ward_code = mc.ward_code
      WHERE w.municipality_code IN ('GT481', 'GT484', 'GT485')
      GROUP BY w.municipality_code, m.municipality_name
      ORDER BY w.municipality_code
    `;
    
    const result3 = await pool.query(query3);
    console.table(result3.rows);
    
    // Query 4: Sample members from these wards
    console.log('\n=== Sample Members from West Rand Wards ===');
    const query4 = `
      SELECT 
        mc.id_number,
        mc.firstname,
        mc.ward_code,
        mc.municipality_code,
        mc.district_code,
        w.municipality_code as ward_municipality
      FROM members_consolidated mc
      JOIN wards w ON mc.ward_code = w.ward_code
      WHERE w.municipality_code IN ('GT481', 'GT484', 'GT485')
      LIMIT 20
    `;
    
    const result4 = await pool.query(query4);
    console.table(result4.rows);
    
    // Query 5: Check what municipality_code members actually have
    console.log('\n=== What municipality_code do members with West Rand wards have? ===');
    const query5 = `
      SELECT 
        mc.municipality_code,
        COUNT(*) as member_count
      FROM members_consolidated mc
      JOIN wards w ON mc.ward_code = w.ward_code
      WHERE w.municipality_code IN ('GT481', 'GT484', 'GT485')
      GROUP BY mc.municipality_code
      ORDER BY member_count DESC
    `;
    
    const result5 = await pool.query(query5);
    console.table(result5.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWestRandMembers();

