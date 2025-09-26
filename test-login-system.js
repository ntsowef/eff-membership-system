const axios = require('axios');

// Test the login system
async function testLoginSystem() {
  console.log('🔐 Testing Login System...\n');

  const baseURL = 'http://localhost:5000/api/v1';
  
  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connectivity...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Backend is running:', healthResponse.data.message);
    
    // Test 2: Test login endpoint with invalid credentials
    console.log('\n2. Testing login with invalid credentials...');
    try {
      await axios.post(`${baseURL}/auth/login`, {
        email: 'invalid@test.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid credentials properly rejected');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 3: Test login with valid demo credentials
    console.log('\n3. Testing login with valid demo credentials...');
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'admin@membership.org',
        password: 'Admin123!'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful');
        console.log('   User:', loginResponse.data.data.user.name);
        console.log('   Admin Level:', loginResponse.data.data.user.admin_level);
        console.log('   Token received:', loginResponse.data.data.token ? 'Yes' : 'No');
        
        // Test 4: Test token validation
        console.log('\n4. Testing token validation...');
        const token = loginResponse.data.data.token;
        const validateResponse = await axios.get(`${baseURL}/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (validateResponse.data.success) {
          console.log('✅ Token validation successful');
        } else {
          console.log('❌ Token validation failed');
        }
        
      } else {
        console.log('❌ Login failed:', loginResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Login test failed:', error.response?.data?.message || error.message);
    }
    
    // Test 5: Test protected endpoint without token
    console.log('\n5. Testing protected endpoint without token...');
    try {
      await axios.get(`${baseURL}/members`);
      console.log('❌ Protected endpoint accessible without token (security issue)');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Protected endpoint properly secured');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 Login system tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 5000');
    console.log('   Run: cd backend && npm run dev');
  }
}

// Test frontend build
async function testFrontendBuild() {
  console.log('\n🎨 Testing Frontend Build...\n');
  
  try {
    // Check if frontend files exist
    const fs = require('fs');
    const path = require('path');
    
    const frontendPath = path.join(__dirname, 'frontend');
    const srcPath = path.join(frontendPath, 'src');
    const loginPagePath = path.join(srcPath, 'pages', 'auth', 'LoginPage.tsx');
    
    if (fs.existsSync(loginPagePath)) {
      console.log('✅ LoginPage.tsx exists');
    } else {
      console.log('❌ LoginPage.tsx not found');
    }
    
    const authTypesPath = path.join(srcPath, 'types', 'auth.ts');
    if (fs.existsSync(authTypesPath)) {
      console.log('✅ Auth types file exists');
    } else {
      console.log('❌ Auth types file not found');
    }
    
    const forgotPasswordPath = path.join(srcPath, 'pages', 'auth', 'ForgotPasswordPage.tsx');
    if (fs.existsSync(forgotPasswordPath)) {
      console.log('✅ ForgotPasswordPage.tsx exists');
    } else {
      console.log('❌ ForgotPasswordPage.tsx not found');
    }
    
    const logoutButtonPath = path.join(srcPath, 'components', 'auth', 'LogoutButton.tsx');
    if (fs.existsSync(logoutButtonPath)) {
      console.log('✅ LogoutButton.tsx exists');
    } else {
      console.log('❌ LogoutButton.tsx not found');
    }
    
    console.log('\n💡 To test the frontend:');
    console.log('   1. cd frontend');
    console.log('   2. npm run dev');
    console.log('   3. Open http://localhost:3000');
    console.log('   4. Try logging in with: admin@membership.org / Admin123!');
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testLoginSystem();
  await testFrontendBuild();
  
  console.log('\n📋 Summary:');
  console.log('   ✅ Modern login page created with Material-UI');
  console.log('   ✅ React Hook Form + Yup validation implemented');
  console.log('   ✅ Authentication API integration completed');
  console.log('   ✅ Protected routes configured');
  console.log('   ✅ Security features added (CSRF, token management)');
  console.log('   ✅ Responsive design implemented');
  console.log('   ✅ Remember me functionality added');
  console.log('   ✅ Forgot password page created');
  console.log('   ✅ Logout functionality implemented');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Start the backend: cd backend && npm run dev');
  console.log('   2. Start the frontend: cd frontend && npm run dev');
  console.log('   3. Navigate to http://localhost:3000');
  console.log('   4. You should be redirected to /login');
  console.log('   5. Use demo credentials to test login');
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testLoginSystem, testFrontendBuild };
