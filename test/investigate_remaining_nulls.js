const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function investigateRemainingNulls() {
  const client = await pool.connect();
  
  try {
    console.log('=== Investigating Remaining NULL Records ===\n');
    
    // 1. Count records with NULL geographic data
    const nullCountResult = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    console.log(`Total records with NULL geographic data: ${nullCountResult.rows[0].count.toLocaleString()}\n`);
    
    // 2. Check if these records have ward codes
    const wardCodeCheckResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ward_code IS NOT NULL THEN 1 END) as with_ward_code,
        COUNT(CASE WHEN ward_code IS NULL THEN 1 END) as without_ward_code
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    console.log('Ward Code Status:');
    console.log(`  Total: ${wardCodeCheckResult.rows[0].total.toLocaleString()}`);
    console.log(`  With ward_code: ${wardCodeCheckResult.rows[0].with_ward_code.toLocaleString()}`);
    console.log(`  Without ward_code: ${wardCodeCheckResult.rows[0].without_ward_code.toLocaleString()}\n`);
    
    // 3. Sample ward codes that don't match
    const unmatchedWardsResult = await client.query(`
      SELECT 
        mc.ward_code,
        COUNT(*) as member_count
      FROM members_consolidated mc
      WHERE (mc.municipality_code IS NULL 
        OR mc.district_code IS NULL 
        OR mc.province_code IS NULL)
        AND mc.ward_code IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM wards w WHERE w.ward_code = mc.ward_code
        )
      GROUP BY mc.ward_code
      ORDER BY member_count DESC
      LIMIT 20
    `);
    
    if (unmatchedWardsResult.rows.length > 0) {
      console.log('Top 20 Ward Codes NOT in wards table:');
      console.table(unmatchedWardsResult.rows);
    } else {
      console.log('✅ All ward codes exist in the wards table\n');
    }
    
    // 4. Check for records where ward exists but join failed
    const joinFailureResult = await client.query(`
      SELECT 
        mc.ward_code,
        w.ward_code as ward_exists,
        w.municipality_code,
        m.municipality_code as muni_exists,
        COUNT(*) as member_count
      FROM members_consolidated mc
      LEFT JOIN wards w ON mc.ward_code = w.ward_code
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE (mc.municipality_code IS NULL 
        OR mc.district_code IS NULL 
        OR mc.province_code IS NULL)
        AND mc.ward_code IS NOT NULL
      GROUP BY mc.ward_code, w.ward_code, w.municipality_code, m.municipality_code
      ORDER BY member_count DESC
      LIMIT 20
    `);
    
    console.log('\nTop 20 Ward Codes with Join Issues:');
    console.table(joinFailureResult.rows);
    
    // 5. Check specific breakdown by NULL field
    const nullBreakdownResult = await client.query(`
      SELECT 
        CASE 
          WHEN municipality_code IS NULL AND district_code IS NULL AND province_code IS NULL THEN 'All NULL'
          WHEN municipality_code IS NULL AND district_code IS NULL THEN 'Muni & District NULL'
          WHEN municipality_code IS NULL AND province_code IS NULL THEN 'Muni & Province NULL'
          WHEN district_code IS NULL AND province_code IS NULL THEN 'District & Province NULL'
          WHEN municipality_code IS NULL THEN 'Only Muni NULL'
          WHEN district_code IS NULL THEN 'Only District NULL'
          WHEN province_code IS NULL THEN 'Only Province NULL'
        END as null_pattern,
        COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
      GROUP BY null_pattern
      ORDER BY count DESC
    `);
    
    console.log('\nNULL Pattern Breakdown:');
    console.table(nullBreakdownResult.rows);
    
  } finally {
    client.release();
    await pool.end();
  }
}

investigateRemainingNulls().catch(console.error);

