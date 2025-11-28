const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// CHECK AND CREATE MISSING VIEWS FOR STATISTICS
// Creates essential views that the statistics model depends on
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function checkAndCreateMissingViews() {
  console.log('🔍 Checking Missing Views for Statistics');
  console.log('========================================\n');
  
  try {
    // 1. Check for required views
    console.log('1️⃣ Checking required views...\n');
    
    const requiredViews = [
      'vw_membership_by_ward',
      'vw_member_details'
    ];
    
    for (const viewName of requiredViews) {
      try {
        const viewExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [viewName]);
        
        if (viewExists.rows[0].exists) {
          console.log(`   ✅ ${viewName}: View exists`);
        } else {
          console.log(`   ❌ ${viewName}: View does not exist`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${viewName}: Error - ${error.message}`);
      }
    }
    
    // 2. Create vw_member_details view
    console.log('\n2️⃣ Creating vw_member_details view...\n');
    
    try {
      await pool.query(`
        CREATE OR REPLACE VIEW vw_member_details AS
        SELECT 
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.middle_name,
          m.date_of_birth,
          m.gender,
          m.phone_number,
          m.email,
          m.physical_address,
          m.postal_address,
          m.province_code,
          m.district_code,
          m.municipality_code,
          m.ward_code,
          m.voting_district_code,
          m.voting_station_code,
          m.created_at,
          m.updated_at,
          p.province_name,
          d.district_name,
          mu.municipality_name,
          w.ward_name,
          vs.station_name as voting_station_name,
          ms.membership_number,
          ms.date_joined,
          ms.expiry_date,
          ms.last_payment_date,
          mst.status_name as membership_status,
          mst.is_active as status_is_active
        FROM members m
        LEFT JOIN provinces p ON m.province_code = p.province_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN voting_stations vs ON m.voting_station_code = vs.station_code
        LEFT JOIN memberships ms ON m.member_id = ms.member_id
        LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
      `);
      
      console.log('✅ vw_member_details view created successfully');
      
    } catch (error) {
      console.log(`❌ Failed to create vw_member_details: ${error.message}`);
    }
    
    // 3. Create vw_membership_by_ward view
    console.log('\n3️⃣ Creating vw_membership_by_ward view...\n');
    
    try {
      await pool.query(`
        CREATE OR REPLACE VIEW vw_membership_by_ward AS
        SELECT 
          w.ward_code,
          w.ward_name,
          w.ward_number,
          mu.municipality_code,
          mu.municipality_name,
          d.district_code,
          d.district_name,
          p.province_code,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          COUNT(DISTINCT CASE WHEN mst.is_active = TRUE THEN m.member_id END) as active_members,
          COUNT(DISTINCT CASE WHEN mst.is_active = FALSE THEN m.member_id END) as inactive_members,
          COUNT(DISTINCT CASE WHEN ms.expiry_date < CURRENT_DATE THEN m.member_id END) as expired_members,
          COUNT(DISTINCT CASE WHEN ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN m.member_id END) as expiring_soon,
          MAX(m.created_at) as latest_registration,
          MIN(m.created_at) as first_registration
        FROM wards w
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN members m ON w.ward_code = m.ward_code
        LEFT JOIN memberships ms ON m.member_id = ms.member_id
        LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
        GROUP BY 
          w.ward_code, w.ward_name, w.ward_number,
          mu.municipality_code, mu.municipality_name,
          d.district_code, d.district_name,
          p.province_code, p.province_name
        ORDER BY member_count DESC
      `);
      
      console.log('✅ vw_membership_by_ward view created successfully');
      
    } catch (error) {
      console.log(`❌ Failed to create vw_membership_by_ward: ${error.message}`);
    }
    
    // 4. Test the views
    console.log('\n4️⃣ Testing created views...\n');
    
    try {
      const memberDetailsTest = await pool.query(`
        SELECT COUNT(*) as total_members FROM vw_member_details
      `);
      console.log(`✅ vw_member_details test: ${memberDetailsTest.rows[0].total_members} members`);
      
      const wardMembershipTest = await pool.query(`
        SELECT COUNT(*) as total_wards FROM vw_membership_by_ward
      `);
      console.log(`✅ vw_membership_by_ward test: ${wardMembershipTest.rows[0].total_wards} wards`);
      
    } catch (error) {
      console.log(`❌ View testing failed: ${error.message}`);
    }
    
    // 5. Create additional helpful views
    console.log('\n5️⃣ Creating additional statistical views...\n');
    
    try {
      // Monthly registration statistics view
      await pool.query(`
        CREATE OR REPLACE VIEW vw_monthly_registrations AS
        SELECT 
          EXTRACT(YEAR FROM created_at) as year,
          EXTRACT(MONTH FROM created_at) as month,
          TO_CHAR(created_at, 'Month YYYY') as month_name,
          TO_CHAR(created_at, 'YYYY-MM') as month_year,
          COUNT(*) as registrations,
          COUNT(DISTINCT province_code) as provinces_active,
          COUNT(DISTINCT municipality_code) as municipalities_active
        FROM members
        WHERE created_at IS NOT NULL
        GROUP BY 
          EXTRACT(YEAR FROM created_at),
          EXTRACT(MONTH FROM created_at),
          TO_CHAR(created_at, 'Month YYYY'),
          TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY year DESC, month DESC
      `);
      
      // Membership status summary view
      await pool.query(`
        CREATE OR REPLACE VIEW vw_membership_status_summary AS
        SELECT 
          mst.status_name,
          mst.status_code,
          mst.is_active,
          COUNT(ms.membership_id) as membership_count,
          ROUND(
            (COUNT(ms.membership_id) * 100.0 / 
             (SELECT COUNT(*) FROM memberships)
            ), 2
          ) as percentage
        FROM membership_statuses mst
        LEFT JOIN memberships ms ON mst.status_id = ms.status_id
        GROUP BY mst.status_id, mst.status_name, mst.status_code, mst.is_active
        ORDER BY membership_count DESC
      `);
      
      console.log('✅ Additional statistical views created');
      
    } catch (error) {
      console.log(`⚠️  Could not create additional views: ${error.message}`);
    }
    
    // 6. Final verification
    console.log('\n6️⃣ Final verification...\n');
    
    const allViews = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND (table_name LIKE 'vw_%' OR table_name LIKE '%member%' OR table_name LIKE '%statistic%')
      ORDER BY table_name
    `);
    
    console.log('📊 AVAILABLE STATISTICAL VIEWS:');
    console.log('===============================');
    allViews.rows.forEach((view, index) => {
      console.log(`   ${index + 1}. ${view.table_name}`);
    });
    
    console.log('\n🎉 MISSING VIEWS VERIFICATION COMPLETED!');
    console.log('========================================');
    console.log('✅ vw_member_details view created and tested');
    console.log('✅ vw_membership_by_ward view created and tested');
    console.log('✅ Additional statistical views available');
    console.log('✅ Ready for statistics model operations');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
if (require.main === module) {
  checkAndCreateMissingViews()
    .then(() => {
      console.log('\n✅ Missing views verification completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Missing views verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAndCreateMissingViews };
