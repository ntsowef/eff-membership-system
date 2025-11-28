#!/usr/bin/env node

/**
 * Document Service Compilation Test
 * Tests that the documentService.ts compiles without errors
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Document Service Compilation...\n');

try {
  // Test TypeScript compilation
  console.log('📝 Running TypeScript compilation check...');
  const result = execSync('npx tsc --noEmit --skipLibCheck src/services/documentService.ts', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Document Service compiles successfully!');
  console.log('✅ All syntax errors have been fixed!');
  
} catch (error) {
  console.error('❌ Compilation failed:');
  console.error(error.stdout || error.message);
  process.exit(1);
}

console.log('\n🎉 Document Service Test Complete - All Passed!');
