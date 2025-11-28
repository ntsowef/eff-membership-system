const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function recreateWardMembershipAuditView() {
  console.log('🔄 Recreating vw_ward_membership_audit view with correct structure...\n');

  try {
    // 1. Drop the existing view
    console.log('1. Dropping existing view...');
    const dropViewQuery = `DROP VIEW IF EXISTS vw_ward_membership_audit CASCADE;`;
    await pool.query(dropViewQuery);
    console.log('✅ Existing view dropped');

    // 2. Create the corrected view with PostgreSQL syntax
    console.log('\n2. Creating new view with correct structure...');
    const createViewQuery = `
      CREATE VIEW vw_ward_membership_audit AS
      SELECT
          w.ward_code,
          w.ward_name,
          w.ward_number,
          w.municipality_code,
          m.municipality_name,
          m.district_code,
          d.district_name,
          d.province_code,
          p.province_name,

          -- Active member counts (based on expiry date and status)
          SUM(CASE
              WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
              ELSE 0
          END) as active_members,

          SUM(CASE
              WHEN ms.expiry_date < CURRENT_DATE OR mst.is_active = false THEN 1
              ELSE 0
          END) as expired_members,

          SUM(CASE
              WHEN ms.expiry_date IS NULL THEN 1
              ELSE 0
          END) as inactive_members,

          COUNT(mem.member_id) as total_members,

          -- Standing classification based on active members
          CASE
              WHEN SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) >= 200 THEN 'Good Standing'
              WHEN SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) >= 100 THEN 'Acceptable Standing'
              ELSE 'Needs Improvement'
          END as ward_standing,

          -- Standing level for sorting (1=Good, 2=Acceptable, 3=Needs Improvement)
          CASE
              WHEN SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) >= 200 THEN 1
              WHEN SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) >= 100 THEN 2
              ELSE 3
          END as standing_level,

          -- Performance metrics
          ROUND(
              (SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) * 100.0) / NULLIF(COUNT(mem.member_id), 0), 2
          ) as active_percentage,

          -- Target achievement (200 members = 100%)
          ROUND(
              (SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) * 100.0) / 200, 2
          ) as target_achievement_percentage,

          -- Members needed to reach next level
          CASE
              WHEN SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) >= 200 THEN 0
              WHEN SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END) >= 100 THEN
                  200 - SUM(CASE
                      WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                      ELSE 0
                  END)
              ELSE 100 - SUM(CASE
                  WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = true THEN 1
                  ELSE 0
              END)
          END as members_needed_next_level,

          -- Last updated timestamp
          NOW() as last_updated

      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN members mem ON w.ward_code = mem.ward_code
      LEFT JOIN memberships ms ON mem.member_id = ms.member_id
      LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
      GROUP BY
          w.ward_code, w.ward_name, w.ward_number, w.municipality_code, m.municipality_name,
          m.district_code, d.district_name, d.province_code, p.province_name;
    `;

    await pool.query(createViewQuery);
    console.log('✅ New view created successfully');

    // 3. Verify the new view structure
    console.log('\n3. Verifying new view structure...');
    const structureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vw_ward_membership_audit'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(structureQuery);
    console.log('New view structure:');
    console.table(structureResult.rows);

    // 4. Test the view with a sample query
    console.log('\n4. Testing view with sample query...');
    const testQuery = `
      SELECT
        ward_code,
        ward_name,
        active_members,
        expired_members,
        inactive_members,
        total_members,
        ward_standing,
        standing_level,
        active_percentage,
        target_achievement_percentage,
        members_needed_next_level
      FROM vw_ward_membership_audit
      WHERE municipality_code = 'GT423'
      ORDER BY active_members DESC
      LIMIT 3;
    `;
    
    const testResult = await pool.query(testQuery);
    console.log('Sample query results:');
    if (testResult.rows.length > 0) {
      console.table(testResult.rows);
    } else {
      console.log('No data found for municipality GT423');
    }

    // 5. Count total records
    console.log('\n5. Counting total records...');
    const countQuery = `SELECT COUNT(*) as total_records FROM vw_ward_membership_audit;`;
    const countResult = await pool.query(countQuery);
    console.log(`Total records: ${countResult.rows[0].total_records}`);

  } catch (error) {
    console.error('❌ Error recreating view:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

recreateWardMembershipAuditView().catch(console.error);
