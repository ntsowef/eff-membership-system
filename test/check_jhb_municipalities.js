const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkJHBMunicipalities() {
  try {
    console.log('Checking JHB municipalities structure...\n');
    
    // Query 1: All JHB municipalities
    console.log('=== All JHB Municipalities ===');
    const query1 = `
      SELECT 
        municipality_code,
        municipality_name,
        district_code,
        municipality_type,
        parent_municipality_id
      FROM municipalities
      WHERE municipality_code LIKE 'JHB%'
      ORDER BY municipality_code
    `;
    
    const result1 = await pool.query(query1);
    console.table(result1.rows);
    
    // Query 2: Check parent-child relationships
    console.log('\n=== JHB Parent-Child Relationships ===');
    const query2 = `
      SELECT 
        child.municipality_code as child_code,
        child.municipality_name as child_name,
        child.district_code as child_district,
        parent.municipality_code as parent_code,
        parent.municipality_name as parent_name,
        parent.district_code as parent_district
      FROM municipalities child
      LEFT JOIN municipalities parent ON child.parent_municipality_id = parent.municipality_id
      WHERE child.municipality_code LIKE 'JHB%'
      ORDER BY child.municipality_code
    `;
    
    const result2 = await pool.query(query2);
    console.table(result2.rows);
    
    // Query 3: Check what district_code JHB007 has
    console.log('\n=== District Mapping for JHB Sub-Regions ===');
    const query3 = `
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      WHERE m.municipality_code IN ('JHB007', 'JHB004', 'JHB')
      ORDER BY m.municipality_code
    `;
    
    const result3 = await pool.query(query3);
    console.table(result3.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkJHBMunicipalities();

