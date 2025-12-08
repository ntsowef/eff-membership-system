const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function createIndex() {
  try {
    console.log('Creating index on members_consolidated.ward_code...\n');
    
    const startTime = Date.now();
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_members_ward_code 
      ON members_consolidated(ward_code)
    `);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Index created successfully in ${duration} seconds`);
    
    // Verify the index was created
    const indexCheck = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'members_consolidated'
        AND indexname = 'idx_members_ward_code'
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('\n✅ Index verified:');
      console.table(indexCheck.rows);
    } else {
      console.log('\n⚠️  Index not found after creation');
    }
    
  } catch (error) {
    console.error('❌ Error creating index:', error);
  } finally {
    await pool.end();
  }
}

createIndex();

