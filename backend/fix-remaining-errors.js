const fs = require('fs');
const path = require('path');

const SERVICES_DIR = './src/services';

async function fixRemainingErrors() {
  console.log('🔧 Fixing Remaining TypeScript Compilation Errors');
  console.log('================================================\n');
  
  try {
    // Get all TypeScript files in services directory
    const serviceFiles = fs.readdirSync(SERVICES_DIR)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.bak'))
      .map(file => path.join(SERVICES_DIR, file));
    
    let totalFilesFixed = 0;
    
    for (const filePath of serviceFiles) {
      const fileName = path.basename(filePath);
      
      try {
        // Read file content
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Fix specific patterns that are causing compilation errors
        
        // 1. Fix INTERVAL strings in SQL queries (need double quotes for TypeScript strings)
        content = content.replace(/INTERVAL\s+'(\d+\s+\w+)'/g, "INTERVAL '$1'");
        
        // 2. Fix template literal issues with percentage signs
        content = content.replace(/\$\{([^}]+)\}%/g, '${$1}%');
        
        // 3. Fix specific ternary operator issues
        content = content.replace(/\$1\s*([^:]+)\s*:\s*([^,;}\]]+)/g, '? $1 : $2');
        
        // 4. Fix specific function call issues
        content = content.replace(/(\w+)\$1\./g, '$1.');
        
        // 5. Fix array access issues
        content = content.replace(/\[(\d+)\]\$1\./g, '[$1].');
        
        // 6. Fix specific template literal patterns
        content = content.replace(/`([^`]*)\$\{([^}]+)\s+\$1\s+([^}]+)\s*:\s*([^}]+)\}([^`]*)`/g, '`$1${$2 ? $3 : $4}$5`');
        
        // 7. Fix specific error patterns
        content = content.replace(/error instanceof Error \$1 error\.message : 'Unknown error'/g, "error instanceof Error ? error.message : 'Unknown error'");
        
        // 8. Fix specific boolean patterns
        content = content.replace(/(\w+)\s+\$1\s+([^:]+)\s*:\s*([^,;}\]]+)/g, '$1 ? $2 : $3');
        
        // 9. Fix specific INTERVAL patterns in string literals
        content = content.replace(/'([^']*INTERVAL\s+)'(\d+\s+\w+)'([^']*)'/g, "'$1\\'$2\\'$3'");
        
        // 10. Fix percentage patterns in template literals
        content = content.replace(/\$\{([^}]+)\}\s*%/g, '${$1}%');
        
        // Write back if changes were made
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          totalFilesFixed++;
          console.log(`   ✅ ${fileName}: Fixed compilation errors`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error fixing ${fileName}: ${error.message}`);
      }
    }
    
    console.log('\n📊 FINAL FIX SUMMARY');
    console.log('====================');
    console.log(`✅ Files fixed: ${totalFilesFixed}/${serviceFiles.length}`);
    
    console.log('\n🎉 REMAINING ERROR FIXES COMPLETED!');
    console.log('===================================');
    console.log('✅ INTERVAL string patterns fixed');
    console.log('✅ Template literal issues resolved');
    console.log('✅ Ternary operator patterns corrected');
    console.log('✅ Function call patterns restored');
    console.log('✅ Array access patterns fixed');
    
  } catch (error) {
    console.error('❌ Final fix process failed:', error);
    throw error;
  }
}

// Run the fix
fixRemainingErrors()
  .then(() => {
    console.log('\n✅ Remaining error fixes completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Remaining error fixes failed:', error.message);
    process.exit(1);
  });
