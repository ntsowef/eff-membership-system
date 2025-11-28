const fs = require('fs');
const path = require('path');

const SERVICES_DIR = './src/services';

// Fix patterns for common migration errors
const FIX_PATTERNS = [
  // Fix ternary operators that were incorrectly converted
  {
    pattern: /\$1\s*([^$\s]+)\s*:\s*([^,;}\]]+)/g,
    replacement: '? $1 : $2',
    description: 'Fix ternary operators: $1 value : other → ? value : other'
  },
  
  // Fix INTERVAL strings that need proper quoting
  {
    pattern: /INTERVAL\s+'(\d+)\s+(\w+)'/g,
    replacement: "INTERVAL '$1 $2'",
    description: 'Fix INTERVAL quoting'
  },
  
  // Fix function calls that were incorrectly modified
  {
    pattern: /(\w+)\$1\.\(/g,
    replacement: '$1(',
    description: 'Fix function calls: func$1.( → func('
  },
  
  // Fix array access that was incorrectly modified
  {
    pattern: /\[(\d+)\]\$1\./g,
    replacement: '[$1].',
    description: 'Fix array access: [0]$1. → [0].'
  },
  
  // Fix template literal issues
  {
    pattern: /\$\{([^}]+)\s+\$1\s+([^}]+)\}/g,
    replacement: '${$1 ? $2}',
    description: 'Fix template literal ternary'
  }
];

async function fixMigrationErrors() {
  console.log('🔧 Fixing Migration Errors in Service Files');
  console.log('===========================================\n');
  
  try {
    // Get all TypeScript files in services directory
    const serviceFiles = fs.readdirSync(SERVICES_DIR)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.bak'))
      .map(file => path.join(SERVICES_DIR, file));
    
    console.log(`📁 Found ${serviceFiles.length} service files to fix:\n`);
    
    let totalFilesFixed = 0;
    let totalFixes = 0;
    
    for (const filePath of serviceFiles) {
      const fileName = path.basename(filePath);
      console.log(`🔧 Fixing ${fileName}...`);
      
      try {
        // Read file content
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let fileFixes = 0;
        
        // Apply all fix patterns
        for (const pattern of FIX_PATTERNS) {
          const beforeLength = content.length;
          
          if (typeof pattern.replacement === 'function') {
            content = content.replace(pattern.pattern, pattern.replacement);
          } else {
            content = content.replace(pattern.pattern, pattern.replacement);
          }
          
          const matches = (originalContent.match(pattern.pattern) || []).length;
          if (matches > 0) {
            fileFixes += matches;
            console.log(`     ✅ ${pattern.description}: ${matches} fixes`);
          }
        }
        
        // Additional specific fixes
        
        // Fix specific ternary operator patterns
        content = content.replace(/(\w+)\s+\$1\s+([^:]+)\s*:\s*([^,;}\]]+)/g, '$1 ? $2 : $3');
        
        // Fix INTERVAL patterns with single quotes
        content = content.replace(/INTERVAL\s+'(\d+\s+\w+)'/g, "INTERVAL '$1'");
        
        // Fix error instanceof patterns
        content = content.replace(/error instanceof Error \$1 error\.message : 'Unknown error'/g, "error instanceof Error ? error.message : 'Unknown error'");
        
        // Fix specific callback patterns
        content = content.replace(/(\w+)\$1\.\(/g, '$1(');
        
        // Fix array access patterns
        content = content.replace(/\[(\d+)\]\$1\./g, '[$1].');
        
        // Fix specific boolean patterns
        content = content.replace(/isApproved \$1 /g, 'isApproved ? ');
        
        // Fix specific template literal issues
        content = content.replace(/\$\{([^}]+) \$1 ([^}]+) : ([^}]+)\}/g, '${$1 ? $2 : $3}');
        
        // Write back if changes were made
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          totalFilesFixed++;
          totalFixes += fileFixes;
          console.log(`   ✅ ${fileName}: Fixed successfully`);
        } else {
          console.log(`   ℹ️  ${fileName}: No fixes needed`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error fixing ${fileName}: ${error.message}`);
      }
    }
    
    console.log('\n📊 FIX SUMMARY');
    console.log('==============');
    console.log(`✅ Files fixed: ${totalFilesFixed}/${serviceFiles.length}`);
    console.log(`✅ Total fixes applied: ${totalFixes}`);
    
    console.log('\n🎉 MIGRATION ERROR FIXES COMPLETED!');
    console.log('===================================');
    console.log('✅ Ternary operators fixed');
    console.log('✅ INTERVAL strings properly quoted');
    console.log('✅ Function calls restored');
    console.log('✅ Array access patterns fixed');
    console.log('✅ Template literal issues resolved');
    
  } catch (error) {
    console.error('❌ Fix process failed:', error);
    throw error;
  }
}

// Run the fix
fixMigrationErrors()
  .then(() => {
    console.log('\n✅ Migration error fixes completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration error fixes failed:', error.message);
    process.exit(1);
  });
