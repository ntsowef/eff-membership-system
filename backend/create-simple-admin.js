const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function createSimpleAdmin() {
  const pool = new Pool({
    user: 'eff_admin',
    host: 'localhost',
    database: 'eff_membership_db',
    password: 'Frames!123',
    port: 5432,
  });

  try {
    console.log('🔧 Creating simple admin user...');
    
    // Hash password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hash:', hashedPassword);
    
    // Insert or update user
    const query = `
      INSERT INTO users (name, email, password, admin_level, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = EXCLUDED.password,
        updated_at = NOW()
      RETURNING email, admin_level;
    `;
    
    const result = await pool.query(query, [
      'Test Admin',
      'test@admin.com',
      hashedPassword,
      'national'
    ]);
    
    console.log('✅ Admin user created/updated successfully!');
    console.log('📧 Email: test@admin.com');
    console.log('🔑 Password: admin123');
    console.log('Result:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createSimpleAdmin();
