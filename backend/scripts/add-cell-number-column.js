/**
 * Add cell_number column to users table
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function addCellNumberColumn() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 Adding cell_number column to users table...\n');

    // Add the column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cell_number VARCHAR(20)
    `);
    console.log('✅ Column added successfully');

    // Add comment
    await client.query(`
      COMMENT ON COLUMN users.cell_number IS 'Cell phone number for admin users (for OTP/MFA). Members get their cell number from members_consolidated table.'
    `);
    console.log('✅ Comment added');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_cell_number ON users(cell_number) WHERE cell_number IS NOT NULL
    `);
    console.log('✅ Index created');

    // Verify the column exists
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'cell_number'
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Verification successful:');
      console.log('   Column:', result.rows[0].column_name);
      console.log('   Type:', result.rows[0].data_type);
      console.log('   Max Length:', result.rows[0].character_maximum_length);
    } else {
      console.log('\n❌ Column not found after creation!');
    }

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

addCellNumberColumn();

