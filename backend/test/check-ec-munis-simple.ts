/**
 * Simple Investigation: EC Municipality Codes
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function checkEC() {
  await initializeDatabase();

  try {
    console.log('\n🔍 EC Province Municipality Code Status:\n');

    const query = `
      SELECT
        COUNT(*) as total_ec_members,
        COUNT(municipality_code) as with_muni_code,
        COUNT(*) - COUNT(municipality_code) as null_muni_code,
        ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_code,
        COUNT(DISTINCT municipality_code) as unique_muni_codes
      FROM members_consolidated
      WHERE province_code = 'EC';
    `;

    const result = await executeQuery(query);
    console.table(result);

    console.log('\n📊 Top 10 Municipality Codes in EC:\n');

    const distQuery = `
      SELECT
        municipality_code,
        COUNT(*) as member_count
      FROM members_consolidated
      WHERE province_code = 'EC' AND municipality_code IS NOT NULL
      GROUP BY municipality_code
      ORDER BY member_count DESC
      LIMIT 10;
    `;

    const distResult = await executeQuery(distQuery);
    console.table(distResult);

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkEC();

