const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Get next id value
    const maxIdResult = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM users');
    const nextId = maxIdResult.rows[0].next_id;

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password, role_id, is_active, admin_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
       RETURNING user_id, email`,
      [nextId, 'Test Admin', 'testadmin@eff.org.za', hashedPassword, 2, true, 'national']
    );

    console.log('User created:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createUser();

