const mysql = require('mysql2/promise');

async function fixMunicipalUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'root',
    database: 'membership_new'
  });
  
  try {
    console.log('🔧 Fixing municipal admin user sihlemhlaba53@gmail.com...\n');
    
    // Update the user's municipal_code
    const [result] = await connection.execute(
      'UPDATE users SET municipal_code = ? WHERE email = ?',
      ['LIM354', 'sihlemhlaba53@gmail.com']
    );
    
    console.log(`✅ Updated ${result.affectedRows} user record(s)`);
    
    // Verify the fix
    const [updatedUser] = await connection.execute(
      'SELECT id, name, email, admin_level, province_code, district_code, municipal_code, ward_code FROM users WHERE email = ?',
      ['sihlemhlaba53@gmail.com']
    );
    
    console.log('\n📋 Updated user record:');
    console.table(updatedUser);
    
    // Get municipality name for confirmation
    const [municipality] = await connection.execute(
      'SELECT municipality_name FROM municipalities WHERE municipality_code = ?',
      ['LIM354']
    );
    
    if (municipality.length > 0) {
      console.log(`\n✅ User is now assigned to: ${municipality[0].municipality_name} (LIM354)`);
    }
    
    // Log the fix in admin creation log
    await connection.execute(`
      INSERT INTO admin_user_creation_log (
        created_user_id, created_by_user_id, admin_level,
        creation_reason, approval_status, created_at
      ) VALUES (?, ?, ?, ?, 'approved', NOW())
    `, [
      updatedUser[0].id,
      1, // System admin
      'municipality',
      'Fixed missing municipal_code assignment for existing municipal admin user'
    ]);
    
    console.log('📝 Logged the fix in admin creation log');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixMunicipalUser();
