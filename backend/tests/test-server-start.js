#!/usr/bin/env node

console.log('🚀 Testing server startup...');

try {
  console.log('1. Checking Node.js version:', process.version);
  console.log('2. Current working directory:', process.cwd());
  console.log('3. Environment variables:');
  console.log('   - NODE_ENV:', process.env.NODE_ENV);
  console.log('   - DB_NAME:', process.env.DB_NAME);
  console.log('   - SKIP_AUTH:', process.env.SKIP_AUTH);
  
  console.log('4. Attempting to require app.ts...');
  
  // Try to require the compiled app
  const path = require('path');
  const appPath = path.join(__dirname, 'dist', 'app.js');
  console.log('   App path:', appPath);
  
  const fs = require('fs');
  if (fs.existsSync(appPath)) {
    console.log('   ✅ Compiled app.js exists');
    
    try {
      require(appPath);
      console.log('   ✅ App loaded successfully');
    } catch (error) {
      console.error('   ❌ Error loading app:', error.message);
      console.error('   Stack:', error.stack);
    }
  } else {
    console.log('   ❌ Compiled app.js does not exist');
    
    // Try TypeScript version
    console.log('5. Trying TypeScript version...');
    try {
      require('ts-node/register');
      require('../src/app.ts');
      console.log('   ✅ TypeScript app loaded successfully');
    } catch (error) {
      console.error('   ❌ Error loading TypeScript app:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
  
} catch (error) {
  console.error('❌ Fatal error:', error.message);
  console.error('Stack:', error.stack);
}
