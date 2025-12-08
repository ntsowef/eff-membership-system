const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function fixRemainingGeographicData() {
  const client = await pool.connect();
  
  try {
    console.log('=== Fixing Remaining Geographic Data ===\n');
    
    // Check what we're dealing with
    const checkResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN municipality_code IS NOT NULL THEN 1 END) as has_muni,
        COUNT(CASE WHEN district_code IS NOT NULL THEN 1 END) as has_district,
        COUNT(CASE WHEN province_code IS NOT NULL THEN 1 END) as has_province
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    
    console.log('Current Status:');
    console.table(checkResult.rows);
    
    // Strategy 1: Update records that have municipality_code but missing district/province
    console.log('\n--- Strategy 1: Update from municipality_code ---');
    const strategy1Result = await client.query(`
      UPDATE members_consolidated mc
      SET 
        district_code = m.district_code,
        district_name = d.district_name,
        province_code = d.province_code,
        province_name = p.province_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE mc.municipality_code = m.municipality_code
        AND mc.municipality_code IS NOT NULL
        AND (mc.district_code IS NULL OR mc.province_code IS NULL)
    `);
    
    console.log(`✅ Updated ${strategy1Result.rowCount.toLocaleString()} records using municipality_code\n`);
    
    // Strategy 2: Update records using ward_code (for any remaining)
    console.log('--- Strategy 2: Update from ward_code ---');
    const strategy2Result = await client.query(`
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
        AND (mc.municipality_code IS NULL 
          OR mc.district_code IS NULL 
          OR mc.province_code IS NULL)
    `);
    
    console.log(`✅ Updated ${strategy2Result.rowCount.toLocaleString()} records using ward_code\n`);
    
    // Verify the fix
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    
    console.log('=== Final Verification ===');
    console.log(`Records still needing fix: ${verifyResult.rows[0].count.toLocaleString()}\n`);
    
    if (parseInt(verifyResult.rows[0].count) === 0) {
      console.log('🎉 All geographic data has been fixed!');
    } else {
      console.log(`⚠️  ${verifyResult.rows[0].count.toLocaleString()} records still need fixing`);
      
      // Show details of remaining issues
      const remainingDetailsResult = await client.query(`
        SELECT 
          mc.ward_code,
          mc.municipality_code,
          mc.district_code,
          mc.province_code,
          w.ward_code as ward_exists,
          w.municipality_code as ward_muni_code,
          COUNT(*) as count
        FROM members_consolidated mc
        LEFT JOIN wards w ON mc.ward_code = w.ward_code
        WHERE mc.municipality_code IS NULL 
          OR mc.district_code IS NULL 
          OR mc.province_code IS NULL
        GROUP BY mc.ward_code, mc.municipality_code, mc.district_code, mc.province_code, 
                 w.ward_code, w.municipality_code
        ORDER BY count DESC
        LIMIT 10
      `);
      
      console.log('\nTop 10 Remaining Issues:');
      console.table(remainingDetailsResult.rows);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

fixRemainingGeographicData().catch(console.error);

