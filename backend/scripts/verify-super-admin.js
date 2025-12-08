/**
 * Verify Super Admin User
 * 
 * This script verifies that the super admin user was created correctly
 * and displays the user details.
 */

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eff_membership_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verifySuperAdmin() {
  let client;
  
  try {
    console.log('🔍 Verifying Super Admin User...\n');
    
    client = await pool.connect();
    
    // Query super admin user with role details
    const result = await client.query(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.admin_level,
        u.cell_number,
        u.is_active,
        u.email_verified_at IS NOT NULL as email_verified,
        u.created_at,
        r.role_id,
        r.role_name,
        r.role_code,
        r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = 'superadmin@eff.org.za'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Super admin user not found!');
      console.log('   Email: superadmin@eff.org.za');
      console.log('\n💡 Run the creation script:');
      console.log('   node scripts/create-super-admin.js');
      process.exit(1);
    }
    
    const user = result.rows[0];
    
    console.log('✅ Super Admin User Found!\n');
    console.log('═'.repeat(70));
    console.log('USER DETAILS');
    console.log('═'.repeat(70));
    console.log(`🆔 User ID:          ${user.user_id}`);
    console.log(`👤 Name:             ${user.name}`);
    console.log(`📧 Email:            ${user.email}`);
    console.log(`📱 Cell Number:      ${user.cell_number || 'Not set'}`);
    console.log(`📊 Admin Level:      ${user.admin_level}`);
    console.log(`✅ Active:           ${user.is_active ? 'Yes' : 'No'}`);
    console.log(`✉️  Email Verified:   ${user.email_verified ? 'Yes' : 'No'}`);
    console.log(`📅 Created:          ${user.created_at}`);
    
    console.log('\n' + '═'.repeat(70));
    console.log('ROLE DETAILS');
    console.log('═'.repeat(70));
    console.log(`🎭 Role ID:          ${user.role_id}`);
    console.log(`📛 Role Name:        ${user.role_name}`);
    console.log(`🔖 Role Code:        ${user.role_code}`);
    console.log(`📝 Description:      ${user.role_description}`);
    
    console.log('\n' + '═'.repeat(70));
    console.log('LOGIN CREDENTIALS');
    console.log('═'.repeat(70));
    console.log(`📧 Email:            superadmin@eff.org.za`);
    console.log(`🔑 Password:         SuperAdmin@2024!`);
    
    console.log('\n' + '═'.repeat(70));
    console.log('ACCESS URLS');
    console.log('═'.repeat(70));
    console.log(`🌐 Login:            http://localhost:3000/login`);
    console.log(`🎛️  Super Admin:      http://localhost:3000/admin/super-admin/dashboard`);
    
    console.log('\n' + '═'.repeat(70));
    console.log('PERMISSIONS');
    console.log('═'.repeat(70));
    console.log('✅ Super Admin Interface (all 8 pages)');
    console.log('✅ System monitoring and configuration');
    console.log('✅ Queue management');
    console.log('✅ User management');
    console.log('✅ Bulk upload management');
    console.log('✅ Lookup data management');
    console.log('✅ All other system features');
    
    console.log('\n' + '═'.repeat(70));
    console.log('⚠️  SECURITY REMINDER');
    console.log('═'.repeat(70));
    console.log('1. Change the default password after first login');
    console.log('2. Use a strong, unique password');
    console.log('3. Enable MFA if available');
    console.log('4. Keep credentials secure');
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error verifying super admin user:');
    console.error('   ' + error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

verifySuperAdmin();

