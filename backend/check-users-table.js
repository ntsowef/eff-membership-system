const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkUsersTable() {
  try {
    console.log('🔍 Checking users table...\n');
    
    // Check if users table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    console.log('users table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get user count
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('Total users:', userCount.rows[0].count);
      
      // Check if user_id 1 exists
      const user1 = await pool.query('SELECT user_id, username, email FROM users WHERE user_id = 1');
      console.log('User ID 1 exists:', user1.rows.length > 0);
      if (user1.rows.length > 0) {
        console.log('User ID 1 details:', user1.rows[0]);
      }
      
      // Get first 5 users
      const firstUsers = await pool.query('SELECT user_id, username, email FROM users ORDER BY user_id LIMIT 5');
      console.log('\nFirst 5 users:');
      console.table(firstUsers.rows);
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
        AND kcu.column_name = 'appointed_by'
    `);
    
    console.log('Foreign key constraint on appointed_by:');
    console.table(fkConstraint.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();

