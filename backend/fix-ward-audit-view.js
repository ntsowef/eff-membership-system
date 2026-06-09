const { Pool } = require('pg');

// Change to 'production' to run on production server
const TARGET = process.argv[2] || 'local';

const config = TARGET === 'production' ? {
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
} : {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

const pool = new Pool(config);

async function fixViews() {
  console.log(`🔧 Fixing ward membership audit views on ${TARGET.toUpperCase()} (${config.host})...\n`);

  try {
    // 1. Drop existing views (in correct order due to dependencies)
    console.log('1. Dropping existing views...');
    await pool.query('DROP VIEW IF EXISTS vw_municipality_ward_performance CASCADE');
    await pool.query('DROP VIEW IF EXISTS vw_ward_membership_audit CASCADE');
    console.log('   ✅ Views dropped');

    // 2. Create vw_ward_membership_audit using members_consolidated
    console.log('\n2. Creating vw_ward_membership_audit...');
    const createWardAuditView = `
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

          -- Active members (expiry within 90-day grace period AND active status)
          SUM(CASE
              WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' 
                   AND mst.is_active = true THEN 1
              ELSE 0
          END) as active_members,

          -- Expired members
          SUM(CASE
              WHEN mc.expiry_date < CURRENT_DATE - INTERVAL '90 days' 
                   OR mst.is_active = false THEN 1
              ELSE 0
          END) as expired_members,

          -- Inactive members (no expiry date)
          SUM(CASE
              WHEN mc.expiry_date IS NULL THEN 1
              ELSE 0
          END) as inactive_members,

          COUNT(mc.member_id) as total_members,

          -- Ward standing based on active members
          CASE
              WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 200 
                   THEN 'Good Standing'
              WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 100 
                   THEN 'Acceptable Standing'
              ELSE 'Needs Improvement'
          END as ward_standing,

          -- Standing level for sorting (1=Good, 2=Acceptable, 3=Needs Improvement)
          CASE
              WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 200 THEN 1
              WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 100 THEN 2
              ELSE 3
          END as standing_level,

          -- Active percentage
          ROUND(
              (SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) * 100.0) / 
              NULLIF(COUNT(mc.member_id), 0), 2
          ) as active_percentage,

          -- Target achievement (target = 200 members)
          ROUND(
              (SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) * 100.0) / 200, 2
          ) as target_achievement_percentage,

          -- Members needed for next level
          CASE
              WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 200 THEN 0
              WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 100 
                   THEN 200 - SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END)
              ELSE 100 - SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END)
          END as members_needed_next_level,

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
    await pool.query(createWardAuditView);
    console.log('   ✅ vw_ward_membership_audit created');

    // 3. Create vw_municipality_ward_performance
    console.log('\n3. Creating vw_municipality_ward_performance...');
    const createMunicipalityView = `
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
    await pool.query(createMunicipalityView);
    console.log('   ✅ vw_municipality_ward_performance created');

    // 4. Verify the views
    console.log('\n4. Verifying views...');
    const wardAuditTest = await pool.query('SELECT COUNT(*) as count, SUM(active_members) as total_active FROM vw_ward_membership_audit');
    console.log(`   vw_ward_membership_audit: ${wardAuditTest.rows[0].count} wards, ${wardAuditTest.rows[0].total_active} total active members`);

    const municipalityTest = await pool.query('SELECT COUNT(*) as count FROM vw_municipality_ward_performance');
    console.log(`   vw_municipality_ward_performance: ${municipalityTest.rows[0].count} municipalities`);

    // 5. Sample data
    console.log('\n5. Sample data from vw_ward_membership_audit:');
    const sampleData = await pool.query(`
      SELECT ward_code, ward_name, active_members, total_members, ward_standing 
      FROM vw_ward_membership_audit 
      WHERE active_members > 0 
      ORDER BY active_members DESC 
      LIMIT 5
    `);
    console.table(sampleData.rows);

    console.log('\n✅ Views fixed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

fixViews();

