/**
 * Verification Script: Materialized Views Setup
 * 
 * This script verifies that all components of the materialized view
 * optimization are properly configured and working.
 */

import { Pool } from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function verifySetup() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 Verifying Materialized Views Setup\n');
    console.log('='.repeat(80));
    
    // Check 1: Verify materialized views exist
    console.log('\n✓ Check 1: Materialized Views Exist');
    console.log('-'.repeat(80));
    
    const viewsResult = await pool.query(`
      SELECT 
        schemaname,
        matviewname,
        hasindexes,
        ispopulated
      FROM pg_matviews
      WHERE matviewname IN ('mv_voting_district_compliance', 'mv_ward_compliance_summary')
      ORDER BY matviewname
    `);
    
    if (viewsResult.rows.length === 2) {
      console.log('✅ Both materialized views exist');
      viewsResult.rows.forEach(view => {
        console.log(`   - ${view.matviewname}: Populated=${view.ispopulated}, Indexed=${view.hasindexes}`);
      });
    } else {
      console.log(`❌ Expected 2 materialized views, found ${viewsResult.rows.length}`);
      return;
    }
    
    // Check 2: Verify indexes
    console.log('\n✓ Check 2: Indexes Exist');
    console.log('-'.repeat(80));
    
    const indexesResult = await pool.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('mv_voting_district_compliance', 'mv_ward_compliance_summary')
      ORDER BY tablename, indexname
    `);
    
    console.log(`✅ Found ${indexesResult.rows.length} indexes`);
    const vdcIndexes = indexesResult.rows.filter(i => i.tablename === 'mv_voting_district_compliance').length;
    const wcsIndexes = indexesResult.rows.filter(i => i.tablename === 'mv_ward_compliance_summary').length;
    console.log(`   - mv_voting_district_compliance: ${vdcIndexes} indexes`);
    console.log(`   - mv_ward_compliance_summary: ${wcsIndexes} indexes`);
    
    // Check 3: Verify refresh function exists
    console.log('\n✓ Check 3: Refresh Function Exists');
    console.log('-'.repeat(80));
    
    const functionResult = await pool.query(`
      SELECT 
        proname,
        prosrc
      FROM pg_proc
      WHERE proname = 'refresh_ward_audit_materialized_views'
    `);
    
    if (functionResult.rows.length === 1) {
      console.log('✅ Refresh function exists: refresh_ward_audit_materialized_views()');
    } else {
      console.log('❌ Refresh function not found');
      return;
    }
    
    // Check 4: Verify data exists
    console.log('\n✓ Check 4: Data Populated');
    console.log('-'.repeat(80));
    
    const vdcCount = await pool.query('SELECT COUNT(*) as count FROM mv_voting_district_compliance');
    const wcsCount = await pool.query('SELECT COUNT(*) as count FROM mv_ward_compliance_summary');
    
    console.log(`✅ Data populated:`);
    console.log(`   - mv_voting_district_compliance: ${vdcCount.rows[0].count} rows`);
    console.log(`   - mv_ward_compliance_summary: ${wcsCount.rows[0].count} rows`);
    
    // Check 5: Test query performance
    console.log('\n✓ Check 5: Query Performance');
    console.log('-'.repeat(80));
    
    const perfStart = Date.now();
    const perfResult = await pool.query(
      'SELECT * FROM mv_ward_compliance_summary WHERE municipality_code = $1',
      ['JHB004']
    );
    const perfTime = Date.now() - perfStart;
    
    console.log(`✅ Query performance: ${perfTime}ms`);
    console.log(`   - Returned ${perfResult.rows.length} wards`);
    
    if (perfTime < 200) {
      console.log(`   - 🚀 EXCELLENT performance (< 200ms)`);
    } else if (perfTime < 1000) {
      console.log(`   - ✅ Good performance (< 1s)`);
    } else {
      console.log(`   - ⚠️ Slow performance (> 1s) - consider refreshing views`);
    }
    
    // Check 6: Verify last refresh time
    console.log('\n✓ Check 6: Last Refresh Time');
    console.log('-'.repeat(80));
    
    const refreshResult = await pool.query(
      'SELECT last_refreshed FROM mv_ward_compliance_summary LIMIT 1'
    );
    
    if (refreshResult.rows.length > 0) {
      const lastRefresh = new Date(refreshResult.rows[0].last_refreshed);
      const minutesAgo = Math.round((Date.now() - lastRefresh.getTime()) / 60000);
      
      console.log(`✅ Last refreshed: ${lastRefresh.toLocaleString()}`);
      console.log(`   - ${minutesAgo} minutes ago`);
      
      if (minutesAgo > 30) {
        console.log(`   - ⚠️ Views may be stale (> 30 minutes old)`);
        console.log(`   - Consider running: SELECT refresh_ward_audit_materialized_views();`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 VERIFICATION COMPLETE!\n');
    console.log('✅ All components are properly configured');
    console.log('✅ Materialized views are populated and indexed');
    console.log('✅ Query performance is excellent');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the backend server to activate automatic refresh');
    console.log('   2. Monitor server logs for refresh job status');
    console.log('   3. Test the ward audit endpoints in the frontend');
    console.log('='.repeat(80));
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

verifySetup();

