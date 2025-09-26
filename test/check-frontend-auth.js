// Simple script to check frontend authentication status
// Run this in the browser console on the dashboard page

console.log('🔍 Checking Frontend Authentication Status...\n');

// Check localStorage for auth tokens
const authToken = localStorage.getItem('authToken');
const token = localStorage.getItem('token');
const sessionId = localStorage.getItem('sessionId');

console.log('📋 LocalStorage Auth Data:');
console.log('  authToken:', authToken ? 'Present (' + authToken.substring(0, 20) + '...)' : 'Missing');
console.log('  token:', token ? 'Present (' + token.substring(0, 20) + '...)' : 'Missing');
console.log('  sessionId:', sessionId ? 'Present' : 'Missing');

// Check if user is authenticated in React state
console.log('\n📋 React Auth State:');
try {
  // Try to access the auth store (this might not work depending on how it's implemented)
  console.log('  Check the React DevTools for auth state');
} catch (error) {
  console.log('  Cannot access React state from console');
}

// Test API call manually
console.log('\n🧪 Testing API Call...');
fetch('/api/v1/statistics/dashboard', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : (token ? `Bearer ${token}` : 'No token')
  }
})
.then(response => {
  console.log('  Response Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('  Response Data:', data);
  if (data.success && data.data && data.data.system) {
    console.log('  ✅ API call successful!');
    console.log('  Total Members:', data.data.system.totals?.members);
  } else {
    console.log('  ❌ API call failed or returned unexpected data');
  }
})
.catch(error => {
  console.log('  ❌ API call error:', error);
});

console.log('\n📋 Instructions:');
console.log('1. If no authToken is present, you need to log in');
console.log('2. Go to /login and log in with admin credentials');
console.log('3. After login, return to dashboard and check again');
console.log('4. If authToken is present but API fails, check token validity');
