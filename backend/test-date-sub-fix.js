/**
 * Test the DATE_SUB parameter fix
 */

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testDateSubFix() {
  console.log('🧪 Testing DATE_SUB parameter fix...');
  
  try {
    // Test DATE_SUB with parameter
    const paramQuery = `
      SELECT COUNT(*) 
      FROM memberships ms
      WHERE ms.date_joined >= DATE_SUB(CURRENT_DATE, INTERVAL $1 MONTH)
    `;
    
    const convertedParam = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(paramQuery) : paramQuery;
    
    console.log('Original:', paramQuery.trim());
    console.log('Converted:', convertedParam.trim());
    
    if (convertedParam.includes('::INTERVAL') && convertedParam.includes('||')) {
      console.log('✅ DATE_SUB with parameter converted correctly');
    } else {
      console.log('❌ DATE_SUB with parameter conversion failed');
    }
    
    // Test DATE_SUB with literal
    const literalQuery = `
      SELECT COUNT(*) 
      FROM memberships ms
      WHERE ms.date_joined >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    `;
    
    const convertedLiteral = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(literalQuery) : literalQuery;
    
    console.log('\nOriginal:', literalQuery.trim());
    console.log('Converted:', convertedLiteral.trim());
    
    if (convertedLiteral.includes('INTERVAL \'30 day\'')) {
      console.log('✅ DATE_SUB with literal converted correctly');
    } else {
      console.log('❌ DATE_SUB with literal conversion failed');
    }
    
    console.log('\n🎉 DATE_SUB testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testDateSubFix();
