const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function fixMissingGeographicData() {
  const client = await pool.connect();
  
  try {
    console.log('=== Fixing Missing Geographic Data in members_consolidated ===\n');
    
    await client.query('BEGIN');
    
    // Step 1: Show current state
    console.log('STEP 1: Current State');
    const before = await client.query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district,
        COUNT(CASE WHEN province_code IS NULL THEN 1 END) as null_province
      FROM members_consolidated
    `);
    console.table(before.rows);
    
    // Step 2: Update geographic data
    console.log('\nSTEP 2: Updating geographic data from ward mappings...');
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
        AND (
          mc.municipality_code IS NULL 
          OR mc.district_code IS NULL 
          OR mc.province_code IS NULL
        )
    `);
    console.log(`✅ Updated ${updateResult.rowCount} members`);
    
    // Step 3: Show updated state
    console.log('\nSTEP 3: State After Update');
    const after = await client.query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district,
        COUNT(CASE WHEN province_code IS NULL THEN 1 END) as null_province
      FROM members_consolidated
    `);
    console.table(after.rows);
    
    // Step 4: Show breakdown by province
    console.log('\nSTEP 4: Members by Province');
    const byProvince = await client.query(`
      SELECT 
        province_code,
        province_name,
        COUNT(*) as member_count,
        COUNT(CASE WHEN municipality_code IS NULL THEN 1 END) as null_municipality,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district
      FROM members_consolidated
      WHERE province_code IS NOT NULL
      GROUP BY province_code, province_name
      ORDER BY province_code
    `);
    console.table(byProvince.rows);
    
    // Step 5: Show West Rand statistics
    console.log('\nSTEP 5: West Rand (DC48) Statistics');
    const westRand = await client.query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(DISTINCT municipality_code) as municipalities,
        COUNT(DISTINCT ward_code) as wards
      FROM members_consolidated
      WHERE district_code = 'DC48'
    `);
    console.table(westRand.rows);
    
    // Step 6: Show West Rand by municipality
    console.log('\nSTEP 6: West Rand Members by Municipality');
    const westRandByMuni = await client.query(`
      SELECT 
        municipality_code,
        municipality_name,
        COUNT(*) as member_count
      FROM members_consolidated
      WHERE district_code = 'DC48'
      GROUP BY municipality_code, municipality_name
      ORDER BY municipality_code
    `);
    console.table(westRandByMuni.rows);
    
    // Verification queries
    console.log('\n=== VERIFICATION ===\n');
    
    const nullMuni = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NULL AND ward_code IS NOT NULL
    `);
    console.log(`Members with NULL municipality_code (but have ward_code): ${nullMuni.rows[0].count}`);
    
    const nullDistrict = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE district_code IS NULL AND ward_code IS NOT NULL
    `);
    console.log(`Members with NULL district_code (but have ward_code): ${nullDistrict.rows[0].count}`);
    
    const missingWards = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated mc
      LEFT JOIN wards w ON mc.ward_code = w.ward_code
      WHERE mc.ward_code IS NOT NULL AND w.ward_code IS NULL
    `);
    console.log(`Members with ward_code not in wards table: ${missingWards.rows[0].count}`);
    
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error occurred, transaction rolled back:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMissingGeographicData();

