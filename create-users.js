const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function createUsers() {
  const client = await pool.connect();
  
  try {
    // Hash the password
    const password = 'Admin@123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('Password hashed successfully');
    console.log('Hashed password:', hashedPassword);
    
    // User 1: Super Admin
    const superAdminQuery = `
      INSERT INTO users (
        name, email, password, role_id, admin_level,
        is_active, account_locked, mfa_enabled, failed_login_attempts,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $3,
        role_id = $4,
        admin_level = $5,
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, email, name, admin_level, role_id;
    `;
    
    const superAdminResult = await client.query(superAdminQuery, [
      'System Administrator',        // name
      'superadmin@eff.org.za',       // email
      hashedPassword,                // password
      1,                             // role_id (SUPER_ADMIN)
      'national',                    // admin_level (highest allowed in constraint)
      true,                          // is_active
      false,                         // account_locked
      false,                         // mfa_enabled
      0                              // failed_login_attempts
    ]);
    
    console.log('\n✅ Super Admin created/updated:');
    console.log(superAdminResult.rows[0]);
    
    // User 2: National Admin
    const nationalAdminQuery = `
      INSERT INTO users (
        name, email, password, role_id, admin_level,
        is_active, account_locked, mfa_enabled, failed_login_attempts,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $3,
        role_id = $4,
        admin_level = $5,
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, email, name, admin_level, role_id;
    `;
    
    const nationalAdminResult = await client.query(nationalAdminQuery, [
      'Eff Membership Query',         // name
      'Effmembershipquery@gmail.com', // email
      hashedPassword,                 // password
      2,                              // role_id (NATIONAL_ADMIN)
      'national',                     // admin_level
      true,                           // is_active
      false,                          // account_locked
      false,                          // mfa_enabled
      0                               // failed_login_attempts
    ]);
    
    console.log('\n✅ National Admin created/updated:');
    console.log(nationalAdminResult.rows[0]);
    
    // Verify both users exist
    const verifyQuery = `
      SELECT u.user_id, u.email, u.name, u.admin_level, u.is_active, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email IN ('superadmin@eff.org.za', 'Effmembershipquery@gmail.com');
    `;
    
    const verifyResult = await client.query(verifyQuery);
    console.log('\n📋 Verification - Users in database:');
    console.table(verifyResult.rows);
    
    console.log('\n✅ Both accounts created successfully!');
    console.log('Password for both accounts: Admin@123');
    
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createUsers();

