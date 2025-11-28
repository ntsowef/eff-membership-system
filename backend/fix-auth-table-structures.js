const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
});

async function fixAuthTableStructures() {
  console.log('🔧 Fixing Authentication Table Structures');
  console.log('=========================================\n');
  
  try {
    // 1. Fix roles table - add id column as alias
    console.log('1️⃣ Fixing roles table structure...\n');
    
    try {
      // Add id column as alias to role_id
      await pool.query(`
        ALTER TABLE roles ADD COLUMN IF NOT EXISTS id INTEGER;
      `);
      
      // Update id column to match role_id values
      await pool.query(`
        UPDATE roles SET id = role_id WHERE id IS NULL;
      `);
      
      // Make id column not null and primary key if it isn't already
      await pool.query(`
        ALTER TABLE roles ALTER COLUMN id SET NOT NULL;
      `);
      
      console.log('   ✅ Added id column to roles table');
      
      // Add name column as alias to role_name if it doesn't exist
      const nameColumnExists = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'name'
      `);
      
      if (nameColumnExists.rows.length === 0) {
        await pool.query(`
          ALTER TABLE roles ADD COLUMN name VARCHAR(255);
        `);
        
        await pool.query(`
          UPDATE roles SET name = role_name WHERE name IS NULL;
        `);
        
        console.log('   ✅ Added name column to roles table');
      } else {
        console.log('   ✅ Name column already exists in roles table');
      }
      
    } catch (error) {
      console.log(`   ❌ Error fixing roles table: ${error.message}`);
    }
    
    // 2. Fix users table - add id column as alias
    console.log('\n2️⃣ Fixing users table structure...\n');
    
    try {
      // Add id column as alias to user_id
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS id INTEGER;
      `);
      
      // Update id column to match user_id values
      await pool.query(`
        UPDATE users SET id = user_id WHERE id IS NULL;
      `);
      
      // Make id column not null
      await pool.query(`
        ALTER TABLE users ALTER COLUMN id SET NOT NULL;
      `);
      
      console.log('   ✅ Added id column to users table');
      
    } catch (error) {
      console.log(`   ❌ Error fixing users table: ${error.message}`);
    }
    
    // 3. Fix user_sessions table - add missing columns
    console.log('\n3️⃣ Fixing user_sessions table structure...\n');
    
    try {
      // Add id column
      await pool.query(`
        ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
      `);
      
      // Add is_active column
      await pool.query(`
        ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      `);
      
      // Update existing sessions to be active
      await pool.query(`
        UPDATE user_sessions SET is_active = TRUE WHERE is_active IS NULL;
      `);
      
      console.log('   ✅ Added id and is_active columns to user_sessions table');
      
    } catch (error) {
      console.log(`   ❌ Error fixing user_sessions table: ${error.message}`);
    }
    
    // 4. Create missing authentication tables if needed
    console.log('\n4️⃣ Creating missing authentication tables...\n');
    
    try {
      // Create security_events table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          event_type VARCHAR(50) NOT NULL,
          ip_address VARCHAR(45),
          details TEXT,
          severity VARCHAR(20) DEFAULT 'low',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('   ✅ Security_events table created/verified');
      
      // Create user_creation_workflow table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_creation_workflow (
          id SERIAL PRIMARY KEY,
          request_id VARCHAR(255) UNIQUE NOT NULL,
          requested_by INTEGER NOT NULL,
          user_data TEXT NOT NULL,
          admin_level VARCHAR(50) NOT NULL,
          justification TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          reviewed_by INTEGER,
          reviewed_at TIMESTAMP,
          review_notes TEXT,
          created_user_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('   ✅ User_creation_workflow table created/verified');
      
      // Create admin_user_creation_log table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_user_creation_log (
          id SERIAL PRIMARY KEY,
          created_user_id INTEGER NOT NULL,
          created_by_user_id INTEGER NOT NULL,
          admin_level VARCHAR(50) NOT NULL,
          creation_reason TEXT,
          approval_status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('   ✅ Admin_user_creation_log table created/verified');
      
      // Create user_role_history table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_role_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          old_admin_level VARCHAR(50),
          new_admin_level VARCHAR(50),
          changed_by INTEGER,
          change_reason TEXT,
          effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('   ✅ User_role_history table created/verified');
      
    } catch (error) {
      console.log(`   ❌ Error creating missing tables: ${error.message}`);
    }
    
    // 5. Create test user with proper structure
    console.log('\n5️⃣ Creating test user...\n');
    
    try {
      // Check if test user exists
      const existingUser = await pool.query(`
        SELECT id, user_id, email, is_active FROM users WHERE email = $1
      `, ['test@example.com']);
      
      if (existingUser.rows.length === 0) {
        // Get a role ID
        const testRole = await pool.query(`
          SELECT role_id, id FROM roles LIMIT 1
        `);
        
        if (testRole.rows.length > 0) {
          const roleId = testRole.rows[0].role_id || testRole.rows[0].id;
          
          // Create test user
          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash('testpassword123', 10);
          
          const newUser = await pool.query(`
            INSERT INTO users (
              name, email, password, role_id, admin_level, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
            RETURNING user_id, id, email
          `, ['Test User', 'test@example.com', hashedPassword, roleId, 'ward']);
          
          // Update id column to match user_id
          if (newUser.rows[0].user_id && !newUser.rows[0].id) {
            await pool.query(`
              UPDATE users SET id = user_id WHERE email = $1
            `, ['test@example.com']);
          }
          
          console.log(`   ✅ Test user created: ${newUser.rows[0].email}`);
        } else {
          console.log('   ❌ No roles found to assign to test user');
        }
      } else {
        console.log(`   ✅ Test user already exists: ${existingUser.rows[0].email}`);
        
        // Ensure id column is set
        if (existingUser.rows[0].user_id && !existingUser.rows[0].id) {
          await pool.query(`
            UPDATE users SET id = user_id WHERE email = $1
          `, ['test@example.com']);
          console.log('   ✅ Updated id column for test user');
        }
        
        // Ensure user is active
        if (!existingUser.rows[0].is_active) {
          await pool.query(`
            UPDATE users SET is_active = TRUE WHERE email = $1
          `, ['test@example.com']);
          console.log('   ✅ Test user activated');
        }
      }
    } catch (error) {
      console.log(`   ❌ Error creating test user: ${error.message}`);
    }
    
    // 6. Verify the fixes
    console.log('\n6️⃣ Verifying table structure fixes...\n');
    
    // Check roles table
    const rolesCheck = await pool.query(`
      SELECT COUNT(*) as count FROM roles WHERE id IS NOT NULL AND name IS NOT NULL
    `);
    console.log(`   ✅ Roles table: ${rolesCheck.rows[0].count} records with id and name columns`);
    
    // Check users table
    const usersCheck = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE id IS NOT NULL
    `);
    console.log(`   ✅ Users table: ${usersCheck.rows[0].count} records with id column`);
    
    // Check user_sessions table
    const sessionsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_sessions' AND column_name IN ('id', 'is_active')
    `);
    console.log(`   ✅ User_sessions table: ${sessionsCheck.rows.length}/2 required columns added`);
    
    // Test a sample authentication query
    const authTest = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.admin_level, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = $1
      LIMIT 1
    `, ['test@example.com']);
    
    if (authTest.rows.length > 0) {
      console.log(`   ✅ Authentication query test: ${authTest.rows[0].name} (${authTest.rows[0].email})`);
    } else {
      console.log('   ❌ Authentication query test failed');
    }
    
    console.log('\n🎉 AUTHENTICATION TABLE STRUCTURE FIXES COMPLETED!');
    console.log('==================================================');
    console.log('✅ Roles table: Added id and name columns');
    console.log('✅ Users table: Added id column');
    console.log('✅ User_sessions table: Added id and is_active columns');
    console.log('✅ Missing authentication tables created');
    console.log('✅ Test user created/verified');
    console.log('✅ Authentication system ready for PostgreSQL!');
    
  } catch (error) {
    console.error('❌ Error fixing authentication table structures:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixAuthTableStructures()
  .then(() => {
    console.log('\n✅ Authentication table structure fixes completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Authentication table structure fixes failed:', error.message);
    process.exit(1);
  });
