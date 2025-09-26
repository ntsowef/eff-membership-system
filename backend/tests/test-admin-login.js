#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login credentials...\n');
    
    const credentials = [
      { email: 'admin@geomaps.local', password: 'admin123' },
      { email: 'admin@geomaps.local', password: 'password' },
      { email: 'admin@geomaps.local', password: 'admin' },
      { email: 'admin@membership.org', password: 'admin123' },
      { email: 'admin@membership.org', password: 'password' },
      { email: 'ntsowef@gmail.com', password: 'admin123' },
      { email: 'ntsowef@gmail.com', password: 'password' }
    ];
    
    for (const cred of credentials) {
      try {
        console.log(`📋 Trying: ${cred.email} / ${cred.password}`);
        const response = await axios.post(`${BASE_URL}/auth/login`, cred);
        
        if (response.data.success) {
          console.log(`✅ SUCCESS! Login worked for ${cred.email} / ${cred.password}`);
          console.log('   User info:', response.data.data.user);
          console.log('   Token:', response.data.data.token ? 'Present' : 'Missing');
          return cred;
        }
      } catch (error) {
        console.log(`❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log('\n❌ No working credentials found');
    return null;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

testAdminLogin();
