const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testSuperAdminLogin() {
  const passwords = [
    'SuperAdmin@123',
    'Admin@123',
    'Frames!123',
    'TestAdmin@123',
    'superadmin',
    'admin123'
  ];

  console.log('🔐 Testing Super Admin login with different passwords...\n');

  for (const password of passwords) {
    try {
      console.log(`Trying password: ${password}`);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'superadmin@eff.org.za',
        password: password
      });

      if (response.data.success) {
        console.log(`\n✅ SUCCESS! Password is: ${password}\n`);
        console.log('User info:', response.data.data.user);
        return;
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`  ❌ Invalid password`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n❌ None of the passwords worked. Need to reset password.');
}

testSuperAdminLogin();

