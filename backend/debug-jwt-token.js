#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const axios = require('axios');

async function debugJWTToken() {
  try {
    console.log('🔍 Debugging JWT Token...\n');
    
    // Step 1: Login and get token
    console.log('1️⃣ Getting JWT token...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'gauteng.admin@membership.org',
      password: 'Gauteng123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Token received');
    console.log('Token (first 100 chars):', token.substring(0, 100) + '...');
    
    // Step 2: Decode token without verification
    console.log('\n2️⃣ Decoding token (without verification)...');
    const decoded = jwt.decode(token, { complete: true });
    console.log('Token header:', JSON.stringify(decoded.header, null, 2));
    console.log('Token payload:', JSON.stringify(decoded.payload, null, 2));
    
    // Step 3: Try to verify token with the expected secret
    console.log('\n3️⃣ Verifying token...');
    const jwtSecret = 'be6bf07fbef553bf6e00bdcf4d3e113b6b4a99157e1aadc7c51d401f4575bf52';
    
    try {
      const verified = jwt.verify(token, jwtSecret, {
        issuer: 'geomaps-api',
        audience: 'geomaps-client'
      });
      console.log('✅ Token verification successful');
      console.log('Verified payload:', JSON.stringify(verified, null, 2));
    } catch (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
      
      // Try without issuer/audience
      try {
        const verifiedSimple = jwt.verify(token, jwtSecret);
        console.log('✅ Token verification successful (without issuer/audience)');
        console.log('Verified payload:', JSON.stringify(verifiedSimple, null, 2));
      } catch (simpleError) {
        console.log('❌ Simple token verification also failed:', simpleError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugJWTToken();
