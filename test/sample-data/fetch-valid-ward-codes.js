const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Fetch valid ward codes from the database and save them to a JSON file
 * This file will be used by the data generators to create valid test data
 */

async function fetchValidWardCodes() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Fetch all ward codes
    const query = 'SELECT ward_code, ward_name FROM wards ORDER BY ward_code';
    const result = await client.query(query);

    console.log(`📊 Found ${result.rows.length} wards in database\n`);

    // Save to JSON file
    const outputPath = path.join(__dirname, 'valid-ward-codes.json');
    fs.writeFileSync(outputPath, JSON.stringify(result.rows, null, 2));

    console.log(`✅ Ward codes saved to: ${outputPath}`);
    console.log(`\nSample ward codes:`);
    result.rows.slice(0, 10).forEach(row => {
      console.log(`  ${row.ward_code}: ${row.ward_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fetchValidWardCodes();

