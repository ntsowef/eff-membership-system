const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkUsersStructure() {
  try {
    console.log('🔍 Checking users table structure...\n');
    
    // Get table columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('users table columns:');
    console.table(columns.rows);
    
    // Get user count
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('\nTotal users:', userCount.rows[0].count);
    
    // Get first 5 users (using only user_id)
    const firstUsers = await pool.query('SELECT * FROM users ORDER BY user_id LIMIT 5');
    console.log('\nFirst 5 users:');
    console.table(firstUsers.rows);
    
    // Check if user_id 1 exists
    const user1 = await pool.query('SELECT * FROM users WHERE user_id = 1');
    console.log('\nUser ID 1 exists:', user1.rows.length > 0);
    if (user1.rows.length > 0) {
      console.log('User ID 1 details:');
      console.table(user1.rows);
    }
    
    // Check the foreign key constraint
    console.log('\n🔍 Checking foreign key constraint on leadership_appointments...\n');
    const fkConstraint = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'leadership_appointments'
        AND kcu.column_name IN ('appointed_by', 'terminated_by')
    `);
    
    console.log('Foreign key constraints on appointed_by and terminated_by:');
    console.table(fkConstraint.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersStructure();

