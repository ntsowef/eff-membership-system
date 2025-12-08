/**
 * Script to verify a user has been deleted from the system
 * Usage: node scripts/verify-user-deletion.js <email>
 * Example: node scripts/verify-user-deletion.js ntsowef@gmail.com
 */

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function verifyUserDeletion(email) {
  const client = await pool.connect();
  
  try {
    // Check if user exists
    const userResult = await client.query(
      'SELECT user_id, name, email, admin_level, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`\n✅ VERIFIED: User with email ${email} does NOT exist in the system`);
      console.log(`   The user has been successfully deleted.`);
    } else {
      const user = userResult.rows[0];
      console.log(`\n⚠️  WARNING: User with email ${email} still exists in the system`);
      console.log(`   ID: ${user.user_id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Admin Level: ${user.admin_level}`);
      console.log(`   Active: ${user.is_active}`);
    }

    // Check for related records
    console.log(`\n📋 Checking for related records...`);

    // Check OTP codes
    const otpResult = await client.query(
      'SELECT COUNT(*) as count FROM user_otp_codes WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)',
      [email]
    );
    console.log(`   OTP codes: ${otpResult.rows[0].count}`);

    // Check audit logs (these are kept for compliance)
    const auditResult = await client.query(
      'SELECT COUNT(*) as count FROM audit_logs WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)',
      [email]
    );
    console.log(`   Audit logs: ${auditResult.rows[0].count} (preserved for compliance)`);

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ ERROR: Email address is required');
  console.log('Usage: node scripts/verify-user-deletion.js <email>');
  console.log('Example: node scripts/verify-user-deletion.js ntsowef@gmail.com');
  process.exit(1);
}

// Run the verification
verifyUserDeletion(email);

