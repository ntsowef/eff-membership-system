const { Pool } = require('pg');
const p = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function main() {
  try {
    // Check national admin users
    const res = await p.query(
      "SELECT u.user_id, u.email, u.name, u.admin_level, u.is_active, r.role_code, r.role_name FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE u.admin_level = 'national'"
    );
    console.log('=== National Admin Users ===');
    res.rows.forEach(row => console.log(JSON.stringify(row)));

    // Check what roles exist
    const roles = await p.query("SELECT role_id, role_code, role_name FROM roles ORDER BY role_id");
    console.log('\n=== Roles ===');
    roles.rows.forEach(row => console.log(JSON.stringify(row)));

    // Check columns in users table
    const cols = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('admin_level', 'role_id', 'full_name', 'name') ORDER BY column_name");
    console.log('\n=== Relevant User Columns ===');
    cols.rows.forEach(row => console.log(JSON.stringify(row)));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}
main();

