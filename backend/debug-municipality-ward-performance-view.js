const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function debugMunicipalityWardPerformanceView() {
  console.log('🔍 Debugging vw_municipality_ward_performance view...\n');

  try {
    // 1. Check if the view exists
    console.log('1. Checking if vw_municipality_ward_performance view exists...');
    const viewExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_municipality_ward_performance'
      );
    `;
    
    const viewExistsResult = await pool.query(viewExistsQuery);
    const viewExists = viewExistsResult.rows[0].exists;
    
    console.log(`View exists: ${viewExists}`);
    
    if (!viewExists) {
      console.log('❌ vw_municipality_ward_performance view does not exist!');
      
      // Check for similar view names
      console.log('\n2. Looking for similar view names...');
      const similarViewsQuery = `
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%municipality%' OR table_name LIKE '%performance%')
        ORDER BY table_name;
      `;
      
      const similarViewsResult = await pool.query(similarViewsQuery);
      console.log('Similar views found:');
      console.table(similarViewsResult.rows);
      
      // Check what data we have available to create this view
      console.log('\n3. Checking available data sources...');
      
      // Check if we have the ward audit view (which we just fixed)
      const wardAuditQuery = `
        SELECT 
          municipality_code,
          municipality_name,
          district_code,
          district_name,
          province_code,
          province_name,
          COUNT(*) as total_wards,
          SUM(CASE WHEN standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
          SUM(CASE WHEN standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
          SUM(CASE WHEN standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,
          SUM(active_members) as total_active_members,
          SUM(total_members) as total_all_members,
          ROUND(AVG(active_members), 1) as avg_active_per_ward
        FROM vw_ward_membership_audit
        WHERE province_code = 'LP'
        GROUP BY municipality_code, municipality_name, district_code, district_name, province_code, province_name
        ORDER BY total_active_members DESC
        LIMIT 5;
      `;
      
      const wardAuditResult = await pool.query(wardAuditQuery);
      console.log('Sample municipality data from ward audit view:');
      if (wardAuditResult.rows.length > 0) {
        console.table(wardAuditResult.rows);
      } else {
        console.log('No data found for province LP');
      }
      
      return;
    }

    // If view exists, get its structure
    console.log('\n2. Getting view structure...');
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
    console.log('View structure:');
    console.table(structureResult.rows);

  } catch (error) {
    console.error('❌ Error debugging view:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugMunicipalityWardPerformanceView().catch(console.error);
