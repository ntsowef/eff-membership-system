const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function getFreshToken() {
  try {
    console.log('🔐 Generating fresh JWT token for National Administrator...\n');

    // Get user from database
    const userQuery = `
      SELECT
        u.user_id,
        u.name,
        u.email,
        u.password,
        u.admin_level,
        u.province_code,
        u.district_code,
        u.municipal_code,
        u.ward_code,
        u.is_active,
        r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = $1 AND u.is_active = TRUE
    `;

    const result = await pool.query(userQuery, ['national.admin@eff.org.za']);

    if (result.rows.length === 0) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log(`✅ Found user: ${user.name}`);
    console.log(`   User ID: ${user.user_id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin Level: ${user.admin_level}`);
    console.log(`   Role: ${user.role_name || 'N/A'}\n`);

    // Verify password (Admin@123)
    const testPassword = 'Admin@123';
    const isValid = await bcrypt.compare(testPassword, user.password);

    if (!isValid) {
      console.log('❌ Password verification failed!');
      console.log('   The password in database does not match "Admin@123"');
      console.log('   You may need to reset it.\n');
      process.exit(1);
    }

    console.log('✅ Password verified!\n');

    // Generate JWT token with the correct secret from .env
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.log('❌ JWT_SECRET not found in environment variables!');
      console.log('   Make sure .env file exists and contains JWT_SECRET');
      process.exit(1);
    }

    console.log(`🔑 Using JWT_SECRET from .env file\n`);

    const token = jwt.sign(
      {
        id: user.user_id,
        email: user.email,
        role_name: user.role_name,
        admin_level: user.admin_level,
        province_code: user.province_code,
        district_code: user.district_code,
        municipal_code: user.municipal_code,
        ward_code: user.ward_code
      },
      jwtSecret,
      {
        expiresIn: '24h',
        issuer: 'geomaps-api',
        audience: 'geomaps-client'
      }
    );

    console.log('🎫 Fresh JWT Token Generated:\n');
    console.log(token);
    console.log('\n');
    console.log('📋 Token Payload:');
    const decoded = jwt.decode(token);
    console.log(JSON.stringify(decoded, null, 2));
    console.log('\n');
    console.log('✅ Use this token in your Authorization header:');
    console.log(`   Authorization: Bearer ${token}`);
    console.log('\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

getFreshToken();

