/**
 * Create concurrent_session_limits table and populate with default data
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
});

async function createSessionLimitsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating concurrent_session_limits table...\n');

    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS concurrent_session_limits (
          id SERIAL PRIMARY KEY,
          role_id INTEGER NOT NULL,
          admin_level VARCHAR(50) NOT NULL,
          max_concurrent_sessions INTEGER NOT NULL DEFAULT 3,
          session_timeout_minutes INTEGER NOT NULL DEFAULT 1440,
          force_single_session BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(role_id, admin_level)
      );
    `);
    console.log('✅ Table created successfully');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_concurrent_session_limits_role_admin 
      ON concurrent_session_limits(role_id, admin_level);
    `);
    console.log('✅ Index created successfully');

    // Check if roles table exists and get role IDs
    const rolesResult = await client.query(`
      SELECT id, name FROM roles ORDER BY id LIMIT 5;
    `);
    
    console.log('\n📋 Available roles:');
    rolesResult.rows.forEach(role => {
      console.log(`   Role ID ${role.id}: ${role.name}`);
    });

    // Insert default session limits
    const insertQuery = `
      INSERT INTO concurrent_session_limits (role_id, admin_level, max_concurrent_sessions, session_timeout_minutes, force_single_session)
      VALUES 
          ($1, 'national', 5, 480, FALSE),
          ($1, 'province', 3, 480, FALSE),
          ($1, 'district', 3, 240, FALSE),
          ($1, 'municipal', 2, 240, FALSE),
          ($1, 'ward', 2, 120, FALSE)
      ON CONFLICT (role_id, admin_level) DO NOTHING
      RETURNING *;
    `;

    // Use the first role ID (typically admin role)
    const adminRoleId = rolesResult.rows[0]?.id || 1;
    const insertResult = await client.query(insertQuery, [adminRoleId]);
    
    console.log(`\n✅ Inserted ${insertResult.rows.length} default session limit records`);

    // Create update trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_concurrent_session_limits_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_concurrent_session_limits_updated_at ON concurrent_session_limits;
      CREATE TRIGGER trigger_update_concurrent_session_limits_updated_at
          BEFORE UPDATE ON concurrent_session_limits
          FOR EACH ROW
          EXECUTE FUNCTION update_concurrent_session_limits_updated_at();
    `);
    console.log('✅ Update trigger created successfully');

    // Display the created data
    const selectResult = await client.query(`
      SELECT csl.*, r.name as role_name 
      FROM concurrent_session_limits csl
      LEFT JOIN roles r ON csl.role_id = r.id
      ORDER BY csl.admin_level;
    `);

    console.log('\n📊 Session Limits Configuration:');
    console.log('┌─────────────┬──────────────┬─────────────┬─────────────┬──────────────┐');
    console.log('│ Admin Level │ Role Name    │ Max Sessions│ Timeout(min)│ Force Single │');
    console.log('├─────────────┼──────────────┼─────────────┼─────────────┼──────────────┤');
    
    selectResult.rows.forEach(row => {
      console.log(`│ ${row.admin_level.padEnd(11)} │ ${(row.role_name || 'Unknown').padEnd(12)} │ ${row.max_concurrent_sessions.toString().padEnd(11)} │ ${row.session_timeout_minutes.toString().padEnd(11)} │ ${row.force_single_session.toString().padEnd(12)} │`);
    });
    
    console.log('└─────────────┴──────────────┴─────────────┴─────────────┴──────────────┘');

    console.log('\n🎉 concurrent_session_limits table created and configured successfully!');
    console.log('✅ Session management will now use database-driven limits');

  } catch (error) {
    console.error('❌ Error creating session limits table:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createSessionLimitsTable().catch(console.error);
