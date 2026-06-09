const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

// Create the dependency view first
async function createWardMembershipAuditView() {
  console.log('📝 Creating vw_ward_membership_audit view...');

  const createViewSQL = `
    CREATE OR REPLACE VIEW vw_ward_membership_audit AS
    SELECT
        w.ward_code,
        w.ward_name,
        w.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name,

        -- Active member counts (based on expiry date with 90-day grace period)
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

        -- Compliance percentage
        ROUND(
            (SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(mc.member_id), 0), 2
        ) as compliance_percentage,

        -- Standing based on active members (200 = good, 100-199 = acceptable, <100 = needs improvement)
        CASE
            WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 200 THEN 'Good Standing'
            WHEN SUM(CASE WHEN mc.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mst.is_active = true THEN 1 ELSE 0 END) >= 100 THEN 'Acceptable Standing'
            ELSE 'Needs Improvement'
        END as standing_status,

        -- Standing level for sorting
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
  console.log('🔄 Creating vw_municipality_ward_performance view...\n');

  try {
    // 0. Check if vw_ward_membership_audit exists (dependency)
    console.log('0. Checking for dependency view vw_ward_membership_audit...');
    const checkDepView = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'vw_ward_membership_audit'
      ) as exists
    `);

    if (!checkDepView.rows[0].exists) {
      console.log('❌ vw_ward_membership_audit does not exist! Creating it first...');
      await createWardMembershipAuditView();
    } else {
      console.log('✅ vw_ward_membership_audit exists');
    }

    // 1. Drop the existing view if it exists
    console.log('\n1. Dropping existing view if it exists...');
    const dropViewQuery = `DROP VIEW IF EXISTS vw_municipality_ward_performance CASCADE;`;
    await pool.query(dropViewQuery);
    console.log('✅ Existing view dropped (if it existed)');

    // 2. Create the municipality ward performance view with PostgreSQL syntax
    console.log('\n2. Creating new municipality ward performance view...');
    const createViewQuery = `
      CREATE VIEW vw_municipality_ward_performance AS
      SELECT
          m.municipality_code,
          m.municipality_name,
          m.district_code,
          d.district_name,
          d.province_code,
          p.province_name,

          -- Ward counts by standing
          COUNT(wa.ward_code) as total_wards,
          SUM(CASE WHEN wa.standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
          SUM(CASE WHEN wa.standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
          SUM(CASE WHEN wa.standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,

          -- Compliance calculation (Good + Acceptable / Total)
          SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) as compliant_wards,
          ROUND(
              (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
              NULLIF(COUNT(wa.ward_code), 0), 2
          ) as compliance_percentage,

          -- Municipality performance classification
          CASE
              WHEN ROUND(
                  (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
                  NULLIF(COUNT(wa.ward_code), 0), 2
              ) >= 70 THEN 'Performing Municipality'
              ELSE 'Underperforming Municipality'
          END as municipality_performance,

          -- Performance level for sorting (1=Performing, 2=Underperforming)
          CASE
              WHEN ROUND(
                  (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
                  NULLIF(COUNT(wa.ward_code), 0), 2
              ) >= 70 THEN 1
              ELSE 2
          END as performance_level,

          -- Aggregate member statistics
          COALESCE(SUM(wa.active_members), 0) as total_active_members,
          COALESCE(SUM(wa.total_members), 0) as total_all_members,
          ROUND(COALESCE(AVG(wa.active_members), 0), 1) as avg_active_per_ward,

          -- Wards needed to reach compliance (70%)
          CASE
              WHEN ROUND(
                  (SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
                  NULLIF(COUNT(wa.ward_code), 0), 2
              ) >= 70 THEN 0
              ELSE CEIL(COUNT(wa.ward_code) * 0.7) - SUM(CASE WHEN wa.standing_level IN (1, 2) THEN 1 ELSE 0 END)
          END as wards_needed_compliance,

          NOW() as last_updated

      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN vw_ward_membership_audit wa ON m.municipality_code = wa.municipality_code
      GROUP BY
          m.municipality_code, m.municipality_name, m.district_code, d.district_name,
          d.province_code, p.province_name;
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
      AND table_name = 'vw_municipality_ward_performance'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(structureQuery);
    console.log('New view structure:');
    console.table(structureResult.rows);

    // 4. Test the view with sample queries
    console.log('\n4. Testing view with sample queries...');
    
    // Test the original failing query with a valid province
    const testQuery1 = `
      SELECT COUNT(*) as total_count
      FROM vw_municipality_ward_performance
      WHERE province_code = $1;
    `;
    
    const testResult1 = await pool.query(testQuery1, ['GP']); // Use Gauteng instead of LP
    console.log(`✅ Count query for GP province: ${testResult1.rows[0].total_count} municipalities`);

    // Test with sample data
    const testQuery2 = `
      SELECT
        municipality_code,
        municipality_name,
        province_name,
        total_wards,
        compliance_percentage,
        municipality_performance,
        total_active_members
      FROM vw_municipality_ward_performance
      WHERE province_code = $1
      ORDER BY total_active_members DESC
      LIMIT 3;
    `;
    
    const testResult2 = await pool.query(testQuery2, ['GP']);
    console.log('Sample municipality performance data for GP:');
    if (testResult2.rows.length > 0) {
      console.table(testResult2.rows);
    } else {
      console.log('No data found for province GP');
    }

    // 5. Test with the original failing province to see if it exists now
    console.log('\n5. Testing with original failing province (LP)...');
    const testResult3 = await pool.query(testQuery1, ['LP']);
    console.log(`Count query for LP province: ${testResult3.rows[0].total_count} municipalities`);

    // 6. Show available provinces
    console.log('\n6. Available provinces in the view:');
    const provincesQuery = `
      SELECT DISTINCT province_code, province_name, COUNT(*) as municipality_count
      FROM vw_municipality_ward_performance
      WHERE province_code IS NOT NULL
      GROUP BY province_code, province_name
      ORDER BY municipality_count DESC;
    `;
    
    const provincesResult = await pool.query(provincesQuery);
    console.table(provincesResult.rows);

  } catch (error) {
    console.error('❌ Error creating view:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

createMunicipalityWardPerformanceView().catch(console.error);
