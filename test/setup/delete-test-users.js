/**
 * Delete Test National Admin Users
 * 
 * Safely removes all "Test National Admin" users created for testing
 * This includes:
 * - Users with name pattern "Test National Admin {number}"
 * - Users with email pattern "test.national.admin{number}@eff.test.local"
 * - Related records (OTP codes, workflows, etc.)
 */

const { Client } = require('pg');

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
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
 * Find all test users
 */
async function findTestUsers(client) {
  const query = `
    SELECT 
      user_id,
      name,
      email,
      admin_level,
      created_at
    FROM users
    WHERE 
      name LIKE 'Test National Admin%'
      OR email LIKE 'test.national.admin%@eff.test.local'
    ORDER BY user_id
  `;
  
  const result = await client.query(query);
  return result.rows;
}

/**
 * Check if a table exists
 */
async function tableExists(client, tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )
  `;
  const result = await client.query(query, [tableName]);
  return result.rows[0].exists;
}

/**
 * Delete related records for a user
 */
async function deleteRelatedRecords(client, userId) {
  const deletions = [];

  // Delete OTP codes (if table exists)
  if (await tableExists(client, 'user_otp_codes')) {
    try {
      const otpResult = await client.query(
        'DELETE FROM user_otp_codes WHERE user_id = $1',
        [userId]
      );
      if (otpResult.rowCount > 0) {
        deletions.push(`${otpResult.rowCount} OTP code(s)`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not delete OTP codes: ${error.message}`);
    }
  }

  // Delete user creation workflows (if table exists)
  if (await tableExists(client, 'user_creation_workflows')) {
    try {
      const workflowResult = await client.query(
        'DELETE FROM user_creation_workflows WHERE user_id = $1',
        [userId]
      );
      if (workflowResult.rowCount > 0) {
        deletions.push(`${workflowResult.rowCount} workflow(s)`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not delete workflows: ${error.message}`);
    }
  }

  // Note: We keep audit logs for compliance
  // If you want to delete audit logs, uncomment:
  // if (await tableExists(client, 'audit_logs')) {
  //   const auditResult = await client.query(
  //     'DELETE FROM audit_logs WHERE user_id = $1',
  //     [userId]
  //   );
  // }

  return deletions;
}

/**
 * Delete a test user
 */
async function deleteTestUser(client, user) {
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Delete related records
    const deletions = await deleteRelatedRecords(client, user.user_id);
    
    // Delete the user
    const result = await client.query(
      'DELETE FROM users WHERE user_id = $1',
      [user.user_id]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    return {
      success: true,
      deletions
    };
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  let client;
  
  try {
    console.log('🔍 Connecting to database...');
    client = await createConnection();
    console.log('✅ Connected to database\n');
    
    // Find all test users
    console.log('🔍 Searching for Test National Admin users...');
    const testUsers = await findTestUsers(client);
    
    if (testUsers.length === 0) {
      console.log('✅ No Test National Admin users found. Nothing to delete.\n');
      return;
    }
    
    console.log(`\n📋 Found ${testUsers.length} Test National Admin user(s):\n`);
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Admin Level: ${user.admin_level}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete these users and their related records!');
    console.log('⚠️  Audit logs will be preserved for compliance.\n');
    
    // Delete each user
    console.log('🗑️  Starting deletion process...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of testUsers) {
      try {
        console.log(`Deleting: ${user.name} (${user.email})...`);
        const result = await deleteTestUser(client, user);
        
        if (result.deletions.length > 0) {
          console.log(`  ↳ Also deleted: ${result.deletions.join(', ')}`);
        }
        
        console.log(`  ✅ Deleted successfully\n`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to delete: ${error.message}\n`);
        failCount++;
      }
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 DELETION SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successfully deleted: ${successCount} user(s)`);
    if (failCount > 0) {
      console.log(`❌ Failed to delete: ${failCount} user(s)`);
    }
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('👋 Database connection closed');
    }
  }
}

// Run the script
main();

