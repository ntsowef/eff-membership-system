/**
 * Script to delete a user from the system
 * Usage: node scripts/delete-user.js <email>
 * Example: node scripts/delete-user.js ntsowef@gmail.com
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

async function deleteUser(email) {
  const client = await pool.connect();

  try {
    // Find user
    const userResult = await client.query(
      'SELECT user_id, name, email, admin_level FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`\n📋 User found:`);
    console.log(`   ID: ${user.user_id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin Level: ${user.admin_level}`);

    // Delete related records
    console.log(`\n🗑️  Deleting related records...`);

    // Delete OTP codes
    try {
      const otpResult = await client.query(
        'DELETE FROM user_otp_codes WHERE user_id = $1',
        [user.user_id]
      );
      console.log(`   ✅ Deleted ${otpResult.rowCount} OTP code(s)`);
    } catch (err) {
      console.log(`   ⚠️  OTP codes: ${err.message}`);
    }

    // Note: We keep audit logs for compliance
    console.log(`   ℹ️  Audit logs preserved for compliance`);

    // Delete the user
    console.log(`\n🗑️  Deleting user...`);
    const deleteResult = await client.query(
      'DELETE FROM users WHERE user_id = $1',
      [user.user_id]
    );

    if (deleteResult.rowCount > 0) {
      console.log(`\n✅ SUCCESS: User ${user.name} (${user.email}) has been permanently deleted from the system`);
    } else {
      console.log(`\n❌ FAILED: Could not delete user`);
    }

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
  console.log('Usage: node scripts/delete-user.js <email>');
  console.log('Example: node scripts/delete-user.js ntsowef@gmail.com');
  process.exit(1);
}

// Confirm deletion
console.log(`\n⚠️  WARNING: This will permanently delete the user with email: ${email}`);
console.log('This action cannot be undone!\n');

// Run the deletion
deleteUser(email);

