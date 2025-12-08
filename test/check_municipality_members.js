const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkMunicipalityMembers() {
  try {
    console.log('Checking members in West Rand district (DC48)...\n');
    
    // Query 1: Count members by municipality in DC48
    const query1 = `
      SELECT 
        municipality_code, 
        COUNT(*) as member_count 
      FROM members_consolidated 
      WHERE district_code = 'DC48' 
      GROUP BY municipality_code 
      ORDER BY municipality_code
    `;
    
    const result1 = await pool.query(query1);
    console.log('Members by municipality code:');
    console.table(result1.rows);
    
    // Query 2: Check if there are any members with NULL municipality_code in DC48
    const query2 = `
      SELECT COUNT(*) as count_with_null_municipality
      FROM members_consolidated 
      WHERE district_code = 'DC48' AND municipality_code IS NULL
    `;
    
    const result2 = await pool.query(query2);
    console.log('\nMembers with NULL municipality_code in DC48:');
    console.table(result2.rows);
    
    // Query 3: Check total members in DC48
    const query3 = `
      SELECT COUNT(*) as total_members
      FROM members_consolidated 
      WHERE district_code = 'DC48'
    `;
    
    const result3 = await pool.query(query3);
    console.log('\nTotal members in DC48:');
    console.table(result3.rows);
    
    // Query 4: Sample some members from DC48
    const query4 = `
      SELECT
        id_number,
        firstname,
        province_code,
        district_code,
        municipality_code,
        ward_code
      FROM members_consolidated
      WHERE district_code = 'DC48'
      LIMIT 10
    `;

    const result4 = await pool.query(query4);
    console.log('\nSample members from DC48:');
    console.table(result4.rows);
    
    // Query 5: Check the API query that's being used
    console.log('\n\nChecking the exact API query...');
    const apiQuery = `
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        COUNT(mc.id_number) as member_count
      FROM municipalities m
      LEFT JOIN members_consolidated mc 
        ON m.municipality_code = mc.municipality_code
      WHERE m.district_code = 'DC48'
      GROUP BY m.municipality_code, m.municipality_name, m.municipality_type
      ORDER BY m.municipality_name
    `;
    
    const apiResult = await pool.query(apiQuery);
    console.log('API Query Result (what the backend returns):');
    console.table(apiResult.rows);
    console.log('\nData types:');
    apiResult.rows.forEach(row => {
      console.log(`${row.municipality_name}: member_count type = ${typeof row.member_count}, value = ${row.member_count}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMunicipalityMembers();

