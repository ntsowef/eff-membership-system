/**
 * Update user's cell number
 * Usage: node backend/scripts/update-user-cell-number.js <email> <cell_number>
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function updateUserCellNumber(email, cellNumber) {
  const client = await pool.connect();
  
  try {
    console.log(`\n📱 Updating cell number for user: ${email}\n`);

    // Check if user exists
    const userResult = await client.query(
      'SELECT user_id, name, email, cell_number FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${email} not found!`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.name} (ID: ${user.user_id})`);
    console.log(`   Current cell number: ${user.cell_number || 'None'}`);

    // Update cell number
    await client.query(
      'UPDATE users SET cell_number = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [cellNumber, user.user_id]
    );

    console.log(`✅ Cell number updated to: ${cellNumber}`);

    // Verify update
    const verifyResult = await client.query(
      'SELECT user_id, name, email, cell_number FROM users WHERE user_id = $1',
      [user.user_id]
    );

    console.log('\n✅ Verification:');
    console.log(`   User: ${verifyResult.rows[0].name}`);
    console.log(`   Email: ${verifyResult.rows[0].email}`);
    console.log(`   Cell Number: ${verifyResult.rows[0].cell_number}`);
    console.log('\n✅ Update completed successfully!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get command line arguments
const email = process.argv[2];
const cellNumber = process.argv[3];

if (!email || !cellNumber) {
  console.log('\n❌ Usage: node backend/scripts/update-user-cell-number.js <email> <cell_number>');
  console.log('\nExample:');
  console.log('  node backend/scripts/update-user-cell-number.js ntsowef@gmail.com 0821234567\n');
  process.exit(1);
}

updateUserCellNumber(email, cellNumber);

