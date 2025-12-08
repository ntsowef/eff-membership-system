const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  max: 5, // Limit concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const BATCH_SIZE = 50000; // Process 50k records at a time

async function fixGeographicData() {
  const client = await pool.connect();
  
  try {
    console.log('=== Starting Geographic Data Fix (Batched) ===\n');
    
    // First, count how many records need fixing
    console.log('Counting records that need fixing...');
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    
    const totalRecords = parseInt(countResult.rows[0].count);
    console.log(`Total records to fix: ${totalRecords.toLocaleString()}\n`);
    
    if (totalRecords === 0) {
      console.log('✅ No records need fixing!');
      return;
    }
    
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
    console.log(`Processing in ${totalBatches} batches of ${BATCH_SIZE.toLocaleString()} records each\n`);
    
    let processedRecords = 0;
    let updatedRecords = 0;
    const startTime = Date.now();
    
    for (let batch = 1; batch <= totalBatches; batch++) {
      const batchStartTime = Date.now();
      
      console.log(`\n--- Batch ${batch}/${totalBatches} ---`);
      
      // Update in batches using a subquery to limit the records
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
          AND mc.member_id IN (
            SELECT member_id 
            FROM members_consolidated
            WHERE municipality_code IS NULL 
              OR district_code IS NULL 
              OR province_code IS NULL
            LIMIT $1
          )
      `, [BATCH_SIZE]);
      
      const batchUpdated = updateResult.rowCount;
      updatedRecords += batchUpdated;
      processedRecords += BATCH_SIZE;
      
      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      const progress = Math.min(100, ((processedRecords / totalRecords) * 100).toFixed(1));
      
      console.log(`  Updated: ${batchUpdated.toLocaleString()} records`);
      console.log(`  Batch time: ${batchDuration}s`);
      console.log(`  Total updated: ${updatedRecords.toLocaleString()} / ${totalRecords.toLocaleString()} (${progress}%)`);
      console.log(`  Elapsed time: ${totalDuration}s`);
      
      // If no records were updated in this batch, we're done
      if (batchUpdated === 0) {
        console.log('\n✅ All records have been updated!');
        break;
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (batch < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n=== Summary ===');
    console.log(`Total records updated: ${updatedRecords.toLocaleString()}`);
    console.log(`Total time: ${totalDuration}s`);
    console.log(`Average speed: ${(updatedRecords / totalDuration).toFixed(0)} records/second`);
    
    // Verify the fix
    console.log('\n=== Verification ===');
    const verifyResult = await client.query(`
      SELECT COUNT(*) as remaining
      FROM members_consolidated
      WHERE municipality_code IS NULL 
        OR district_code IS NULL 
        OR province_code IS NULL
    `);
    
    const remaining = parseInt(verifyResult.rows[0].remaining);
    console.log(`Records still needing fix: ${remaining.toLocaleString()}`);
    
    if (remaining === 0) {
      console.log('\n✅ SUCCESS! All geographic data has been fixed!');
    } else {
      console.log(`\n⚠️  ${remaining.toLocaleString()} records still need fixing`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixGeographicData();

