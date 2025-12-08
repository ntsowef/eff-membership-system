const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkMemberProvince() {
  try {
    console.log('Checking member with ID 7501165402082...\n');

    // Check member data from members_consolidated
    const memberQuery = `
      SELECT 
        member_id,
        id_number,
        firstname,
        surname,
        ward_code,
        municipality_code,
        province_code
      FROM members_consolidated
      WHERE id_number = '7501165402082'
    `;
    
    const memberResult = await pool.query(memberQuery);
    console.log('Member data from members_consolidated:');
    console.log(memberResult.rows[0]);
    console.log('\n');

    if (memberResult.rows.length > 0) {
      const member = memberResult.rows[0];
      
      // Check ward information
      if (member.ward_code) {
        const wardQuery = `
          SELECT 
            w.ward_code,
            w.ward_name,
            w.municipality_code,
            mu.municipality_name,
            mu.district_code,
            d.district_name,
            d.province_code,
            p.province_name,
            p.province_code as province_code_from_province
          FROM wards w
          LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
          LEFT JOIN districts d ON mu.district_code = d.district_code
          LEFT JOIN provinces p ON d.province_code = p.province_code
          WHERE w.ward_code = $1
        `;
        
        const wardResult = await pool.query(wardQuery, [member.ward_code]);
        console.log('Ward geographic chain:');
        console.log(wardResult.rows[0]);
        console.log('\n');
      }

      // Check if municipality is a metro (has parent_municipality_id)
      if (member.municipality_code) {
        const metroQuery = `
          SELECT 
            mu.municipality_code,
            mu.municipality_name,
            mu.district_code,
            mu.parent_municipality_id,
            pm.municipality_name as parent_municipality_name,
            d.district_code as direct_district_code,
            d.district_name as direct_district_name,
            d.province_code as direct_province_code,
            pd.district_code as parent_district_code,
            pd.district_name as parent_district_name,
            pd.province_code as parent_province_code,
            p.province_name as direct_province_name,
            pp.province_name as parent_province_name
          FROM municipalities mu
          LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
          LEFT JOIN districts d ON mu.district_code = d.district_code
          LEFT JOIN districts pd ON pm.district_code = pd.district_code
          LEFT JOIN provinces p ON d.province_code = p.province_code
          LEFT JOIN provinces pp ON pd.province_code = pp.province_code
          WHERE mu.municipality_code = $1
        `;
        
        const metroResult = await pool.query(metroQuery, [member.municipality_code]);
        console.log('Municipality/Metro information:');
        console.log(metroResult.rows[0]);
        console.log('\n');
      }

      // Check what the view returns
      const viewQuery = `
        SELECT 
          member_id,
          id_number,
          firstname,
          province_code,
          province_name,
          municipality_name,
          ward_code
        FROM vw_member_details_optimized
        WHERE id_number = '7501165402082'
      `;
      
      const viewResult = await pool.query(viewQuery);
      console.log('Data from vw_member_details_optimized:');
      console.log(viewResult.rows[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMemberProvince();

