/**
 * Browser Console Script to Check Token Status
 * 
 * INSTRUCTIONS:
 * 1. Open your browser (Chrome/Firefox)
 * 2. Go to http://localhost:3000
 * 3. Open DevTools (F12)
 * 4. Go to Console tab
 * 5. Copy and paste this entire script
 * 6. Press Enter
 * 
 * This will check if the token is stored and being sent with requests
 */

console.log('🔍 TOKEN DIAGNOSTIC TOOL\n');
console.log('=' .repeat(60));

// Check localStorage
console.log('\n📦 LOCALSTORAGE CHECK:');
console.log('=' .repeat(60));

const token = localStorage.getItem('authToken');
const sessionId = localStorage.getItem('sessionId');
const tokenExpiration = localStorage.getItem('tokenExpiration');
const rememberMe = localStorage.getItem('rememberMe');

console.log('✓ authToken:', token ? `Present (${token.substring(0, 50)}...)` : '❌ MISSING');
console.log('✓ sessionId:', sessionId ? `Present (${sessionId})` : '❌ MISSING');
console.log('✓ tokenExpiration:', tokenExpiration ? new Date(parseInt(tokenExpiration)).toLocaleString() : '❌ MISSING');
console.log('✓ rememberMe:', rememberMe || 'Not set');

// Check if token is expired
if (tokenExpiration) {
  const expirationTime = parseInt(tokenExpiration);
  const now = Date.now();
  const isExpired = now > expirationTime;
  const timeLeft = Math.floor((expirationTime - now) / 1000 / 60); // minutes
  
  console.log('\n⏰ TOKEN EXPIRATION:');
  console.log('=' .repeat(60));
  console.log('Status:', isExpired ? '❌ EXPIRED' : '✅ VALID');
  if (!isExpired) {
    console.log(`Time left: ${timeLeft} minutes`);
  }
}

// Check Zustand store
console.log('\n🏪 ZUSTAND STORE CHECK:');
console.log('=' .repeat(60));

try {
  const storeData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
  console.log('Store data:', storeData);
  console.log('Is authenticated:', storeData.state?.isAuthenticated || false);
  console.log('User:', storeData.state?.user?.email || 'Not logged in');
} catch (e) {
  console.log('❌ Could not parse Zustand store');
}

// Test API call with token
console.log('\n🌐 API CALL TEST:');
console.log('=' .repeat(60));

if (token) {
  console.log('Testing API call with token...');
  
  fetch('/api/v1/statistics/dashboard', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('✅ API Response Status:', response.status);
    if (response.status === 200) {
      console.log('✅ Token is VALID and working!');
      return response.json();
    } else if (response.status === 401) {
      console.log('❌ Token is INVALID or expired!');
      return response.json();
    } else {
      console.log('⚠️ Unexpected status:', response.status);
      return response.json();
    }
  })
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(error => {
    console.log('❌ API call failed:', error);
  });
} else {
  console.log('❌ No token found - cannot test API call');
}

// Check axios interceptors
console.log('\n🔧 AXIOS INTERCEPTOR CHECK:');
console.log('=' .repeat(60));
console.log('To check if axios is sending the token:');
console.log('1. Go to Network tab in DevTools');
console.log('2. Look for any API request (e.g., /api/v1/statistics/dashboard)');
console.log('3. Click on the request');
console.log('4. Check "Request Headers" section');
console.log('5. Look for "Authorization: Bearer <token>"');
console.log('\nIf Authorization header is missing, axios interceptor is not working!');

console.log('\n' + '='.repeat(60));
console.log('🎯 DIAGNOSIS COMPLETE');
console.log('=' .repeat(60));

// Provide recommendations
console.log('\n💡 RECOMMENDATIONS:');
if (!token) {
  console.log('❌ No token found - Please login first');
} else if (tokenExpiration && Date.now() > parseInt(tokenExpiration)) {
  console.log('❌ Token expired - Please login again');
} else {
  console.log('✅ Token is present and valid');
  console.log('⚠️ If API calls are still failing, check Network tab for Authorization header');
  console.log('⚠️ If Authorization header is missing, the axios interceptor is not working');
  console.log('\n🔧 QUICK FIX: Refresh the page (F5) to reinitialize axios interceptors');
}

console.log('\n');

