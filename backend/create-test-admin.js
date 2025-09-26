const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestAdmin() {
  console.log('🔧 Creating test admin user...\n');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_management',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Database connected');
    
    // First, let's try to drop and recreate the users table if it has issues
    try {
      console.log('🔧 Attempting to fix users table...');
      
      // Check if users table exists and has data
      const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('📋 Current users count:', existingUsers[0].count);
      
      // If table exists but has issues, let's try to repair it
      await connection.execute('REPAIR TABLE users');
      console.log('✅ Table repair attempted');
      
    } catch (error) {
      console.log('⚠️  Table repair failed, attempting to recreate...');
      
      // Drop and recreate users table
      await connection.execute('DROP TABLE IF EXISTS users');
      
      // Create users table
      await connection.execute(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          password_changed_at TIMESTAMP NULL,
          role_id INT NULL,
          email_verified_at TIMESTAMP NULL,
          remember_token VARCHAR(100) NULL,
          password_reset_token VARCHAR(255) NULL,
          password_reset_expires TIMESTAMP NULL,
          failed_login_attempts INT DEFAULT 0,
          locked_until TIMESTAMP NULL,
          locked_at TIMESTAMP NULL,
          mfa_enabled BOOLEAN DEFAULT FALSE,
          mfa_secret VARCHAR(255) NULL,
          member_id INT NULL,
          admin_level ENUM('national', 'province', 'region', 'municipality', 'ward') NULL,
          province_code VARCHAR(10) NULL,
          district_code VARCHAR(10) NULL,
          municipal_code VARCHAR(10) NULL,
          ward_code VARCHAR(10) NULL,
          is_active BOOLEAN DEFAULT TRUE,
          account_locked BOOLEAN DEFAULT FALSE,
          last_login_at TIMESTAMP NULL,
          last_login_ip VARCHAR(45) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_users_email (email),
          INDEX idx_users_admin_level (admin_level),
          INDEX idx_users_province (province_code),
          INDEX idx_users_active (is_active)
        ) ENGINE=InnoDB
      `);
      
      console.log('✅ Users table recreated');
    }
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const provAdminPassword = await bcrypt.hash('ProvAdmin123!', 10);
    
    // Insert test users
    await connection.execute(`
      INSERT INTO users (name, email, password, admin_level, province_code, is_active) VALUES
      ('Super Administrator', 'admin@membership.org', ?, 'national', NULL, TRUE),
      ('Gauteng Administrator', 'gauteng.admin@membership.org', ?, 'province', 'GP', TRUE)
      ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      admin_level = VALUES(admin_level),
      province_code = VALUES(province_code),
      is_active = VALUES(is_active)
    `, [adminPassword, provAdminPassword]);
    
    console.log('✅ Test admin users created/updated');
    
    // Verify the users
    const [users] = await connection.execute('SELECT id, name, email, admin_level, is_active FROM users WHERE email IN (?, ?)', 
      ['admin@membership.org', 'gauteng.admin@membership.org']);
    
    console.log('📋 Created users:');
    users.forEach(user => {
      console.log(`   ${user.email}: ${user.name} (${user.admin_level}) - Active: ${user.is_active}`);
    });
    
    await connection.end();
    
    console.log('\n🎉 Test admin users are ready!');
    console.log('📋 Demo Credentials:');
    console.log('   Super Admin: admin@membership.org / Admin123!');
    console.log('   Province Admin: gauteng.admin@membership.org / ProvAdmin123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createTestAdmin();
