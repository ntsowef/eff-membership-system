/**
 * Check Ward Codes in Database
 * 
 * This script checks what ward codes exist in the wards table
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkWardCodes() {
  console.log('🔍 Checking ward codes in database...\n');

  try {
    // Count total wards
    const countResult = await pool.query('SELECT COUNT(*) FROM wards');
    console.log(`📊 Total wards in database: ${countResult.rows[0].count}\n`);

    // Get sample ward codes
    const sampleResult = await pool.query(`
      SELECT ward_code, ward_name, municipality_code
      FROM wards
      ORDER BY ward_code
      LIMIT 20
    `);

    console.log('📋 Sample ward codes (first 20):');
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.ward_code} - ${row.ward_name} (Muni: ${row.municipality_code})`);
    });

    // Check if any ward codes match the pattern from test data
    console.log('\n🔍 Checking for ward codes starting with "1234"...');
    const patternResult = await pool.query(`
      SELECT ward_code, ward_name
      FROM wards
      WHERE ward_code LIKE '1234%'
      LIMIT 10
    `);

    if (patternResult.rows.length > 0) {
      console.log('✅ Found matching wards:');
      patternResult.rows.forEach((row) => {
        console.log(`   ${row.ward_code} - ${row.ward_name}`);
      });
    } else {
      console.log('❌ No wards found starting with "1234"');
    }

    // Check ward code format
    console.log('\n📏 Ward code format analysis:');
    const formatResult = await pool.query(`
      SELECT 
        LENGTH(ward_code) as length,
        COUNT(*) as count
      FROM wards
      GROUP BY LENGTH(ward_code)
      ORDER BY length
    `);

    console.log('   Ward code lengths:');
    formatResult.rows.forEach((row) => {
      console.log(`   - Length ${row.length}: ${row.count} wards`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWardCodes();

