const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function testUpdateSample() {
  const client = await pool.connect();
  
  try {
    console.log('=== Testing Update on Small Sample ===\n');
    
    // Test on just West Rand members
    console.log('Testing update for West Rand wards only...\n');
    
    await client.query('BEGIN');
    
    // Show before
    const before = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_muni,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_dist
      FROM members_consolidated
      WHERE ward_code LIKE '748%'
    `);
    console.log('BEFORE:');
    console.table(before.rows);
    
    // Update
    const updateResult = await client.query(`
      UPDATE members_consolidated mc
      SET 
        municipality_code = w.municipality_code,
        municipality_name = m.municipality_name,
        district_code = m.district_code,
        district_name = d.district_name,
        province_code = d.province_code,
        province_name = p.province_name
      FROM wards w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE mc.ward_code = w.ward_code
        AND mc.ward_code LIKE '748%'
        AND (
          mc.municipality_code IS NULL 
          OR mc.district_code IS NULL 
          OR mc.province_code IS NULL
        )
    `);
    console.log(`\n✅ Updated ${updateResult.rowCount} members\n`);
    
    // Show after
    const after = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_muni,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_dist
      FROM members_consolidated
      WHERE ward_code LIKE '748%'
    `);
    console.log('AFTER:');
    console.table(after.rows);
    
    // Show sample
    const sample = await client.query(`
      SELECT 
        id_number,
        firstname,
        ward_code,
        municipality_code,
        municipality_name,
        district_code,
        district_name
      FROM members_consolidated
      WHERE ward_code LIKE '748%'
      LIMIT 10
    `);
    console.log('\nSample members:');
    console.table(sample.rows);
    
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testUpdateSample();

