const { Pool } = require('pg');

// Production database configuration
const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function createWardMembershipAuditView() {
  console.log('📝 Dropping and recreating vw_ward_membership_audit view...');

  // First drop the dependent view
  await pool.query('DROP VIEW IF EXISTS vw_municipality_ward_performance CASCADE');
  // Then drop this view
  await pool.query('DROP VIEW IF EXISTS vw_ward_membership_audit CASCADE');

  const createViewSQL = `
    CREATE VIEW vw_ward_membership_audit AS
    SELECT
        w.ward_code,
        w.ward_name,
        w.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name,
        SUM(CASE
            WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1
            ELSE 0
        END) as active_members,
        SUM(CASE
            WHEN mc.expiry_date < CURRENT_DATE - INTERVAL '90 days' OR mst.is_active = false THEN 1
            ELSE 0
        END) as expired_members,
        SUM(CASE
            WHEN mc.expiry_date IS NULL THEN 1
            ELSE 0
        END) as inactive_members,
        COUNT(mc.member_id) as total_members,
        ROUND(
            (SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) * 100.0) / 
            NULLIF(COUNT(mc.member_id), 0), 2
        ) as compliance_percentage,
        CASE
            WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 200 THEN 'Good Standing'
            WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 100 THEN 'Acceptable Standing'
            ELSE 'Needs Improvement'
        END as standing_status,
        CASE
            WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 200 THEN 1
            WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 100 THEN 2
            ELSE 3
        END as standing_level,
        NOW() as last_updated
    FROM wards w
    LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
    LEFT JOIN districts d ON m.district_code = d.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    LEFT JOIN members_consolidated mc ON w.ward_code = mc.ward_code
    LEFT JOIN membership_statuses mst ON mc.membership_status_id = mst.status_id
    GROUP BY w.ward_code, w.ward_name, w.municipality_code, m.municipality_name, 
             m.district_code, d.district_name, d.province_code, p.province_name;
  `;
  
  await pool.query(createViewSQL);
  console.log('✅ vw_ward_membership_audit created successfully');
}

async function createMunicipalityWardPerformanceView() {
  console.log('📝 Creating vw_municipality_ward_performance view...');

  // Drop if exists (in case it wasn't dropped by the previous function)
  await pool.query('DROP VIEW IF EXISTS vw_municipality_ward_performance CASCADE');

  const createViewSQL = `
    CREATE VIEW vw_municipality_ward_performance AS
    SELECT
        m.municipality_code, m.municipality_name, m.district_code, d.district_name,
        d.province_code, p.province_name,
        COUNT(wa.ward_code) as total_wards,
        SUM(CASE WHEN wa.standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
        SUM(CASE WHEN wa.standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
        SUM(CASE WHEN wa.standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,
        SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) as compliant_wards,
        ROUND((SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(wa.ward_code), 0), 2) as compliance_percentage,
        CASE WHEN ROUND((SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(wa.ward_code), 0), 2) >= 70 
             THEN 'Performing Municipality' ELSE 'Underperforming Municipality' END as municipality_performance,
        CASE WHEN ROUND((SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(wa.ward_code), 0), 2) >= 70 
             THEN 1 ELSE 2 END as performance_level,
        COALESCE(SUM(wa.active_members), 0) as total_active_members,
        COALESCE(SUM(wa.total_members), 0) as total_all_members,
        ROUND(COALESCE(AVG(wa.active_members), 0), 1) as avg_active_per_ward,
        CASE WHEN ROUND((SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(wa.ward_code), 0), 2) >= 70 
             THEN 0 ELSE CEIL(COUNT(wa.ward_code) * 0.7) - SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) END as wards_needed_compliance,
        NOW() as last_updated
    FROM municipalities m
    LEFT JOIN districts d ON m.district_code = d.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    LEFT JOIN vw_ward_membership_audit wa ON m.municipality_code = wa.municipality_code
    GROUP BY m.municipality_code, m.municipality_name, m.district_code, d.district_name, d.province_code, p.province_name;
  `;
  
  await pool.query(createViewSQL);
  console.log('✅ vw_municipality_ward_performance created successfully');
}

async function main() {
  console.log('🚀 Applying views to PRODUCTION database (69.164.245.173)...\n');
  
  try {
    // Check connection
    const connTest = await pool.query('SELECT NOW() as time');
    console.log(`✅ Connected to production database at ${connTest.rows[0].time}\n`);
    
    // Check if vw_ward_membership_audit exists
    const checkView1 = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'vw_ward_membership_audit') as exists`);
    if (!checkView1.rows[0].exists) {
      await createWardMembershipAuditView();
    } else {
      console.log('✅ vw_ward_membership_audit already exists (recreating...)');
      await createWardMembershipAuditView();
    }
    
    // Create municipality ward performance view
    await createMunicipalityWardPerformanceView();
    
    // Verify
    console.log('\n📊 Verifying views...');
    const result = await pool.query('SELECT COUNT(*) as count FROM vw_municipality_ward_performance');
    console.log(`✅ vw_municipality_ward_performance has ${result.rows[0].count} municipalities`);
    
    console.log('\n✅ Production database views updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();

