/**
 * Investigation Script: EC (Eastern Cape) Province Municipality Codes
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function investigateECMunicipalityCodes() {
  console.log('🔍 INVESTIGATION: EC (Eastern Cape) Province Municipality Codes\n');
  console.log('='.repeat(80));
  
  // Initialize database first
  await initializeDatabase();
  
  try {
    // 1. Total EC members and municipality_code status
    console.log('\n📊 1. EC Members Municipality Code Status:');
    console.log('-'.repeat(80));
    
    const totalQuery = `
      SELECT 
        COUNT(*) as total_ec_members,
        COUNT(municipality_code) as with_muni_code,
        COUNT(*) - COUNT(municipality_code) as null_muni_code,
        COUNT(CASE WHEN municipality_code = '' THEN 1 END) as empty_string_muni_code,
        ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_code
      FROM members_consolidated 
      WHERE province_code = 'EC';
    `;
    
    const totalResult = await executeQuery(totalQuery);
    console.table(totalResult);
    
    // 2. Sample of EC members with NULL municipality_code
    console.log('\n📋 2. Sample EC Members with NULL municipality_code (First 10):');
    console.log('-'.repeat(80));
    
    const nullSampleQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        province_code,
        district_code,
        municipality_code,
        ward_code
      FROM members_consolidated 
      WHERE province_code = 'EC' 
        AND municipality_code IS NULL
      LIMIT 10;
    `;
    
    const nullSampleResult = await executeQuery(nullSampleQuery);
    console.table(nullSampleResult);
    
    // 3. Sample of EC members WITH municipality_code
    console.log('\n📋 3. Sample EC Members WITH municipality_code (First 10):');
    console.log('-'.repeat(80));
    
    const withCodeSampleQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        province_code,
        district_code,
        municipality_code,
        ward_code
      FROM members_consolidated 
      WHERE province_code = 'EC' 
        AND municipality_code IS NOT NULL
      LIMIT 10;
    `;
    
    const withCodeSampleResult = await executeQuery(withCodeSampleQuery);
    console.table(withCodeSampleResult);
    
    // 4. Distribution of municipality_code values in EC
    console.log('\n📊 4. Distribution of Municipality Codes in EC Province (Top 20):');
    console.log('-'.repeat(80));
    
    const distributionQuery = `
      SELECT 
        municipality_code,
        COUNT(*) as member_count,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM members_consolidated 
      WHERE province_code = 'EC'
      GROUP BY municipality_code
      ORDER BY member_count DESC
      LIMIT 20;
    `;
    
    const distributionResult = await executeQuery(distributionQuery);
    console.table(distributionResult);
    
    // 5. District-wise municipality code status
    console.log('\n📊 5. District-wise Municipality Code Status for EC:');
    console.log('-'.repeat(80));
    
    const districtQuery = `
      SELECT 
        district_code,
        COUNT(*) as total_members,
        COUNT(municipality_code) as with_muni_code,
        COUNT(*) - COUNT(municipality_code) as without_muni_code,
        ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_muni
      FROM members_consolidated 
      WHERE province_code = 'EC'
      GROUP BY district_code
      ORDER BY total_members DESC;
    `;
    
    const districtResult = await executeQuery(districtQuery);
    console.table(districtResult);
    
    // 6. Count unique municipality codes in EC
    console.log('\n📊 6. Unique Municipality Codes Count in EC:');
    console.log('-'.repeat(80));
    
    const uniqueQuery = `
      SELECT 
        COUNT(DISTINCT municipality_code) as unique_muni_codes,
        COUNT(DISTINCT CASE WHEN municipality_code IS NOT NULL THEN municipality_code END) as non_null_unique_codes
      FROM members_consolidated 
      WHERE province_code = 'EC';
    `;
    
    const uniqueResult = await executeQuery(uniqueQuery);
    console.table(uniqueResult);
    
    // 7. Compare EC vs MP
    console.log('\n📊 7. Comparison: EC vs MP Municipality Code Coverage:');
    console.log('-'.repeat(80));
    
    const comparisonQuery = `
      SELECT 
        province_code,
        COUNT(*) as total_members,
        COUNT(municipality_code) as with_muni_code,
        COUNT(*) - COUNT(municipality_code) as null_muni_code,
        ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_code,
        COUNT(DISTINCT municipality_code) as unique_muni_codes
      FROM members_consolidated 
      WHERE province_code IN ('EC', 'MP')
      GROUP BY province_code
      ORDER BY province_code;
    `;
    
    const comparisonResult = await executeQuery(comparisonQuery);
    console.table(comparisonResult);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Investigation Complete!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    process.exit(0);
  }
}

// Run investigation
investigateECMunicipalityCodes();

