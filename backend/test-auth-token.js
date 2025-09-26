const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function testAuthToken() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Testing Authentication Token Generation...\n');
    
    // Get a test user
    const [users] = await connection.execute(`
      SELECT u.id, u.name, u.email, u.password, u.admin_level, u.is_active,
             u.province_code, u.district_code, u.municipal_code, u.ward_code,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.is_active = 1
    `, ['admin@membership.org']);
    
    if (users.length === 0) {
      console.log('❌ No active admin user found');
      
      // Try to find any active user
      const [anyUsers] = await connection.execute(`
        SELECT u.id, u.name, u.email, u.admin_level, u.is_active
        FROM users u
        WHERE u.is_active = 1
        LIMIT 3
      `);
      
      console.log('Available active users:');
      anyUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Level: ${user.admin_level}`);
      });
      return;
    }
    
    const user = users[0];
    console.log('✅ Found user:', user.name, '(' + user.email + ')');
    console.log('   Admin Level:', user.admin_level);
    console.log('   Role:', user.role_name);
    
    // Generate JWT token (using the actual secret from .env)
    const testSecret = 'be6bf07fbef553bf6e00bdcf4d3e113b6b4a99157e1aadc7c51d401f4575bf52';
    
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_name: user.role_name,
        admin_level: user.admin_level,
        province_code: user.province_code,
        district_code: user.district_code,
        municipal_code: user.municipal_code,
        ward_code: user.ward_code
      },
      testSecret,
      { expiresIn: '24h' }
    );
    
    console.log('\n🔑 Generated JWT Token:');
    console.log(token);
    
    // Test the token by making a request to the dashboard endpoint
    console.log('\n🧪 Testing dashboard API with token...');
    
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch('http://localhost:5000/api/v1/statistics/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Dashboard API call successful!');
        console.log('System stats:');
        if (data.data && data.data.system) {
          console.log('   Total Members:', data.data.system.total_members || data.data.system.totals?.members);
          console.log('   Active Members:', data.data.system.active_members);
          console.log('   Expired Members:', data.data.system.expired_members);
        } else {
          console.log('   Raw response:', JSON.stringify(data, null, 2));
        }
      } else {
        console.log('❌ Dashboard API call failed:', response.status);
        console.log('   Error:', data);
      }
    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testAuthToken().catch(console.error);
