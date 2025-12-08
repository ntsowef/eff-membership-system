const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function recreateView() {
  const client = await pool.connect();
  
  try {
    console.log('Creating vw_member_details_optimized view...\n');
    
    const createViewSQL = `
CREATE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    
    COALESCE(m.membership_number, CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0'))) as membership_number,
    
    -- USE MEMBER'S OWN PROVINCE_CODE FIRST (most reliable for metros)
    COALESCE(m.province_code, p.province_code, pp.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,
    
    COALESCE(d.district_code, pd.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    
    COALESCE(mu.municipality_code, m.municipality_code) as municipality_code,
    COALESCE(mu.municipality_name, m.municipality_name) as municipality_name,
    
    w.ward_code,
    w.ward_number,
    w.ward_name,
    
    COALESCE(vd.voting_district_name, 'Not Available') as voting_district_name,
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    m.expiry_date,
    m.last_payment_date,
    m.date_joined,
    m.membership_amount,
    
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE THEN 
            (m.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry,
    
    mst.is_active,
    mst.status_name

FROM members_consolidated m
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN municipalities mum ON m.municipality_code = mum.municipality_code
LEFT JOIN municipalities pm ON mum.parent_municipality_id = pm.municipality_id
LEFT JOIN districts pd ON pm.district_code = pd.district_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN genders g ON m.gender_id = g.gender_id
    `;
    
    await client.query(createViewSQL);
    console.log('✅ View created successfully\n');

    console.log('Granting permissions...');
    await client.query('GRANT SELECT ON vw_member_details_optimized TO PUBLIC');
    console.log('✅ Permissions granted\n');

    console.log('Testing with member 7501165402082...');
    const testResult = await client.query(`
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
    `);
    
    console.log('✅ Test result:');
    console.log(JSON.stringify(testResult.rows[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

recreateView();

