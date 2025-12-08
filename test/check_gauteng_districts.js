const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkGautengDistricts() {
  try {
    console.log('Checking Gauteng province members...\n');
    
    // Query 1: Total members in Gauteng
    const query1 = `
      SELECT COUNT(*) as total_members
      FROM members_consolidated 
      WHERE province_code = 'GP'
    `;
    
    const result1 = await pool.query(query1);
    console.log('Total members in Gauteng (GP):');
    console.table(result1.rows);
    
    // Query 2: Members by district in Gauteng
    const query2 = `
      SELECT 
        district_code, 
        COUNT(*) as member_count 
      FROM members_consolidated 
      WHERE province_code = 'GP' 
      GROUP BY district_code 
      ORDER BY member_count DESC
    `;
    
    const result2 = await pool.query(query2);
    console.log('\nMembers by district in Gauteng:');
    console.table(result2.rows);
    
    // Query 3: Members with NULL district_code in Gauteng
    const query3 = `
      SELECT COUNT(*) as count_with_null_district
      FROM members_consolidated 
      WHERE province_code = 'GP' AND district_code IS NULL
    `;
    
    const result3 = await pool.query(query3);
    console.log('\nMembers with NULL district_code in Gauteng:');
    console.table(result3.rows);
    
    // Query 4: Sample members from Gauteng with their district codes
    const query4 = `
      SELECT 
        id_number,
        firstname,
        province_code,
        district_code,
        municipality_code,
        ward_code
      FROM members_consolidated 
      WHERE province_code = 'GP'
      LIMIT 20
    `;
    
    const result4 = await pool.query(query4);
    console.log('\nSample members from Gauteng:');
    console.table(result4.rows);
    
    // Query 5: Check the districts table
    const query5 = `
      SELECT 
        district_code,
        district_name,
        province_code
      FROM districts
      WHERE province_code = 'GP'
      ORDER BY district_name
    `;
    
    const result5 = await pool.query(query5);
    console.log('\nDistricts in Gauteng (from districts table):');
    console.table(result5.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkGautengDistricts();

