/**
 * Check member 93087 data to see why province is not showing
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eff_membership_db',
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
});

async function checkMember() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking member 93087 data...\n');
    
    // Check from optimized view
    console.log('📋 Step 1: Check from vw_member_details_optimized view:');
    const viewQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        municipality_code,
        municipality_name,
        district_code,
        district_name,
        province_code,
        province_name,
        ward_code,
        ward_number,
        voting_station_name
      FROM vw_member_details_optimized
      WHERE member_id = 93087;
    `;
    
    const viewResult = await client.query(viewQuery);
    console.table(viewResult.rows);
    
    // Check raw member data
    console.log('\n📋 Step 2: Check raw member data:');
    const memberQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        ward_code,
        voting_station_id
      FROM members
      WHERE member_id = 93087;
    `;
    
    const memberResult = await client.query(memberQuery);
    console.table(memberResult.rows);
    
    // Check ward data
    console.log('\n📋 Step 3: Check ward data:');
    const wardQuery = `
      SELECT 
        w.ward_code,
        w.ward_name,
        w.ward_number,
        w.municipality_code,
        mu.municipality_name,
        mu.parent_municipality_id,
        mu.district_code
      FROM members m
      JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      WHERE m.member_id = 93087;
    `;
    
    const wardResult = await client.query(wardQuery);
    console.table(wardResult.rows);
    
    // Check municipality hierarchy
    console.log('\n📋 Step 4: Check municipality hierarchy:');
    const hierarchyQuery = `
      SELECT 
        mu.municipality_code,
        mu.municipality_name,
        mu.parent_municipality_id,
        mu.district_code as mu_district_code,
        pm.municipality_name as parent_municipality_name,
        pm.district_code as parent_district_code,
        d.district_name as direct_district_name,
        pd.district_name as parent_district_name,
        p.province_code as direct_province_code,
        p.province_name as direct_province_name,
        pp.province_code as parent_province_code,
        pp.province_name as parent_province_name
      FROM members m
      JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN provinces pp ON pd.province_code = pp.province_code
      WHERE m.member_id = 93087;
    `;
    
    const hierarchyResult = await client.query(hierarchyQuery);
    console.table(hierarchyResult.rows);
    
    // Check if municipality exists
    console.log('\n📋 Step 5: Check if municipality exists:');
    const muQuery = `
      SELECT 
        municipality_code,
        municipality_name,
        parent_municipality_id,
        district_code
      FROM municipalities
      WHERE municipality_code = (
        SELECT w.municipality_code 
        FROM members m
        JOIN wards w ON m.ward_code = w.ward_code
        WHERE m.member_id = 93087
      );
    `;
    
    const muResult = await client.query(muQuery);
    console.table(muResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkMember()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

