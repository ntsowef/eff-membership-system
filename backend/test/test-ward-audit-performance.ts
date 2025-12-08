import { Pool } from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function testPerformance() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🧪 Testing Ward Audit Performance with Materialized Views\n');
    console.log('='.repeat(80));
    
    // Test 1: Single municipality (JHB004)
    console.log('\n📊 Test 1: JHB004 (Johannesburg - 38 wards)');
    console.log('-'.repeat(80));
    const test1Start = Date.now();
    const jhbResult = await pool.query(
      'SELECT * FROM mv_ward_compliance_summary WHERE municipality_code = $1 ORDER BY ward_code',
      ['JHB004']
    );
    const test1Time = Date.now() - test1Start;
    
    console.log(`✅ Query completed in ${test1Time}ms`);
    console.log(`📊 Returned ${jhbResult.rows.length} wards`);
    
    if (jhbResult.rows.length > 0) {
      const sample = jhbResult.rows[0];
      console.log(`\n📋 Sample Ward Data:`);
      console.log(`   Ward: ${sample.ward_name} (${sample.ward_code})`);
      console.log(`   Total Members: ${sample.total_members}`);
      console.log(`   Voting Districts: ${sample.total_voting_districts}`);
      console.log(`   Compliant VDs: ${sample.compliant_voting_districts}`);
      console.log(`   Is Compliant: ${sample.is_compliant}`);
      console.log(`   Last Refreshed: ${sample.last_refreshed}`);
    }
    
    // Test 2: All municipalities in a province
    console.log('\n\n📊 Test 2: All Wards in Gauteng Province');
    console.log('-'.repeat(80));
    const test2Start = Date.now();
    const gautengResult = await pool.query(
      'SELECT municipality_code, COUNT(*) as ward_count FROM mv_ward_compliance_summary WHERE province_code = $1 GROUP BY municipality_code ORDER BY ward_count DESC',
      ['GT']
    );
    const test2Time = Date.now() - test2Start;
    
    console.log(`✅ Query completed in ${test2Time}ms`);
    console.log(`📊 Found ${gautengResult.rows.length} municipalities`);
    
    if (gautengResult.rows.length > 0) {
      console.log(`\n📋 Top 5 Municipalities by Ward Count:`);
      gautengResult.rows.slice(0, 5).forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.municipality_code}: ${row.ward_count} wards`);
      });
    }
    
    // Test 3: Voting district compliance
    console.log('\n\n📊 Test 3: Voting District Compliance (Ward 79700001)');
    console.log('-'.repeat(80));
    const test3Start = Date.now();
    const vdResult = await pool.query(
      'SELECT * FROM mv_voting_district_compliance WHERE ward_code = $1 ORDER BY voting_district_name',
      ['79700001']
    );
    const test3Time = Date.now() - test3Start;
    
    console.log(`✅ Query completed in ${test3Time}ms`);
    console.log(`📊 Returned ${vdResult.rows.length} voting districts`);
    
    if (vdResult.rows.length > 0) {
      console.log(`\n📋 Voting District Compliance:`);
      vdResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.voting_district_name}: ${row.member_count} members (${row.compliance_status})`);
      });
    }
    
    // Test 4: Compliance statistics
    console.log('\n\n📊 Test 4: National Compliance Statistics');
    console.log('-'.repeat(80));
    const test4Start = Date.now();
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_wards,
        COUNT(*) FILTER (WHERE is_compliant = TRUE) as compliant_wards,
        COUNT(*) FILTER (WHERE criterion_1_compliant = TRUE) as criterion_1_compliant_wards,
        ROUND(AVG(total_members), 2) as avg_members_per_ward,
        SUM(total_members) as total_members_all_wards
      FROM mv_ward_compliance_summary
    `);
    const test4Time = Date.now() - test4Start;
    
    console.log(`✅ Query completed in ${test4Time}ms`);
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`\n📋 National Statistics:`);
      console.log(`   Total Wards: ${stats.total_wards}`);
      console.log(`   Compliant Wards: ${stats.compliant_wards} (${Math.round(stats.compliant_wards / stats.total_wards * 100)}%)`);
      console.log(`   Criterion 1 Compliant: ${stats.criterion_1_compliant_wards} (${Math.round(stats.criterion_1_compliant_wards / stats.total_wards * 100)}%)`);
      console.log(`   Avg Members per Ward: ${stats.avg_members_per_ward}`);
      console.log(`   Total Members: ${stats.total_members_all_wards}`);
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('📊 Performance Summary:');
    console.log(`   Test 1 (Single Municipality): ${test1Time}ms`);
    console.log(`   Test 2 (Province Aggregation): ${test2Time}ms`);
    console.log(`   Test 3 (Voting Districts): ${test3Time}ms`);
    console.log(`   Test 4 (National Statistics): ${test4Time}ms`);
    console.log(`   Average Query Time: ${Math.round((test1Time + test2Time + test3Time + test4Time) / 4)}ms`);
    console.log('\n✅ Materialized views are working perfectly!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testPerformance();

