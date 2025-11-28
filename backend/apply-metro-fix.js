/**
 * Apply Metro Member Search Fix
 * This script fixes the vw_member_details view to include metro sub-region members
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function applyMetroFix() {
  console.log('🔧 Starting Metro Member Search Fix...\n');

  try {
    console.log('🔧 Applying Metro Member Search Fix...\n');
    
    // Step 1: Drop the existing view
    console.log('Step 1: Dropping existing vw_member_details view...');
    await pool.query('DROP VIEW IF EXISTS vw_member_details CASCADE');
    console.log('✅ View dropped\n');
    
    // Step 2: Create the fixed view
    console.log('Step 2: Creating fixed vw_member_details view with metro support...');
    
    const createViewSQL = `
      CREATE OR REPLACE VIEW vw_member_details AS
      SELECT
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.middle_name,
          CONCAT(m.firstname, ' ', COALESCE(m.middle_name || ' ', ''), COALESCE(m.surname, '')) as full_name,
          m.date_of_birth,
          m.age,

          -- Demographic information with resolved lookups
          g.gender_name,
          r.race_name,
          c.citizenship_name,
          l.language_name,

          -- Contact information
          m.residential_address,
          m.postal_address,
          m.cell_number,
          m.landline_number,
          m.alternative_contact,
          m.email,

          -- Professional information
          o.occupation_name,
          oc.category_name as occupation_category,
          q.qualification_name,
          q.level_order as qualification_level,

          -- Geographic information (FIXED FOR METROS)
          m.ward_code,
          w.ward_name,
          w.ward_number,
          
          -- Municipality info (direct from ward)
          mu.municipality_code,
          mu.municipality_name,
          mu.municipality_type,
          
          -- District info (COALESCE to handle metro sub-regions)
          -- For metro sub-regions: get district from parent municipality
          -- For regular municipalities: get district directly
          COALESCE(mu.district_code, pm.district_code) as district_code,
          COALESCE(d.district_name, pd.district_name) as district_name,
          
          -- Province info (COALESCE to handle metro sub-regions)
          COALESCE(d.province_code, pd.province_code) as province_code,
          COALESCE(p.province_name, pp.province_name) as province_name,

          -- Voting information
          m.voting_district_code,
          vd.voting_district_name,
          vs_status.status_name as voter_status,
          m.voter_registration_number,
          m.voter_registration_date,

          -- Membership information
          ms.membership_id,
          ms.membership_number,
          ms.date_joined,
          ms.expiry_date,
          ms.last_payment_date,
          ms_status.status_name as membership_status,
          ms_status.is_active as membership_active,
          st.subscription_name as subscription_type,
          ms.membership_amount,

          -- Membership standing
          CASE
              WHEN ms.expiry_date >= CURRENT_DATE AND ms_status.is_active = TRUE THEN 'Active'
              WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
              WHEN ms_status.is_active = FALSE THEN 'Inactive'
              ELSE 'Unknown'
          END as membership_standing,

          -- Days until expiry (negative if expired)
          CASE
              WHEN ms.expiry_date IS NOT NULL THEN ms.expiry_date - CURRENT_DATE
              ELSE NULL
          END as days_until_expiry,

          -- Timestamps
          m.created_at as member_created_at,
          m.updated_at as member_updated_at

      FROM members m

      -- Geographic joins with metro support
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
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code

      -- Lookup table joins
      LEFT JOIN genders g ON m.gender_id = g.gender_id
      LEFT JOIN races r ON m.race_id = r.race_id
      LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
      LEFT JOIN languages l ON m.language_id = l.language_id
      LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
      LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
      LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
      LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.status_id

      -- Membership joins
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses ms_status ON ms.status_id = ms_status.status_id
      LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id
    `;
    
    await pool.query(createViewSQL);
    console.log('✅ View created successfully\n');
    
    // Step 3: Create indexes for performance
    console.log('Step 3: Creating performance indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_municipalities_parent 
      ON municipalities(parent_municipality_id) 
      WHERE parent_municipality_id IS NOT NULL
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_municipalities_type 
      ON municipalities(municipality_type)
    `);
    
    console.log('✅ Indexes created\n');
    
    // Step 4: Verify the fix
    console.log('Step 4: Verifying the fix...');
    
    const verifyQuery = `
      SELECT 
          COUNT(*) as metro_members_with_province
      FROM vw_member_details vmd
      JOIN municipalities mu ON vmd.municipality_code = mu.municipality_code
      WHERE mu.municipality_type = 'Metro Sub-Region'
        AND vmd.province_code IS NOT NULL
    `;
    
    const result = await pool.query(verifyQuery);
    console.log(`✅ Metro sub-region members with province: ${result.rows[0].metro_members_with_province}\n`);
    
    // Step 5: Test Gauteng count
    console.log('Step 5: Testing Gauteng member count...');
    
    const gautengQuery = `
      SELECT COUNT(*) as total
      FROM vw_member_details
      WHERE province_code = 'GP'
    `;
    
    const gautengResult = await pool.query(gautengQuery);
    console.log(`✅ Total members in Gauteng: ${gautengResult.rows[0].total}\n`);
    
    console.log('=' .repeat(80));
    console.log('✅ Metro Member Search Fix Applied Successfully!');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    console.log('Closing database connection...');
    await pool.end();
    console.log('Connection closed.');
  }
}

// Run the fix
console.log('Script started...');
applyMetroFix()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    console.error('Error message:', error.message);
    process.exit(1);
  });

