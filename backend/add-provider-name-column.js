const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
});

async function addProviderNameColumn() {
  try {
    console.log('🔧 Adding provider_name column to sms_delivery_tracking...');
    
    // Add the column if it doesn't exist
    await pool.query(`
      ALTER TABLE sms_delivery_tracking 
      ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100)
    `);
    
    console.log('✅ provider_name column added');
    
    // Create index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sms_delivery_tracking_provider_name 
      ON sms_delivery_tracking(provider_name)
    `);
    
    console.log('✅ Index created for provider_name');
    
    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sms_delivery_tracking' 
      AND column_name = 'provider_name'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ provider_name column verified:', result.rows[0].data_type);
    } else {
      console.log('❌ provider_name column not found');
    }
    
    console.log('🎉 SMS delivery tracking table updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addProviderNameColumn();
