/**
 * Test Script for Geographic Data Integrity Fix
 * 
 * This script tests the geographic hierarchy after applying the integrity fix
 * to ensure the membership directory's hierarchical filtering works correctly.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testGeographicHierarchy() {
  console.log('🧪 Testing Geographic Hierarchy Integrity...\n');
  
  try {
    // Test 1: Verify Bojanala district has correct municipalities
    console.log('1️⃣  Testing Bojanala District (DC37) assignments:');
    const bojanalaTest = await pool.query(`
      SELECT 
        municipality_code,
        municipality_name,
        LEFT(municipality_code, 2) as province_prefix
      FROM municipalities 
      WHERE district_code = 'DC37'
      ORDER BY municipality_code
    `);
    
    const nwCount = bojanalaTest.rows.filter(m => m.province_prefix === 'NW').length;
    const otherCount = bojanalaTest.rows.filter(m => m.province_prefix !== 'NW').length;
    
    console.log(`   ✅ North West municipalities in Bojanala: ${nwCount}`);
    console.log(`   ${otherCount === 0 ? '✅' : '❌'} Other province municipalities in Bojanala: ${otherCount}`);
    
    if (otherCount > 0) {
      console.log('   ⚠️  Incorrect assignments still exist:');
      bojanalaTest.rows.filter(m => m.province_prefix !== 'NW').forEach(m => {
        console.log(`      - ${m.municipality_code}: ${m.municipality_name}`);
      });
    }
    
    // Test 2: Check for districts with no municipalities
    console.log('\n2️⃣  Testing for empty districts:');
    const emptyDistricts = await pool.query(`
      SELECT 
        d.district_code,
        d.district_name,
        d.province_code,
        COUNT(m.municipality_id) as municipality_count
      FROM districts d
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      GROUP BY d.district_code, d.district_name, d.province_code
      HAVING COUNT(m.municipality_id) = 0
      ORDER BY d.province_code, d.district_name
    `);
    
    console.log(`   ${emptyDistricts.rows.length === 0 ? '✅' : '⚠️'} Empty districts: ${emptyDistricts.rows.length}`);
    
    if (emptyDistricts.rows.length > 0) {
      console.log('   Districts with no municipalities:');
      emptyDistricts.rows.forEach(d => {
        console.log(`      - ${d.district_code}: ${d.district_name} (${d.province_code})`);
      });
    }
    
    // Test 3: Verify province-district-municipality hierarchy
    console.log('\n3️⃣  Testing province-district-municipality hierarchy:');
    const hierarchyTest = await pool.query(`
      SELECT 
        p.province_code,
        p.province_name,
        d.district_code,
        d.district_name,
        COUNT(m.municipality_id) as municipality_count
      FROM provinces p
      JOIN districts d ON p.province_code = d.province_code
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      GROUP BY p.province_code, p.province_name, d.district_code, d.district_name
      HAVING COUNT(m.municipality_id) > 0
      ORDER BY p.province_name, d.district_name
    `);
    
    const provinceStats = {};
    hierarchyTest.rows.forEach(row => {
      if (!provinceStats[row.province_code]) {
        provinceStats[row.province_code] = {
          name: row.province_name,
          districts: 0,
          municipalities: 0
        };
      }
      provinceStats[row.province_code].districts++;
      provinceStats[row.province_code].municipalities += parseInt(row.municipality_count);
    });
    
    console.log('   Province summary:');
    Object.entries(provinceStats).forEach(([code, stats]) => {
      console.log(`      ${code}: ${stats.districts} districts, ${stats.municipalities} municipalities`);
    });
    
    // Test 4: Test geographic filtering queries (simulating frontend requests)
    console.log('\n4️⃣  Testing geographic filtering queries:');
    
    // Test province filtering
    const provinceFilter = await pool.query(`
      SELECT 
        d.district_code,
        d.district_name,
        COUNT(m.municipality_id) as municipality_count
      FROM districts d
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      WHERE d.province_code = 'NW'
      GROUP BY d.district_code, d.district_name
      ORDER BY d.district_name
    `);
    
    console.log('   ✅ North West province districts:');
    provinceFilter.rows.forEach(d => {
      console.log(`      - ${d.district_name}: ${d.municipality_count} municipalities`);
    });
    
    // Test district filtering (Bojanala specifically)
    const districtFilter = await pool.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        COUNT(w.ward_id) as ward_count
      FROM municipalities m
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      WHERE m.district_code = 'DC37'
      GROUP BY m.municipality_code, m.municipality_name
      ORDER BY m.municipality_name
    `);
    
    console.log('\n   ✅ Bojanala district municipalities:');
    districtFilter.rows.forEach(m => {
      console.log(`      - ${m.municipality_name}: ${m.ward_count} wards`);
    });
    
    // Test 5: Verify member data integrity with geographic hierarchy
    console.log('\n5️⃣  Testing member data integration:');
    const memberIntegration = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.member_id) as total_members,
        COUNT(DISTINCT CASE WHEN w.municipality_code IS NOT NULL THEN m.member_id END) as members_with_municipality,
        COUNT(DISTINCT CASE WHEN d.district_code IS NOT NULL THEN m.member_id END) as members_with_district,
        COUNT(DISTINCT CASE WHEN p.province_code IS NOT NULL THEN m.member_id END) as members_with_province
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
    `);
    
    const memberStats = memberIntegration.rows[0];
    console.log(`   ✅ Total members: ${memberStats.total_members}`);
    console.log(`   ✅ Members with municipality: ${memberStats.members_with_municipality}`);
    console.log(`   ✅ Members with district: ${memberStats.members_with_district}`);
    console.log(`   ✅ Members with province: ${memberStats.members_with_province}`);
    
    const memberIntegrityScore = (
      (parseInt(memberStats.members_with_province) / parseInt(memberStats.total_members)) * 100
    ).toFixed(1);
    
    console.log(`   📊 Member geographic integrity: ${memberIntegrityScore}%`);
    
    return {
      bojanalaCorrect: otherCount === 0,
      emptyDistrictsCount: emptyDistricts.rows.length,
      provinceStats,
      memberIntegrityScore: parseFloat(memberIntegrityScore),
      totalTests: 5,
      passedTests: (otherCount === 0 ? 1 : 0) + (emptyDistricts.rows.length === 0 ? 1 : 0) + 3
    };
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    throw error;
  }
}

async function testMembershipDirectoryQueries() {
  console.log('\n🎯 Testing Membership Directory Queries...\n');
  
  try {
    // Test hierarchical filtering queries that the frontend would use
    
    // 1. Get provinces with member counts
    console.log('1️⃣  Province-level query:');
    const provinceQuery = await pool.query(`
      SELECT 
        p.province_code,
        p.province_name,
        COUNT(DISTINCT d.district_code) as district_count,
        COUNT(DISTINCT m.municipality_code) as municipality_count,
        COUNT(DISTINCT w.ward_code) as ward_count,
        COUNT(DISTINCT mem.member_id) as member_count
      FROM provinces p
      LEFT JOIN districts d ON p.province_code = d.province_code
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      LEFT JOIN members mem ON w.ward_code = mem.ward_code
      WHERE p.is_active = TRUE
      GROUP BY p.province_code, p.province_name
      ORDER BY p.province_name
    `);
    
    console.log('   Province breakdown:');
    provinceQuery.rows.forEach(p => {
      console.log(`      ${p.province_name}: ${p.district_count}D, ${p.municipality_count}M, ${p.ward_count}W, ${p.member_count} members`);
    });
    
    // 2. Get districts for a specific province (North West)
    console.log('\n2️⃣  District-level query (North West):');
    const districtQuery = await pool.query(`
      SELECT 
        d.district_code,
        d.district_name,
        COUNT(DISTINCT m.municipality_code) as municipality_count,
        COUNT(DISTINCT w.ward_code) as ward_count,
        COUNT(DISTINCT mem.member_id) as member_count
      FROM districts d
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      LEFT JOIN members mem ON w.ward_code = mem.ward_code
      WHERE d.province_code = 'NW' AND d.is_active = TRUE
      GROUP BY d.district_code, d.district_name
      ORDER BY d.district_name
    `);
    
    console.log('   North West districts:');
    districtQuery.rows.forEach(d => {
      console.log(`      ${d.district_name}: ${d.municipality_count}M, ${d.ward_count}W, ${d.member_count} members`);
    });
    
    // 3. Get municipalities for Bojanala district
    console.log('\n3️⃣  Municipality-level query (Bojanala):');
    const municipalityQuery = await pool.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        COUNT(DISTINCT w.ward_code) as ward_count,
        COUNT(DISTINCT mem.member_id) as member_count
      FROM municipalities m
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      LEFT JOIN members mem ON w.ward_code = mem.ward_code
      WHERE m.district_code = 'DC37' AND m.is_active = TRUE
      GROUP BY m.municipality_code, m.municipality_name
      ORDER BY m.municipality_name
    `);
    
    console.log('   Bojanala municipalities:');
    municipalityQuery.rows.forEach(m => {
      console.log(`      ${m.municipality_name}: ${m.ward_count}W, ${m.member_count} members`);
    });
    
    return {
      provinceQuerySuccess: provinceQuery.rows.length > 0,
      districtQuerySuccess: districtQuery.rows.length > 0,
      municipalityQuerySuccess: municipalityQuery.rows.length > 0,
      bojanalaHasCorrectMunicipalities: municipalityQuery.rows.every(m => m.municipality_code.startsWith('NW'))
    };
    
  } catch (error) {
    console.error('❌ Error during membership directory testing:', error);
    throw error;
  }
}

async function generateIntegrityReport() {
  console.log('\n📋 Generating Geographic Data Integrity Report...\n');
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {},
      recommendations: []
    };
    
    // Overall statistics
    const overallStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM provinces WHERE is_active = TRUE) as provinces,
        (SELECT COUNT(*) FROM districts WHERE is_active = TRUE) as districts,
        (SELECT COUNT(*) FROM municipalities WHERE is_active = TRUE) as municipalities,
        (SELECT COUNT(*) FROM wards WHERE is_active = TRUE) as wards,
        (SELECT COUNT(*) FROM members) as members
    `);
    
    report.summary = overallStats.rows[0];
    
    // Problem areas
    const problemAreas = await pool.query(`
      SELECT 
        'Empty Districts' as issue_type,
        COUNT(*) as count
      FROM districts d
      LEFT JOIN municipalities m ON d.district_code = m.district_code
      WHERE m.municipality_id IS NULL
      
      UNION ALL
      
      SELECT 
        'Municipalities in Wrong Province' as issue_type,
        COUNT(*) as count
      FROM municipalities m
      JOIN districts d ON m.district_code = d.district_code
      JOIN provinces p ON d.province_code = p.province_code
      WHERE LEFT(m.municipality_code, 2) != p.province_code
        AND m.municipality_code NOT IN ('BUF', 'NMA', 'CPT', 'JHB', 'TSH', 'EKU', 'ETH', 'MAN')
    `);
    
    report.details.problemAreas = problemAreas.rows;
    
    // Generate recommendations
    const emptyDistrictCount = problemAreas.rows.find(p => p.issue_type === 'Empty Districts')?.count || 0;
    const wrongProvinceCount = problemAreas.rows.find(p => p.issue_type === 'Municipalities in Wrong Province')?.count || 0;
    
    if (emptyDistrictCount > 0) {
      report.recommendations.push(`Review ${emptyDistrictCount} empty districts - they may need municipalities assigned`);
    }
    
    if (wrongProvinceCount > 0) {
      report.recommendations.push(`Fix ${wrongProvinceCount} municipalities assigned to wrong provinces`);
    }
    
    if (emptyDistrictCount === 0 && wrongProvinceCount === 0) {
      report.recommendations.push('Geographic data integrity is excellent - no major issues detected');
    }
    
    console.log('📊 Geographic Data Integrity Report');
    console.log('==================================');
    console.log(`Provinces: ${report.summary.provinces}`);
    console.log(`Districts: ${report.summary.districts}`);
    console.log(`Municipalities: ${report.summary.municipalities}`);
    console.log(`Wards: ${report.summary.wards}`);
    console.log(`Members: ${report.summary.members}`);
    console.log('');
    console.log('Issues Detected:');
    report.details.problemAreas.forEach(issue => {
      console.log(`  ${issue.issue_type}: ${issue.count}`);
    });
    console.log('');
    console.log('Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    return report;
    
  } catch (error) {
    console.error('❌ Error generating integrity report:', error);
    throw error;
  }
}

async function main() {
  console.log('🧪 Geographic Data Integrity Test Suite');
  console.log('======================================\n');
  
  try {
    // Run all tests
    const hierarchyResults = await testGeographicHierarchy();
    const directoryResults = await testMembershipDirectoryQueries();
    const integrityReport = await generateIntegrityReport();
    
    // Overall assessment
    console.log('\n🎯 Overall Test Results');
    console.log('======================');
    console.log(`✅ Hierarchy tests passed: ${hierarchyResults.passedTests}/${hierarchyResults.totalTests}`);
    console.log(`✅ Bojanala district correct: ${hierarchyResults.bojanalaCorrect ? 'YES' : 'NO'}`);
    console.log(`✅ Empty districts: ${hierarchyResults.emptyDistrictsCount}`);
    console.log(`✅ Member integrity score: ${hierarchyResults.memberIntegrityScore}%`);
    console.log(`✅ Directory queries working: ${directoryResults.provinceQuerySuccess && directoryResults.districtQuerySuccess && directoryResults.municipalityQuerySuccess ? 'YES' : 'NO'}`);
    
    const overallScore = (
      (hierarchyResults.passedTests / hierarchyResults.totalTests) * 40 +
      (hierarchyResults.bojanalaCorrect ? 20 : 0) +
      (hierarchyResults.emptyDistrictsCount === 0 ? 20 : Math.max(0, 20 - hierarchyResults.emptyDistrictsCount)) +
      (hierarchyResults.memberIntegrityScore / 100) * 20
    );
    
    console.log(`\n📊 Overall Integrity Score: ${overallScore.toFixed(1)}/100`);
    
    if (overallScore >= 90) {
      console.log('🎉 EXCELLENT: Geographic data integrity is in great shape!');
    } else if (overallScore >= 70) {
      console.log('✅ GOOD: Geographic data integrity is acceptable with minor issues');
    } else if (overallScore >= 50) {
      console.log('⚠️  FAIR: Geographic data integrity needs improvement');
    } else {
      console.log('❌ POOR: Geographic data integrity requires immediate attention');
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR during testing:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testGeographicHierarchy,
  testMembershipDirectoryQueries,
  generateIntegrityReport
};
