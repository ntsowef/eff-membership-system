const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetSuperAdminPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // First, check the column name
    const columnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name LIKE '%pass%'
      ORDER BY column_name
    `;
    const columnsResult = await client.query(columnsQuery);
    console.log('Password-related columns:', columnsResult.rows);

    // Find the 'password' column specifically
    const passwordColumn = columnsResult.rows.find(r => r.column_name === 'password')?.column_name || 'password';
    console.log(`Using column: ${passwordColumn}\n`);

    const newPassword = 'SuperAdmin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateQuery = `
      UPDATE users
      SET ${passwordColumn} = $1
      WHERE email = 'superadmin@eff.org.za'
      RETURNING user_id, name, email
    `;

    const result = await client.query(updateQuery, [hashedPassword]);

    if (result.rows.length > 0) {
      console.log('✅ Super Admin password reset successfully!');
      console.log('User:', result.rows[0]);
      console.log('\nCredentials:');
      console.log('  Email: superadmin@eff.org.za');
      console.log('  Password: SuperAdmin@123');
    } else {
      console.log('❌ Super Admin user not found');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

resetSuperAdminPassword();

