/**
 * Force Send OTP Script
 * 
 * Usage: node test/force-send-otp.js <email>
 * 
 * This script:
 * 1. Looks up the user by email
 * 2. Invalidates any existing active OTPs
 * 3. Calls the resend-otp API to generate and send a fresh OTP
 */

const { Pool } = require('pg');

const TARGET_EMAIL = process.argv[2] || 'ntsowef@gmail.com';
const API_BASE = 'http://localhost:5000/api/v1';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
});

async function main() {
  console.log(`\n🔍 Looking up user with email: ${TARGET_EMAIL}\n`);

  // Step 1: Find the user
  const userResult = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.cell_number, u.is_active, u.member_id, u.admin_level,
            r.role_name, r.role_code
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     WHERE u.email = $1`,
    [TARGET_EMAIL]
  );

  if (userResult.rows.length === 0) {
    console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const user = userResult.rows[0];
  console.log(`✅ User found:`);
  console.log(`   ID:         ${user.user_id}`);
  console.log(`   Name:       ${user.name}`);
  console.log(`   Email:      ${user.email}`);
  console.log(`   Cell:       ${user.cell_number || 'N/A'}`);
  console.log(`   Role:       ${user.role_name} (${user.role_code})`);
  console.log(`   Active:     ${user.is_active}`);
  console.log();

  if (!user.is_active) {
    console.error(`❌ User is inactive. Cannot send OTP.`);
    process.exit(1);
  }

  // Step 2: Invalidate any existing active OTPs
  console.log(`🗑️  Invalidating any existing active OTPs for user ${user.user_id}...`);
  const invalidateResult = await pool.query(
    `UPDATE user_otp_codes
     SET invalidated_at = CURRENT_TIMESTAMP,
         invalidation_reason = 'force_resend',
         is_expired = TRUE
     WHERE user_id = $1
       AND is_validated = FALSE
       AND is_expired = FALSE
       AND expires_at > CURRENT_TIMESTAMP
       AND invalidated_at IS NULL
     RETURNING otp_id`,
    [user.user_id]
  );

  const invalidatedCount = invalidateResult.rowCount;
  if (invalidatedCount > 0) {
    console.log(`   Invalidated ${invalidatedCount} active OTP(s): ${invalidateResult.rows.map(r => r.otp_id).join(', ')}`);
  } else {
    console.log(`   No active OTPs to invalidate.`);
  }
  console.log();

  // Step 3: Call the resend-otp API to generate a fresh OTP
  console.log(`📤 Calling resend-otp API for user ${user.user_id}...`);

  const response = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.user_id }),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    console.log(`\n✅ OTP sent successfully!`);
    console.log(`   Message:    ${data.message}`);
    console.log(`   Phone:      ${data.data?.phone_number_masked || 'N/A'}`);
    console.log(`   Email:      ${data.data?.email_masked || 'N/A'}`);
    console.log(`   Expires:    ${data.data?.otp_expires_at || 'N/A'}`);
    console.log(`   Existing?:  ${data.data?.is_existing_otp || false}`);
  } else {
    console.error(`\n❌ Failed to send OTP:`);
    console.error(`   Status:     ${response.status}`);
    console.error(`   Error:      ${data.error?.message || data.message || JSON.stringify(data)}`);
  }

  console.log();
  await pool.end();
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  pool.end();
  process.exit(1);
});

