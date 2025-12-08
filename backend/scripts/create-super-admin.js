/**
 * Create Permanent Super Admin User
 * 
 * This script creates a permanent super admin user for the EFF Membership System.
 * The super admin has full access to all system features including the Super Admin Interface.
 * 
 * Usage: node backend/scripts/create-super-admin.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eff_membership_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

console.log('📊 Database Configuration:');
console.log('   Host:', process.env.DB_HOST || 'localhost');
console.log('   Port:', process.env.DB_PORT || '5432');
console.log('   Database:', process.env.DB_NAME || 'eff_membership_database');
console.log('   User:', process.env.DB_USER || 'postgres');
console.log('   Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'not set');
console.log('');


// Super admin credentials
const SUPER_ADMIN = {
  name: 'Super Administrator',
  email: 'superadmin@eff.org.za',
  password: 'SuperAdmin@2024!', // Strong default password - MUST BE CHANGED after first login
  admin_level: 'national',
  cell_number: '+27123456789',
};

async function createSuperAdmin() {
  let client;
  
  try {
    console.log('🚀 Starting Super Admin User Creation...\n');
    
    client = await pool.connect();
    
    // 1. Check if super_admin role exists
    console.log('📋 Step 1: Checking for super_admin role...');
    const roleCheck = await client.query(`
      SELECT role_id, role_name, role_code FROM roles
      WHERE role_name = 'super_admin' OR role_code = 'SUPER_ADMIN'
    `);

    let superAdminRoleId;

    if (roleCheck.rows.length === 0) {
      console.log('   ⚠️  super_admin role not found. Creating it...');

      // Create super_admin role with both role_name and role_code
      const roleInsert = await client.query(`
        INSERT INTO roles (role_name, role_code, description, is_active, created_at)
        VALUES ('super_admin', 'SUPER_ADMIN', 'Super Administrator with full system access', TRUE, CURRENT_TIMESTAMP)
        RETURNING role_id
      `);

      superAdminRoleId = roleInsert.rows[0].role_id;
      console.log(`   ✅ super_admin role created with ID: ${superAdminRoleId}`);
    } else {
      superAdminRoleId = roleCheck.rows[0].role_id;
      console.log(`   ✅ super_admin role found with ID: ${superAdminRoleId}`);
      console.log(`      Role Name: ${roleCheck.rows[0].role_name}`);
      console.log(`      Role Code: ${roleCheck.rows[0].role_code}`);
    }
    
    // 2. Check if super admin user already exists
    console.log('\n📋 Step 2: Checking for existing super admin user...');
    const userCheck = await client.query(`
      SELECT user_id, email, name FROM users WHERE email = $1
    `, [SUPER_ADMIN.email]);
    
    if (userCheck.rows.length > 0) {
      console.log('   ⚠️  Super admin user already exists!');
      console.log(`   📧 Email: ${userCheck.rows[0].email}`);
      console.log(`   👤 Name: ${userCheck.rows[0].name}`);
      console.log(`   🆔 User ID: ${userCheck.rows[0].user_id}`);
      
      // Update existing user to super_admin role
      console.log('\n   🔄 Updating existing user to super_admin role...');
      await client.query(`
        UPDATE users 
        SET role_id = $1, admin_level = $2, is_active = TRUE
        WHERE email = $3
      `, [superAdminRoleId, SUPER_ADMIN.admin_level, SUPER_ADMIN.email]);
      
      console.log('   ✅ User updated to super_admin role');
      console.log('\n✨ Super admin user is ready!');
      console.log('   📧 Email: ' + SUPER_ADMIN.email);
      console.log('   🔑 Use your existing password to login');
      
    } else {
      // 3. Hash password
      console.log('   ℹ️  No existing user found. Creating new super admin...');
      console.log('\n📋 Step 3: Hashing password...');
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, saltRounds);
      console.log('   ✅ Password hashed successfully');
      
      // 4. Create super admin user
      console.log('\n📋 Step 4: Creating super admin user...');
      const userInsert = await client.query(`
        INSERT INTO users (
          name, email, password, role_id, admin_level,
          cell_number, is_active, email_verified_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING user_id, email, name
      `, [
        SUPER_ADMIN.name,
        SUPER_ADMIN.email,
        hashedPassword,
        superAdminRoleId,
        SUPER_ADMIN.admin_level,
        SUPER_ADMIN.cell_number,
      ]);
      
      const newUser = userInsert.rows[0];
      console.log('   ✅ Super admin user created successfully!');
      console.log(`   🆔 User ID: ${newUser.user_id}`);
      console.log(`   👤 Name: ${newUser.name}`);
      console.log(`   📧 Email: ${newUser.email}`);
      
      // 5. Display credentials
      console.log('\n' + '='.repeat(70));
      console.log('🎉 SUPER ADMIN USER CREATED SUCCESSFULLY!');
      console.log('='.repeat(70));
      console.log('\n📝 Login Credentials:');
      console.log('   📧 Email:    ' + SUPER_ADMIN.email);
      console.log('   🔑 Password: ' + SUPER_ADMIN.password);
      console.log('\n⚠️  IMPORTANT SECURITY NOTICE:');
      console.log('   1. Change this password immediately after first login!');
      console.log('   2. Use a strong, unique password');
      console.log('   3. Enable MFA if available');
      console.log('   4. Keep these credentials secure');
      console.log('\n🌐 Access the system at:');
      console.log('   Frontend: http://localhost:3000/login');
      console.log('   Super Admin Interface: http://localhost:3000/admin/super-admin/dashboard');
      console.log('\n✨ The super admin user has full access to:');
      console.log('   ✅ Super Admin Interface (all 8 pages)');
      console.log('   ✅ System monitoring and configuration');
      console.log('   ✅ Queue management');
      console.log('   ✅ User management');
      console.log('   ✅ Bulk upload management');
      console.log('   ✅ Lookup data management');
      console.log('   ✅ All other system features');
      console.log('\n' + '='.repeat(70));
    }
    
  } catch (error) {
    console.error('\n❌ Error creating super admin user:');
    console.error('   ' + error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Database connection failed. Please ensure:');
      console.error('   1. PostgreSQL is running');
      console.error('   2. Database credentials in .env are correct');
      console.error('   3. Database "eff_membership_database" exists');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the script
createSuperAdmin();

