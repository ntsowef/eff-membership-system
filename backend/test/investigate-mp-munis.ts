/**
 * Investigation Script: MP Province Municipality Codes
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function investigateMPMunicipalityCodes() {
  console.log('🔍 INVESTIGATION: MP Province Municipality Codes\n');
  console.log('='.repeat(80));

  // Initialize database first
  await initializeDatabase();

  try {
    // 1. Total MP members and municipality_code status
    console.log('\n📊 1. MP Members Municipality Code Status:');
    console.log('-'.repeat(80));

    const totalQuery = `
      SELECT
        COUNT(*) as total_mp_members,
        COUNT(municipality_code) as with_muni_code,
        COUNT(*) - COUNT(municipality_code) as null_muni_code,
        COUNT(CASE WHEN municipality_code = '' THEN 1 END) as empty_string_muni_code,
        ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_code
      FROM members_consolidated
      WHERE province_code = 'MP';
    `;

    const totalResult = await executeQuery(totalQuery);
    console.table(totalResult);

    // 2. Sample of MP members with NULL municipality_code
    console.log('\n📋 2. Sample MP Members with NULL municipality_code (First 10):');
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
      WHERE province_code = 'MP'
        AND municipality_code IS NULL
      LIMIT 10;
    `;

    const nullSampleResult = await executeQuery(nullSampleQuery);
    console.table(nullSampleResult);

    // 3. Sample of MP members WITH municipality_code
    console.log('\n📋 3. Sample MP Members WITH municipality_code (First 10):');
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
      WHERE province_code = 'MP'
        AND municipality_code IS NOT NULL
      LIMIT 10;
    `;

    const withCodeSampleResult = await executeQuery(withCodeSampleQuery);
    console.table(withCodeSampleResult);

    // 4. Distribution of municipality_code values in MP
    console.log('\n📊 4. Distribution of Municipality Codes in MP Province:');
    console.log('-'.repeat(80));

    const distributionQuery = `
      SELECT
        municipality_code,
        COUNT(*) as member_count,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM members_consolidated
      WHERE province_code = 'MP'
      GROUP BY municipality_code
      ORDER BY member_count DESC
      LIMIT 20;
    `;

    const distributionResult = await executeQuery(distributionQuery);
    console.table(distributionResult);

    // 5. Check valid MP municipalities from municipalities table
    console.log('\n📚 5. Valid MP Municipalities from municipalities table:');
    console.log('-'.repeat(80));

    const validMunisQuery = `
      SELECT
        municipality_code,
        municipality_name,
        district_code,
        province_code
      FROM municipalities
      WHERE province_code = 'MP'
      ORDER BY municipality_name;
    `;

    const validMunisResult = await executeQuery(validMunisQuery);
    console.table(validMunisResult);

    // 6. Check if municipality_code values match municipalities table
    console.log('\n🔗 6. MP Municipality Codes vs Municipalities Table:');
    console.log('-'.repeat(80));

    const matchQuery = `
      SELECT
        m.municipality_code,
        COUNT(m.member_id) as member_count,
        mu.municipality_name,
        CASE
          WHEN mu.municipality_code IS NULL THEN 'NOT IN municipalities table'
          ELSE 'EXISTS in municipalities table'
        END as status
      FROM members_consolidated m
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      WHERE m.province_code = 'MP'
        AND m.municipality_code IS NOT NULL
      GROUP BY m.municipality_code, mu.municipality_name, mu.municipality_code
      ORDER BY member_count DESC
      LIMIT 20;
    `;

    const matchResult = await executeQuery(matchQuery);
    console.table(matchResult);

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
investigateMPMunicipalityCodes();

