const mysql = require('mysql2/promise');

async function checkMunicipalUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'root',
    database: 'membership_new'
  });
  
  try {
    console.log('🔍 Checking user sihlemhlaba53@gmail.com...\n');
    
    // Check current user record
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['sihlemhlaba53@gmail.com']
    );
    
    if (users.length > 0) {
      console.log('📋 Current user record:');
      console.table(users);
      
      const user = users[0];
      console.log('\n🔍 Analysis:');
      console.log(`   - Admin Level: ${user.admin_level}`);
      console.log(`   - Province Code: ${user.province_code || 'NULL'}`);
      console.log(`   - District Code: ${user.district_code || 'NULL'}`);
      console.log(`   - Municipal Code: ${user.municipal_code || 'NULL'}`);
      console.log(`   - Ward Code: ${user.ward_code || 'NULL'}`);
      
      if (user.admin_level === 'municipality' && !user.municipal_code) {
        console.log('\n❌ ISSUE FOUND: Municipal admin user has no municipal_code assigned!');
      }
    } else {
      console.log('❌ User not found');
    }
    
    // Check table structure
    console.log('\n📊 Users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => {
      const nullable = col.Null === 'YES' ? '(nullable)' : '(not null)';
      const key = col.Key ? `[${col.Key}]` : '';
      console.log(`   - ${col.Field}: ${col.Type} ${nullable} ${key}`);
    });
    
    // Check municipalities table structure
    console.log('\n📊 Municipalities table structure:');
    const [muniColumns] = await connection.execute('DESCRIBE municipalities');
    muniColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    // Check available municipalities for reference
    console.log('\n🏛️ Available municipalities in Limpopo (LP) and District DC35:');
    const [municipalities] = await connection.execute(
      'SELECT * FROM municipalities WHERE province_code = ? AND district_code = ? LIMIT 10',
      ['LP', 'DC35']
    );
    console.table(municipalities);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMunicipalUser();
