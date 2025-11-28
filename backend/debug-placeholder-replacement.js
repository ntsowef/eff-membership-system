/**
 * Debug the placeholder replacement
 */

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function debugPlaceholderReplacement() {
  console.log('🔍 Debugging placeholder replacement...');
  
  try {
    const query = `
        SELECT
          DATE_FORMAT(ms.date_joined, '%Y-%m') as month_year,
          YEAR(ms.date_joined) as year,
          MONTHNAME(ms.date_joined) as month,
          COUNT(CASE WHEN st.subscription_type_id = 1 THEN 1 END) as new_members,
          COUNT(CASE WHEN st.subscription_type_id = 2 THEN 1 END) as renewals,
          COUNT(*) as total
        FROM memberships ms
        LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id
        WHERE ms.date_joined >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(ms.date_joined, '%Y-%m'), YEAR(ms.date_joined), MONTHNAME(ms.date_joined)
        ORDER BY ms.date_joined DESC
    `;
    
    const converted = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(query) : query;
    
    console.log('=== CONVERTED QUERY ===');
    console.log(converted);
    
    console.log('\n=== ANALYSIS ===');
    console.log('Contains placeholder:', converted.includes('__FIRST_GROUP_BY_EXPR__'));
    console.log('Contains GROUP BY:', converted.includes('GROUP BY'));
    
    if (converted.includes('GROUP BY')) {
      const groupByStart = converted.indexOf('GROUP BY') + 9;
      console.log('GROUP BY starts at position:', groupByStart);
      console.log('Characters after GROUP BY:', converted.substring(groupByStart, groupByStart + 50));
      
      // Manual extraction test
      let firstGroupByExpr = '';
      let parenCount = 0;
      let i = groupByStart;
      
      // Skip leading whitespace
      while (i < converted.length && /\s/.test(converted[i])) i++;
      console.log('After skipping whitespace, position:', i);
      console.log('Next 30 characters:', converted.substring(i, i + 30));
      
      // Extract the first expression
      let extractedChars = 0;
      while (i < converted.length && extractedChars < 100) { // Limit to prevent infinite loop
        const char = converted[i];
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        
        console.log(`Char ${extractedChars}: '${char}', parenCount: ${parenCount}`);
        
        // Stop at comma only if we're not inside parentheses
        if (char === ',' && parenCount === 0) {
          console.log('Stopping at comma outside parentheses');
          break;
        }
        
        firstGroupByExpr += char;
        i++;
        extractedChars++;
      }
      
      console.log('Extracted expression:', `"${firstGroupByExpr.trim()}"`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

// Run the debug
debugPlaceholderReplacement();
