/**
 * Fix vw_member_details_optimized view to support metropolitan municipalities
 * 
 * Issue: Members in metro sub-regions return NULL for province_code and province_name
 * Solution: Add parent municipality joins and use COALESCE to inherit geographic data
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eff_membership_db',
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
});

async function fixOptimizedView() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing vw_member_details_optimized view for metro support...\n');
    
    // Drop and recreate the view
    const dropViewSQL = `DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;`;
    
    const createViewSQL = `
CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    
    -- Pre-calculated membership number to avoid CONCAT in queries
    CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0')) as membership_number,
    
    -- Geographic data with optimized joins (METRO SUPPORT ADDED)
    -- Use COALESCE to get province from parent municipality when direct join fails
    COALESCE(p.province_code, pp.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,
    
    -- Municipality name (always from direct join - shows sub-region name, not parent)
    mu.municipality_name,
    mu.municipality_code,
    
    -- District info (COALESCE to handle metro sub-regions)
    COALESCE(d.district_code, pd.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    
    -- Ward info
    w.ward_number,
    w.ward_name,
    w.ward_code,
    
    -- Voting station
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    
    -- Membership status (optimized)
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    ms.expiry_date,
    ms.membership_amount,
    
    -- Calculated fields for performance
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 
            (ms.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry

FROM members m

-- Geographic joins with METRO SUPPORT
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code

-- Join to parent municipality (for metro sub-regions)
LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id

-- Join to districts (both direct and through parent)
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code

-- Join to provinces (both direct and through parent)
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code

-- Other joins
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id;
    `;
    
    console.log('📋 Step 1: Dropping existing view...');
    await client.query(dropViewSQL);
    console.log('✅ View dropped successfully\n');
    
    console.log('📋 Step 2: Creating updated view with metro support...');
    await client.query(createViewSQL);
    console.log('✅ View created successfully\n');
    
    // Verification query
    console.log('📋 Step 3: Verifying metro members have province data...');
    const verificationSQL = `
      SELECT 
          'Metro Members with Province Data' as test_name,
          COUNT(*) as total_metro_members,
          COUNT(province_code) as members_with_province,
          COUNT(province_name) as members_with_province_name,
          ROUND(COUNT(province_code)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as percentage_with_province
      FROM vw_member_details_optimized v
      JOIN municipalities mu ON v.municipality_code = mu.municipality_code
      WHERE mu.parent_municipality_id IS NOT NULL;
    `;
    
    const verificationResult = await client.query(verificationSQL);
    console.log('\n📊 Verification Results:');
    console.table(verificationResult.rows);
    
    // Sample query
    console.log('\n📋 Step 4: Showing sample metro members...');
    const sampleSQL = `
      SELECT 
          member_id,
          firstname,
          surname,
          municipality_name,
          district_name,
          province_code,
          province_name,
          membership_status
      FROM vw_member_details_optimized
      WHERE municipality_code IN (
          SELECT municipality_code 
          FROM municipalities 
          WHERE parent_municipality_id IS NOT NULL
      )
      LIMIT 10;
    `;
    
    const sampleResult = await client.query(sampleSQL);
    console.log('\n📋 Sample Metro Members:');
    console.table(sampleResult.rows);
    
    console.log('\n✅ SUCCESS! vw_member_details_optimized view has been updated with metro support!');
    console.log('🎉 Members in metropolitan sub-regions now have province_code and province_name!');
    
  } catch (error) {
    console.error('❌ Error fixing view:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixOptimizedView()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

