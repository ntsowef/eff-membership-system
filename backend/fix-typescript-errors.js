/**
 * Emergency TypeScript Error Fix Script
 * Fixes critical template literal and SQL query issues preventing server startup
 */

const fs = require('fs');
const path = require('path');

// List of files with critical errors
const criticalFiles = [
  'src/services/comprehensiveFinancialService.ts',
  'src/services/deliveryTrackingService.ts',
  'src/services/financialTransactionQueryService.ts',
  'src/services/paymentService.ts',
  'src/services/renewalPricingService.ts',
  'src/services/renewalProcessingService.ts',
  'src/services/smsDeliveryTrackingService.ts',
  'src/services/smsManagementService.ts',
  'src/services/userManagementService.ts'
];

function fixTemplateErrors(content) {
  // Fix unterminated template literals
  let fixed = content;
  
  // Fix common template literal issues
  fixed = fixed.replace(/const\s+\w+\s*=\s*'/g, (match) => {
    if (match.includes('Query') || match.includes('query')) {
      return match.replace("'", '`');
    }
    return match;
  });
  
  // Fix unterminated queries that should be template literals
  fixed = fixed.replace(/=\s*'\s*\n\s*SELECT/g, '= `\n        SELECT');
  fixed = fixed.replace(/=\s*'\s*\n\s*UPDATE/g, '= `\n        UPDATE');
  fixed = fixed.replace(/=\s*'\s*\n\s*INSERT/g, '= `\n        INSERT');
  fixed = fixed.replace(/=\s*'\s*\n\s*DELETE/g, '= `\n        DELETE');
  
  // Fix queries that end with string concatenation
  fixed = fixed.replace(/'\s*\+\s*whereClause\s*\+\s*'\s*\+\s*';/g, '` + whereClause;');
  fixed = fixed.replace(/'\s*\+\s*setClause\.join\([^)]+\)\s*\+\s*'[^']*'/g, (match) => {
    return match.replace(/'/g, '`').replace(/\+\s*'[^']*'$/, '');
  });
  
  // Fix specific SQL query patterns
  fixed = fixed.replace(/WHERE\s+'\s*\+\s*timeCondition\s*\+\s*'\s*\+\s*';/g, 'WHERE ` + timeCondition + `;');
  
  // Fix escaped quotes in INTERVAL statements
  fixed = fixed.replace(/INTERVAL\s*\\'/g, "INTERVAL '");
  fixed = fixed.replace(/\\'(\d+\s+\w+)\\'/g, "'$1'");
  
  // Fix template literal endings
  fixed = fixed.replace(/'\s*;\s*$/gm, '`;');
  
  return fixed;
}

function fixSQLSyntaxErrors(content) {
  let fixed = content;
  
  // Fix PostgreSQL casting syntax
  fixed = fixed.replace(/::DATE/g, '::date');
  fixed = fixed.replace(/::TIMESTAMP/g, '::timestamp');
  
  // Fix TIMESTAMPDIFF to EXTRACT
  fixed = fixed.replace(/TIMESTAMPDIFF\(YEAR,\s*([^,]+),\s*([^)]+)\)/g, 'EXTRACT(YEAR FROM AGE($2, $1))');
  
  // Fix MySQL DATE_ADD to PostgreSQL INTERVAL
  fixed = fixed.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s*([^)]+)\)/g, '($1 + INTERVAL $2)');
  
  // Fix MySQL DATEDIFF to PostgreSQL date arithmetic
  fixed = fixed.replace(/DATEDIFF\(([^,]+),\s*([^)]+)\)/g, '($1::date - $2::date)');
  
  return fixed;
}

function fixFile(filePath) {
  try {
    console.log(`🔧 Fixing ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Apply fixes
    content = fixTemplateErrors(content);
    content = fixSQLSyntaxErrors(content);
    
    // Check if changes were made
    if (content !== originalContent) {
      // Create backup
      const backupPath = filePath + '.backup-' + Date.now();
      fs.writeFileSync(backupPath, originalContent);
      
      // Write fixed content
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${filePath} (backup: ${backupPath})`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function fixAllFiles() {
  console.log('🚨 Emergency TypeScript Error Fix Starting...\n');
  
  let fixedCount = 0;
  let totalFiles = criticalFiles.length;
  
  for (const file of criticalFiles) {
    const fullPath = path.join(__dirname, file);
    if (fixFile(fullPath)) {
      fixedCount++;
    }
  }
  
  console.log('\n📊 Fix Summary:');
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Files unchanged: ${totalFiles - fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎯 Next Steps:');
    console.log('   1. Run: npx tsc --noEmit (to check for remaining errors)');
    console.log('   2. Run: npm start (to test server startup)');
    console.log('   3. Check backups if any issues occur');
  }
  
  console.log('\n✅ Emergency fix completed!');
}

// Run the fix
fixAllFiles().catch(console.error);
