const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running OTP table migration...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'migrations', 'create-otp-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ OTP table migration completed successfully!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_otp_codes'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table "user_otp_codes" created successfully');
      
      // Check indexes
      const indexes = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'user_otp_codes'
      `);
      
      console.log(`✅ Created ${indexes.rows.length} indexes`);
      indexes.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
      
      // Check view
      const view = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_active_otps'
      `);
      
      if (view.rows.length > 0) {
        console.log('✅ View "vw_active_otps" created successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

