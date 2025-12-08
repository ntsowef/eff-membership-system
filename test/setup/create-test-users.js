/**
 * Create Test Users for Concurrent Upload Testing
 * 
 * Creates 20 National Admin test users without OTP requirements
 * These users can be used for concurrent upload testing
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
};

// Test user configuration
const TEST_USER_CONFIG = {
  count: 20,
  emailPrefix: 'test.national.admin',
  emailDomain: 'eff.test.local',
  password: 'TestAdmin@123',
  roleName: 'National Administrator',
  adminLevel: 'national'
};

/**
 * Create database connection
 */
async function createConnection() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  return client;
}

/**
 * Get role ID for National Administrator
 */
async function getRoleId(client) {
  const query = `
    SELECT role_id 
    FROM roles 
    WHERE role_name = $1 OR role_code = 'NATIONAL_ADMIN'
    LIMIT 1
  `;
  
  const result = await client.query(query, [TEST_USER_CONFIG.roleName]);
  
  if (result.rows.length === 0) {
    throw new Error(`Role not found: ${TEST_USER_CONFIG.roleName}`);
  }
  
  return result.rows[0].role_id;
}

/**
 * Check if user already exists
 */
async function userExists(client, email) {
  const query = 'SELECT user_id FROM users WHERE email = $1';
  const result = await client.query(query, [email]);
  return result.rows.length > 0;
}

/**
 * Create a test user
 */
async function createTestUser(client, roleId, userNumber) {
  const email = `${TEST_USER_CONFIG.emailPrefix}${userNumber}@${TEST_USER_CONFIG.emailDomain}`;
  const name = `Test National Admin ${userNumber}`;
  
  // Check if user already exists
  if (await userExists(client, email)) {
    console.log(`⚠️  User ${userNumber} already exists: ${email}`);
    return { email, password: TEST_USER_CONFIG.password, existed: true };
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(TEST_USER_CONFIG.password, 10);
  
  // Insert user
  const query = `
    INSERT INTO users (
      name,
      email,
      password,
      role_id,
      admin_level,
      is_active,
      mfa_enabled,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, true, false, NOW(), NOW()
    )
    RETURNING user_id
  `;
  
  const values = [
    name,
    email,
    hashedPassword,
    roleId,
    TEST_USER_CONFIG.adminLevel
  ];
  
  const result = await client.query(query, values);
  
  console.log(`✅ Created user ${userNumber}: ${email}`);
  
  return {
    userId: result.rows[0].user_id,
    email,
    password: TEST_USER_CONFIG.password,
    existed: false
  };
}

/**
 * Main function
 */
async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 CREATING TEST USERS FOR CONCURRENT UPLOAD TESTING`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Database: ${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log(`Creating ${TEST_USER_CONFIG.count} test users...\n`);
  
  let client;
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    client = await createConnection();
    console.log('✅ Connected to database\n');
    
    // Get role ID
    console.log('🔍 Looking up National Administrator role...');
    const roleId = await getRoleId(client);
    console.log(`✅ Found role ID: ${roleId}\n`);
    
    // Create test users
    console.log(`👥 Creating ${TEST_USER_CONFIG.count} test users...\n`);
    
    const users = [];
    let createdCount = 0;
    let existedCount = 0;
    
    for (let i = 1; i <= TEST_USER_CONFIG.count; i++) {
      const user = await createTestUser(client, roleId, i);
      users.push(user);
      
      if (user.existed) {
        existedCount++;
      } else {
        createdCount++;
      }
    }
    
    // Print summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${'='.repeat(80)}\n`);
    
    console.log(`Total users: ${TEST_USER_CONFIG.count}`);
    console.log(`Created: ${createdCount}`);
    console.log(`Already existed: ${existedCount}`);
    console.log(`\n📝 Test User Credentials:\n`);
    console.log(`Email Pattern: ${TEST_USER_CONFIG.emailPrefix}[1-${TEST_USER_CONFIG.count}]@${TEST_USER_CONFIG.emailDomain}`);
    console.log(`Password (all users): ${TEST_USER_CONFIG.password}`);
    console.log(`Role: ${TEST_USER_CONFIG.roleName}`);
    console.log(`Admin Level: ${TEST_USER_CONFIG.adminLevel}`);
    console.log(`MFA Enabled: false (no OTP required)`);
    
    console.log(`\n📋 User List:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
    });
    
    console.log(`\n✅ Test users ready for concurrent upload testing!`);
    console.log(`${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('\n❌ Error creating test users:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('📡 Database connection closed');
    }
  }
}

main().catch(console.error);

