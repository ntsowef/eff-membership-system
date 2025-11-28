const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function updateAdminPassword() {
  const pool = new Pool({
    user: 'eff_admin',
    host: 'localhost',
    database: 'eff_membership_db',
    password: 'Frames!123',
    port: 5432,
  });

  try {
    console.log('🔧 Updating national admin password...');
    
    // Hash password
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hashedPassword);
    
    // Update password using parameterized query
    const query = `
      UPDATE users 
      SET password = $1, updated_at = NOW() 
      WHERE email = $2
      RETURNING email, admin_level;
    `;
    
    const result = await pool.query(query, [hashedPassword, 'national.admin@eff.org.za']);
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully!');
      console.log('📧 Email: national.admin@eff.org.za');
      console.log('🔑 Password: Admin@123');
      console.log('Result:', result.rows[0]);
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();
