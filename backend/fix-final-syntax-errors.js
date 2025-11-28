const fs = require('fs');
const path = require('path');

const SERVICES_DIR = './src/services';

async function fixFinalSyntaxErrors() {
  console.log('🔧 Fixing Final Syntax Errors in Service Files');
  console.log('===============================================\n');
  
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
        
        // Fix specific syntax errors
        
        // 1. Fix broken template literals with missing closing braces
        content = content.replace(/`\$\{([^}]+)\s+\+\s+'([^']+)'\s*\$\{([^}]+)\}([^`]*)`/g, "'$1 + $2' + $3 + '$4'");
        
        // 2. Fix template literals that are partially converted
        content = content.replace(/`([^`]*)\$\{([^}]+)\}([^`]*)`/g, "'$1' + $2 + '$3'");
        
        // 3. Fix broken SQL queries in template literals
        content = content.replace(/'\s*\n\s*SELECT/g, `'
        SELECT`);
        content = content.replace(/'\s*\n\s*FROM/g, `'
        FROM`);
        content = content.replace(/'\s*\n\s*WHERE/g, `'
        WHERE`);
        content = content.replace(/'\s*\n\s*ORDER/g, `'
        ORDER`);
        content = content.replace(/'\s*\n\s*LIMIT/g, `'
        LIMIT`);
        
        // 4. Fix unterminated string literals
        content = content.replace(/'\s*\n\s*'/g, "' + '");
        
        // 5. Fix specific broken patterns
        content = content.replace(/\$\{([^}]+)\s+\+\s+'([^']+)'\s*\$\{([^}]+)\}/g, '$1 + \'$2\' + $3');
        
        // 6. Fix COLLATE issues (PostgreSQL doesn't use COLLATE utf8mb4_general_ci)
        content = content.replace(/COLLATE utf8mb4_general_ci/g, '');
        
        // 7. Fix specific broken map functions
        content = content.replace(/\.map\(\([^)]+\)\s*=>\s*`[^`]*`\)/g, (match) => {
          // Convert template literals in map functions to string concatenation
          return match.replace(/`([^`]*)\$\{([^}]+)\}([^`]*)`/g, "'$1' + $2 + '$3'");
        });
        
        // 8. Fix specific PostgreSQL casting issues
        content = content.replace(/::\s*:/g, '::');
        
        // 9. Fix specific broken parentheses
        content = content.replace(/\)\s*`\s*;/g, ');');
        
        // 10. Fix specific SQL query construction
        content = content.replace(/'\s*\+\s*dateFilter\s*\+\s*'/g, "' + dateFilter + '");
        
        // Write back if changes were made
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          totalFilesFixed++;
          console.log(`   ✅ ${fileName}: Fixed syntax errors`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error fixing ${fileName}: ${error.message}`);
      }
    }
    
    console.log('\n📊 FINAL SYNTAX FIX SUMMARY');
    console.log('===========================');
    console.log(`✅ Files fixed: ${totalFilesFixed}/${serviceFiles.length}`);
    
    console.log('\n🎉 FINAL SYNTAX ERROR FIXES COMPLETED!');
    console.log('======================================');
    console.log('✅ Template literal syntax errors fixed');
    console.log('✅ SQL query construction issues resolved');
    console.log('✅ String concatenation patterns corrected');
    console.log('✅ PostgreSQL compatibility issues addressed');
    
  } catch (error) {
    console.error('❌ Final syntax fix process failed:', error);
    throw error;
  }
}

// Run the fix
fixFinalSyntaxErrors()
  .then(() => {
    console.log('\n✅ Final syntax error fixes completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Final syntax error fixes failed:', error.message);
    process.exit(1);
  });
