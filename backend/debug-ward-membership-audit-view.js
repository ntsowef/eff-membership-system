const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function debugWardMembershipAuditView() {
  console.log('🔍 Debugging vw_ward_membership_audit view structure...\n');

  try {
    // 1. Check if the view exists
    console.log('1. Checking if vw_ward_membership_audit view exists...');
    const viewExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_ward_membership_audit'
      );
    `;
    
    const viewExistsResult = await pool.query(viewExistsQuery);
    const viewExists = viewExistsResult.rows[0].exists;
    
    console.log(`View exists: ${viewExists}`);
    
    if (!viewExists) {
      console.log('❌ vw_ward_membership_audit view does not exist!');
      
      // Check for similar view names
      console.log('\n2. Looking for similar view names...');
      const similarViewsQuery = `
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%ward%'
        ORDER BY table_name;
      `;
      
      const similarViewsResult = await pool.query(similarViewsQuery);
      console.log('Similar views found:', similarViewsResult.rows);
      
      return;
    }

    // 2. Get the view structure
    console.log('\n2. Getting view structure...');
    const structureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vw_ward_membership_audit'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(structureQuery);
    console.log('View structure:');
    console.table(structureResult.rows);

    // 3. Get sample data to understand the structure
    console.log('\n3. Getting sample data (first 3 rows)...');
    const sampleDataQuery = `
      SELECT * FROM vw_ward_membership_audit 
      ORDER BY ward_code 
      LIMIT 3;
    `;
    
    const sampleDataResult = await pool.query(sampleDataQuery);
    console.log('Sample data:');
    if (sampleDataResult.rows.length > 0) {
      console.table(sampleDataResult.rows);
    } else {
      console.log('No data found in view');
    }

    // 4. Count total records
    console.log('\n4. Counting total records...');
    const countQuery = `SELECT COUNT(*) as total_records FROM vw_ward_membership_audit;`;
    const countResult = await pool.query(countQuery);
    console.log(`Total records: ${countResult.rows[0].total_records}`);

    // 5. Check for specific columns mentioned in the error
    console.log('\n5. Checking for specific columns...');
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'vw_ward_membership_audit'
      AND column_name IN ('inactive_members', 'active_members', 'expired_members', 'total_members')
      ORDER BY column_name;
    `;
    
    const columnCheckResult = await pool.query(columnCheckQuery);
    console.log('Found columns from the failing query:');
    console.table(columnCheckResult.rows);

  } catch (error) {
    console.error('❌ Error debugging view:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugWardMembershipAuditView().catch(console.error);
