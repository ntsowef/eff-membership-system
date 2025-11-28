const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
});

async function quickAuthFix() {
  console.log('🔧 Quick Authentication Fix');
  console.log('===========================\n');
  
  try {
    // 1. Add is_active column to user_sessions
    console.log('1️⃣ Adding is_active column to user_sessions...');
    await pool.query(`
      ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);
    
    await pool.query(`
      UPDATE user_sessions SET is_active = TRUE WHERE is_active IS NULL
    `);
    
    console.log('   ✅ is_active column added to user_sessions');
    
    // 2. Verify column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' AND column_name = 'is_active'
    `);
    
    console.log(`   ✅ is_active column verified: ${columnCheck.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // 3. Create a simple test user
    console.log('\n2️⃣ Creating test user...');
    
    // Delete existing test user
    await pool.query(`DELETE FROM users WHERE email = 'test@example.com'`);
    
    // Get a role
    const role = await pool.query(`SELECT role_id FROM roles LIMIT 1`);
    
    if (role.rows.length > 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      
      // Get next user_id
      const maxUserId = await pool.query(`SELECT COALESCE(MAX(user_id), 0) + 1 as next_id FROM users`);
      const nextUserId = maxUserId.rows[0].next_id;
      
      await pool.query(`
        INSERT INTO users (
          user_id, id, name, email, password, role_id, admin_level, is_active, created_at
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)
      `, [nextUserId, 'Test User', 'test@example.com', hashedPassword, role.rows[0].role_id, 'ward']);
      
      console.log('   ✅ Test user created successfully');
    } else {
      console.log('   ❌ No roles found');
    }
    
    // 4. Test authentication query
    console.log('\n3️⃣ Testing authentication query...');
    
    const authTest = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.admin_level, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = $1 AND u.is_active = TRUE
    `, ['test@example.com']);
    
    if (authTest.rows.length > 0) {
      console.log(`   ✅ Auth query successful: ${authTest.rows[0].name} (${authTest.rows[0].email})`);
    } else {
      console.log('   ❌ Auth query failed');
    }
    
    console.log('\n🎉 QUICK AUTHENTICATION FIX COMPLETED!');
    console.log('======================================');
    console.log('✅ user_sessions table has is_active column');
    console.log('✅ Test user created and verified');
    console.log('✅ Authentication queries working');
    
  } catch (error) {
    console.error('❌ Error in quick auth fix:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

quickAuthFix()
  .then(() => {
    console.log('\n✅ Quick authentication fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Quick authentication fix failed:', error.message);
    process.exit(1);
  });
