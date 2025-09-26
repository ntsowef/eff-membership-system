// Test if MemberAuditService can be imported
const { execSync } = require('child_process');

try {
  console.log('Testing MemberAuditService import...');
  
  // Try to compile and run a simple test
  const testCode = `
    import { MemberAuditService } from './src/services/memberAuditService';
    console.log('✅ MemberAuditService imported successfully');
    console.log('Available methods:', Object.getOwnPropertyNames(MemberAuditService));
  `;
  
  require('fs').writeFileSync('temp-test.ts', testCode);
  
  const result = execSync('npx ts-node temp-test.ts', { 
    encoding: 'utf8',
    cwd: __dirname 
  });
  
  console.log(result);
  
  // Clean up
  require('fs').unlinkSync('temp-test.ts');
  
} catch (error) {
  console.log('❌ Error testing MemberAuditService import:');
  console.log(error.message);
  
  // Clean up
  try {
    require('fs').unlinkSync('temp-test.ts');
  } catch (e) {}
}
