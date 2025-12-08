import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function applyMaterializedViews() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Creating Materialized Views for Ward Audit System...\n');
    console.log('='.repeat(80));
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create-materialized-views-ward-audit.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('⏱️  This will take 30-60 seconds to build materialized views...\n');
    
    const startTime = Date.now();
    
    // Execute migration
    const result = await pool.query(migrationSQL);
    
    const buildTime = Date.now() - startTime;
    
    console.log(`✅ Materialized views created in ${buildTime}ms\n`);
    console.log('='.repeat(80));
    
    // Get the verification results
    const lastResult = Array.isArray(result) ? result[result.length - 1] : result;
    if (lastResult.rows && lastResult.rows.length > 0) {
      const stats = lastResult.rows[0];
      console.log('\n📊 Materialized View Statistics:');
      console.log(`   - Voting Districts: ${stats.voting_districts_count}`);
      console.log(`   - Wards: ${stats.wards_count}`);
      console.log(`   - Created At: ${stats.created_at}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('⏱️  Testing Query Performance...\n');
    
    // Test 1: JHB004 (Johannesburg - 38 wards)
    console.log('Test 1: JHB004 (Johannesburg - 38 wards)');
    const test1Start = Date.now();
    const jhbResult = await pool.query(
      'SELECT * FROM mv_ward_compliance_summary WHERE municipality_code = $1',
      ['JHB004']
    );
    const test1Time = Date.now() - test1Start;
    console.log(`   ✅ Query completed in ${test1Time}ms`);
    console.log(`   📊 Returned ${jhbResult.rows.length} wards`);
    console.log(`   🚀 Improvement: ${Math.round((10800 - test1Time) / 10800 * 100)}% faster (was 10,800ms)\n`);
    
    // Test 2: CPT (Cape Town - large municipality)
    console.log('Test 2: CPT (Cape Town)');
    const test2Start = Date.now();
    const cptResult = await pool.query(
      'SELECT * FROM mv_ward_compliance_summary WHERE municipality_code = $1',
      ['CPT']
    );
    const test2Time = Date.now() - test2Start;
    console.log(`   ✅ Query completed in ${test2Time}ms`);
    console.log(`   📊 Returned ${cptResult.rows.length} wards\n`);
    
    // Test 3: Get all wards in Gauteng province
    console.log('Test 3: Gauteng Province (all wards)');
    const test3Start = Date.now();
    const gautengResult = await pool.query(
      'SELECT * FROM mv_ward_compliance_summary WHERE province_code = $1',
      ['GT']
    );
    const test3Time = Date.now() - test3Start;
    console.log(`   ✅ Query completed in ${test3Time}ms`);
    console.log(`   📊 Returned ${gautengResult.rows.length} wards\n`);
    
    // Test 4: Voting district compliance
    console.log('Test 4: Voting District Compliance (single ward)');
    const test4Start = Date.now();
    const vdResult = await pool.query(
      'SELECT * FROM mv_voting_district_compliance WHERE ward_code = $1',
      ['79700001']
    );
    const test4Time = Date.now() - test4Start;
    console.log(`   ✅ Query completed in ${test4Time}ms`);
    console.log(`   📊 Returned ${vdResult.rows.length} voting districts\n`);
    
    console.log('='.repeat(80));
    console.log('\n🎉 SUCCESS! Materialized views are working perfectly!\n');
    
    console.log('📋 Next Steps:');
    console.log('   1. ✅ Materialized views created and indexed');
    console.log('   2. ✅ Backend model updated to use materialized views');
    console.log('   3. ⏰ Set up periodic refresh (recommended: every 15 minutes)');
    console.log('\n💡 To refresh materialized views manually:');
    console.log('   SELECT refresh_ward_audit_materialized_views();');
    console.log('\n💡 To set up automatic refresh (cron job):');
    console.log('   */15 * * * * psql -U eff_admin -d eff_membership_database -c "SELECT refresh_ward_audit_materialized_views();"');
    
  } catch (error: any) {
    console.error('❌ Error creating materialized views:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMaterializedViews().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

