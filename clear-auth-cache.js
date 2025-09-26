// Simple script to clear authentication cache
console.log('🧹 Clearing authentication cache...');

// This would be run in the browser console to clear localStorage
const clearScript = `
// Clear all authentication-related localStorage items
localStorage.removeItem('authToken');
localStorage.removeItem('tokenExpiration');
localStorage.removeItem('rememberMe');
localStorage.removeItem('auth-storage');

// Clear any Zustand persisted state
Object.keys(localStorage).forEach(key => {
  if (key.includes('auth') || key.includes('user')) {
    localStorage.removeItem(key);
  }
});

console.log('✅ Authentication cache cleared!');
console.log('Please refresh the page to see the login screen.');
`;

console.log('📋 To clear the frontend authentication cache:');
console.log('1. Open your browser developer tools (F12)');
console.log('2. Go to the Console tab');
console.log('3. Paste and run this code:');
console.log('');
console.log(clearScript);
console.log('');
console.log('4. Refresh the page');
console.log('');
console.log('🎯 Then try logging in with: admin@membership.org / Admin123!');
