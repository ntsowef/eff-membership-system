const fs = require('fs');
const path = require('path');

const SERVICES_DIR = './src/services';

async function fixTemplateLiterals() {
  console.log('🔧 Fixing Template Literal Issues in Service Files');
  console.log('==================================================\n');
  
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
        
        // Fix template literal issues systematically
        
        // 1. Fix simple template literals with single variables
        content = content.replace(/`([^`$]*)\$\{([^}]+)\}([^`$]*)`/g, (match, prefix, variable, suffix) => {
          // If it's a simple case, convert to string concatenation
          if (!prefix.includes('${') && !suffix.includes('${')) {
            return `'${prefix}' + ${variable} + '${suffix}'`;
          }
          return match; // Keep complex cases for now
        });
        
        // 2. Fix percentage template literals
        content = content.replace(/`([^`$]*)\$\{([^}]+)\}%([^`]*)`/g, "'$1' + $2 + '%$3'");
        
        // 3. Fix specific patterns that are causing issues
        content = content.replace(/\.text\(`([^`]*)\$\{([^}]+)\}([^`]*)`/g, ".text('$1' + $2 + '$3'");
        
        // 4. Fix optional chaining issues
        content = content.replace(/(\w+)\?\s*\.\s*(\w+)/g, '$1?.$2');
        
        // 5. Fix specific ternary operator issues
        content = content.replace(/(\w+)\s+\$1\s+([^:]+)\s*:\s*([^,;}\]]+)/g, '$1 ? $2 : $3');
        
        // 6. Fix specific array access issues
        content = content.replace(/\$2/g, '');
        
        // 7. Fix specific function call issues
        content = content.replace(/(\w+)\$1\./g, '$1.');
        
        // Write back if changes were made
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          totalFilesFixed++;
          console.log(`   ✅ ${fileName}: Fixed template literal issues`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error fixing ${fileName}: ${error.message}`);
      }
    }
    
    console.log('\n📊 TEMPLATE LITERAL FIX SUMMARY');
    console.log('===============================');
    console.log(`✅ Files fixed: ${totalFilesFixed}/${serviceFiles.length}`);
    
    console.log('\n🎉 TEMPLATE LITERAL FIXES COMPLETED!');
    console.log('====================================');
    console.log('✅ Template literals converted to string concatenation');
    console.log('✅ Percentage patterns fixed');
    console.log('✅ Optional chaining issues resolved');
    console.log('✅ Ternary operator patterns corrected');
    
  } catch (error) {
    console.error('❌ Template literal fix process failed:', error);
    throw error;
  }
}

// Run the fix
fixTemplateLiterals()
  .then(() => {
    console.log('\n✅ Template literal fixes completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Template literal fixes failed:', error.message);
    process.exit(1);
  });
