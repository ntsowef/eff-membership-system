const fetch = require('node-fetch');

async function testLogin() {
  console.log('🔍 Testing Login Process...\n');
  
  try {
    // Test login with admin credentials
    const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@membership.org',
        password: 'admin123' // Common default password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.ok && loginData.success) {
      console.log('✅ Login successful!');
      console.log('   User:', loginData.data.user.name);
      console.log('   Email:', loginData.data.user.email);
      console.log('   Admin Level:', loginData.data.user.admin_level);
      console.log('   Token:', loginData.data.token.substring(0, 20) + '...');
      
      // Test dashboard API with the token
      console.log('\n🧪 Testing dashboard API with login token...');
      
      const dashboardResponse = await fetch('http://localhost:5000/api/v1/statistics/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.data.token}`
        }
      });
      
      const dashboardData = await dashboardResponse.json();
      
      if (dashboardResponse.ok && dashboardData.success) {
        console.log('✅ Dashboard API call successful!');
        console.log('   Total Members:', dashboardData.data.system.totals?.members);
        console.log('   Active Memberships:', dashboardData.data.system.totals?.active_memberships);
        console.log('   Provinces:', dashboardData.data.system.totals?.provinces);
        
        console.log('\n🎯 SOLUTION:');
        console.log('1. Go to http://localhost:3000/login');
        console.log('2. Login with:');
        console.log('   Email: admin@membership.org');
        console.log('   Password: admin123');
        console.log('3. After login, the dashboard should show the correct data');
        
      } else {
        console.log('❌ Dashboard API call failed:', dashboardData);
      }
      
    } else {
      console.log('❌ Login failed:', loginData);
      
      // Try alternative passwords
      console.log('\n🔄 Trying alternative passwords...');
      
      const altPasswords = ['password', 'admin', '123456', 'membership123'];
      
      for (const password of altPasswords) {
        console.log(`   Trying password: ${password}`);
        
        const altResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'admin@membership.org',
            password: password
          })
        });
        
        const altData = await altResponse.json();
        
        if (altResponse.ok && altData.success) {
          console.log(`   ✅ Success with password: ${password}`);
          console.log(`   User: ${altData.data.user.name}`);
          break;
        } else {
          console.log(`   ❌ Failed with password: ${password}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin().catch(console.error);
