/**
 * Simple test for GROUP_CONCAT conversion
 */

try {
  const { SQLMigrationService } = require('./dist/services/sqlMigrationService');
  
  console.log('🔍 Testing GROUP_CONCAT conversion...');
  
  const testQuery = `SELECT GROUP_CONCAT(name SEPARATOR ', ') as names FROM table1`;
  
  console.log('Original:', testQuery);
  
  const converted = SQLMigrationService.convertComplexMySQLQuery(testQuery);
  
  console.log('Converted:', converted);
  
  console.log('✅ Test completed successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
