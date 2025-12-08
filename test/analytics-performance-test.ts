/**
 * Analytics Performance Test
 * 
 * Compares performance between old and new analytics queries
 * Run this after creating materialized views to verify improvement
 */

import { executeQuery, executeQuerySingle } from '../backend/src/config/database';

interface PerformanceResult {
  test_name: string;
  duration_ms: number;
  row_count: number;
  status: 'success' | 'error';
  error?: string;
}

async function testOldQuery(): Promise<PerformanceResult> {
  const startTime = Date.now();
  
  try {
    // Simulate old complex query with multiple JOINs
    const result = await executeQuery(`
      SELECT
        w.ward_code,
        w.ward_name,
        m.municipality_name,
        p.province_name,
        COUNT(mem.member_id) as member_count
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
      GROUP BY w.ward_code, w.ward_name, m.municipality_name, p.province_name
      HAVING COUNT(mem.member_id) > 0
      ORDER BY member_count DESC
      LIMIT 10
    `, []);
    
    const duration = Date.now() - startTime;
    
    return {
      test_name: 'Old Query (Multiple JOINs)',
      duration_ms: duration,
      row_count: result.length,
      status: 'success'
    };
  } catch (error: any) {
    return {
      test_name: 'Old Query (Multiple JOINs)',
      duration_ms: Date.now() - startTime,
      row_count: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function testNewQuery(): Promise<PerformanceResult> {
  const startTime = Date.now();
  
  try {
    // New optimized query using materialized view
    const result = await executeQuery(`
      SELECT
        ward_code,
        ward_name,
        municipality_name,
        province_name,
        member_count
      FROM mv_geographic_performance
      ORDER BY member_count DESC
      LIMIT 10
    `, []);
    
    const duration = Date.now() - startTime;
    
    return {
      test_name: 'New Query (Materialized View)',
      duration_ms: duration,
      row_count: result.length,
      status: 'success'
    };
  } catch (error: any) {
    return {
      test_name: 'New Query (Materialized View)',
      duration_ms: Date.now() - startTime,
      row_count: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function testMembershipSummary(): Promise<PerformanceResult> {
  const startTime = Date.now();
  
  try {
    const result = await executeQuerySingle(`
      SELECT
        SUM(total_members) as total_members,
        SUM(age_18_24) as age_18_24,
        SUM(age_25_34) as age_25_34,
        SUM(male_count) as male_count,
        SUM(female_count) as female_count
      FROM mv_membership_analytics_summary
    `, []);
    
    const duration = Date.now() - startTime;
    
    return {
      test_name: 'Membership Summary (Materialized View)',
      duration_ms: duration,
      row_count: 1,
      status: 'success'
    };
  } catch (error: any) {
    return {
      test_name: 'Membership Summary (Materialized View)',
      duration_ms: Date.now() - startTime,
      row_count: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function testMembershipGrowth(): Promise<PerformanceResult> {
  const startTime = Date.now();
  
  try {
    const result = await executeQuery(`
      SELECT
        month,
        SUM(new_members) as new_members,
        MAX(cumulative_members) as cumulative_members
      FROM mv_membership_growth_monthly
      GROUP BY month
      ORDER BY month
    `, []);
    
    const duration = Date.now() - startTime;
    
    return {
      test_name: 'Membership Growth (Materialized View)',
      duration_ms: duration,
      row_count: result.length,
      status: 'success'
    };
  } catch (error: any) {
    return {
      test_name: 'Membership Growth (Materialized View)',
      duration_ms: Date.now() - startTime,
      row_count: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function runPerformanceTests(): Promise<void> {
  console.log('\n🚀 Starting Analytics Performance Tests...\n');
  console.log('='.repeat(80));
  
  // Run tests
  const results: PerformanceResult[] = [];
  
  console.log('\n📊 Test 1: Geographic Performance Query');
  const oldResult = await testOldQuery();
  results.push(oldResult);
  console.log(`   Old Query: ${oldResult.duration_ms}ms (${oldResult.row_count} rows)`);
  
  const newResult = await testNewQuery();
  results.push(newResult);
  console.log(`   New Query: ${newResult.duration_ms}ms (${newResult.row_count} rows)`);
  
  if (oldResult.status === 'success' && newResult.status === 'success') {
    const improvement = Math.round((oldResult.duration_ms / newResult.duration_ms) * 10) / 10;
    console.log(`   ⚡ Improvement: ${improvement}x faster`);
  }
  
  console.log('\n📊 Test 2: Membership Summary');
  const summaryResult = await testMembershipSummary();
  results.push(summaryResult);
  console.log(`   Duration: ${summaryResult.duration_ms}ms`);
  
  console.log('\n📊 Test 3: Membership Growth');
  const growthResult = await testMembershipGrowth();
  results.push(growthResult);
  console.log(`   Duration: ${growthResult.duration_ms}ms (${growthResult.row_count} months)`);
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Performance Test Summary:\n');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`   ✅ Successful Tests: ${successCount}/${results.length}`);
  console.log(`   ❌ Failed Tests: ${errorCount}/${results.length}`);
  
  if (errorCount > 0) {
    console.log('\n❌ Errors:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - ${r.test_name}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Performance tests complete!\n');
}

// Run tests
runPerformanceTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

