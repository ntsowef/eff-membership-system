#!/usr/bin/env node

const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing Gauteng admin login...');
    
    const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'gauteng.admin@membership.org',
      password: 'Gauteng123!'
    });
    
    console.log('Login response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
  }
}

testLogin();
