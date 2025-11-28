/**
 * Emergency fix for critical TypeScript errors
 * Focuses on the most severe issues preventing server startup
 */

const fs = require('fs');
const path = require('path');

// Critical files that need immediate fixing
const criticalFiles = [
  'src/services/comprehensiveFinancialService.ts',
  'src/services/deliveryTrackingService.ts',
  'src/services/financialTransactionQueryService.ts',
  'src/services/smsDeliveryTrackingService.ts',
  'src/services/smsManagementService.ts',
  'src/services/userManagementService.ts'
];

function restoreFromBackup(filePath) {
  try {
    // Find the most recent backup
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);
    const files = fs.readdirSync(dir);
    
    const backups = files
      .filter(f => f.startsWith(filename + '.backup-'))
      .sort()
      .reverse();
    
    if (backups.length > 0) {
      const backupPath = path.join(dir, backups[0]);
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(filePath, backupContent);
      console.log(`✅ Restored ${filePath} from ${backups[0]}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error restoring ${filePath}:`, error.message);
    return false;
  }
}

function fixTemplateStrings(content) {
  let fixed = content;
  
  // Fix import statements that got corrupted
  fixed = fixed.replace(/from\s+['"][^'"]*`/g, (match) => {
    return match.replace('`', "'");
  });
  
  // Fix type definitions that got corrupted
  fixed = fixed.replace(/:\s*['"][^'"]*`/g, (match) => {
    return match.replace('`', "'");
  });
  
  // Fix string literals that should not be template literals
  fixed = fixed.replace(/=\s*['"][^'"]*`/g, (match) => {
    if (!match.includes('${')) {
      return match.replace('`', "'");
    }
    return match;
  });
  
  // Fix SQL queries - ensure they use template literals properly
  fixed = fixed.replace(/const\s+\w*[Qq]uery\s*=\s*'/g, (match) => {
    return match.replace("'", '`');
  });
  
  fixed = fixed.replace(/let\s+\w*[Qq]uery\s*=\s*'/g, (match) => {
    return match.replace("'", '`');
  });
  
  // Fix query concatenations
  fixed = fixed.replace(/query\s*\+=\s*'/g, 'query += `');
  fixed = fixed.replace(/whereClause\s*=\s*'/g, 'whereClause = `');
  
  // Fix unterminated queries
  fixed = fixed.replace(/`\s*;\s*$/gm, '`;');
  
  return fixed;
}

function fixSpecificFile(filePath) {
  try {
    console.log(`🔧 Fixing ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // First, try to restore from backup if the file is severely corrupted
    if (content.includes('error TS1002') || content.split('\n')[0].includes('`')) {
      console.log(`🔄 File appears corrupted, attempting restore from backup...`);
      if (restoreFromBackup(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
      }
    }
    
    // Apply targeted fixes
    const originalContent = content;
    content = fixTemplateStrings(content);
    
    // Write the fixed content
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    
    // Try to restore from backup as last resort
    console.log(`🔄 Attempting backup restore as last resort...`);
    return restoreFromBackup(filePath);
  }
}

async function emergencyFix() {
  console.log('🚨 EMERGENCY TypeScript Fix Starting...\n');
  
  let fixedCount = 0;
  let restoredCount = 0;
  
  for (const file of criticalFiles) {
    const fullPath = path.join(__dirname, file);
    
    // Check if backup exists first
    const dir = path.dirname(fullPath);
    const filename = path.basename(fullPath);
    const files = fs.readdirSync(dir);
    const hasBackup = files.some(f => f.startsWith(filename + '.backup-'));
    
    if (hasBackup) {
      console.log(`📁 Backup available for ${file}`);
      if (restoreFromBackup(fullPath)) {
        restoredCount++;
      }
    } else {
      if (fixSpecificFile(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  console.log('\n📊 Emergency Fix Summary:');
  console.log(`   Files restored from backup: ${restoredCount}`);
  console.log(`   Files fixed: ${fixedCount}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Run: npx tsc --noEmit (to check for remaining errors)');
  console.log('   2. If still errors, we may need manual intervention');
  console.log('   3. Run: npm start (to test server startup)');
  
  console.log('\n✅ Emergency fix completed!');
}

// Run the emergency fix
emergencyFix().catch(console.error);
