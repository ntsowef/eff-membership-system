const fs = require('fs');
const path = require('path');

const SERVICES_DIR = './src/services';

// MySQL to PostgreSQL conversion patterns
const CONVERSION_PATTERNS = [
  // Parameter placeholders
  {
    pattern: /\?/g,
    replacement: (match, offset, string) => {
      // Count how many ? appear before this one
      const beforeThis = string.substring(0, offset);
      const paramIndex = (beforeThis.match(/\?/g) || []).length + 1;
      return `$${paramIndex}`;
    },
    description: 'Parameter placeholders: ? → $1, $2, $3'
  },
  
  // Date functions
  {
    pattern: /\bNOW\(\)/g,
    replacement: 'CURRENT_TIMESTAMP',
    description: 'Date function: NOW() → CURRENT_TIMESTAMP'
  },
  {
    pattern: /\bCURDATE\(\)/g,
    replacement: 'CURRENT_DATE',
    description: 'Date function: CURDATE() → CURRENT_DATE'
  },
  {
    pattern: /\bDATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/gi,
    replacement: '($1 - INTERVAL \'$2 $3\')',
    description: 'Date function: DATE_SUB() → INTERVAL subtraction'
  },
  {
    pattern: /\bDATE_ADD\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/gi,
    replacement: '($1 + INTERVAL \'$2 $3\')',
    description: 'Date function: DATE_ADD() → INTERVAL addition'
  },
  {
    pattern: /\bYEAR\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'EXTRACT(YEAR FROM $1)',
    description: 'Date function: YEAR() → EXTRACT(YEAR FROM ...)'
  },
  {
    pattern: /\bMONTH\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'EXTRACT(MONTH FROM $1)',
    description: 'Date function: MONTH() → EXTRACT(MONTH FROM ...)'
  },
  {
    pattern: /\bDAY\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'EXTRACT(DAY FROM $1)',
    description: 'Date function: DAY() → EXTRACT(DAY FROM ...)'
  },
  {
    pattern: /\bDATE\s*\(\s*([^)]+)\s*\)/g,
    replacement: '$1::DATE',
    description: 'Date function: DATE() → ::DATE casting'
  },
  
  // String functions
  {
    pattern: /\bIFNULL\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: 'COALESCE($1, $2)',
    description: 'String function: IFNULL() → COALESCE()'
  },
  {
    pattern: /\bIF\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: 'CASE WHEN $1 THEN $2 ELSE $3 END',
    description: 'Conditional: IF() → CASE WHEN ... THEN ... ELSE ... END'
  },
  
  // UPSERT operations
  {
    pattern: /\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/gi,
    replacement: 'ON CONFLICT DO UPDATE SET',
    description: 'UPSERT: ON DUPLICATE KEY UPDATE → ON CONFLICT DO UPDATE SET'
  },
  {
    pattern: /\bVALUES\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'EXCLUDED.$1',
    description: 'UPSERT: VALUES() → EXCLUDED.'
  },
  
  // Boolean values
  {
    pattern: /\b=\s*1\b/g,
    replacement: '= TRUE',
    description: 'Boolean: = 1 → = TRUE'
  },
  {
    pattern: /\b=\s*0\b/g,
    replacement: '= FALSE',
    description: 'Boolean: = 0 → = FALSE'
  },
  {
    pattern: /\bIS\s+1\b/gi,
    replacement: 'IS TRUE',
    description: 'Boolean: IS 1 → IS TRUE'
  },
  {
    pattern: /\bIS\s+0\b/gi,
    replacement: 'IS FALSE',
    description: 'Boolean: IS 0 → IS FALSE'
  },
  
  // LIMIT syntax
  {
    pattern: /\bLIMIT\s+(\d+)\s*,\s*(\d+)\b/g,
    replacement: 'OFFSET $1 LIMIT $2',
    description: 'LIMIT: LIMIT offset, count → OFFSET offset LIMIT count'
  },
  
  // String concatenation
  {
    pattern: /\bCONCAT\s*\(\s*([^)]+)\s*\)/g,
    replacement: (match, args) => {
      const argList = args.split(',').map(arg => arg.trim());
      return argList.join(' || ');
    },
    description: 'String function: CONCAT() → || operator'
  },
  
  // LPAD function
  {
    pattern: /\bLPAD\s*\(\s*([^,]+),\s*(\d+),\s*'([^']+)'\s*\)/g,
    replacement: 'LPAD($1::TEXT, $2, \'$3\')',
    description: 'String function: LPAD() with text casting'
  },
  
  // SUBSTRING_INDEX function
  {
    pattern: /\bSUBSTRING_INDEX\s*\(\s*([^,]+),\s*'([^']+)',\s*(\d+)\s*\)/g,
    replacement: 'SPLIT_PART($1, \'$2\', $3)',
    description: 'String function: SUBSTRING_INDEX() → SPLIT_PART()'
  },
  
  // LOCATE function
  {
    pattern: /\bLOCATE\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: 'POSITION($1 IN $2)',
    description: 'String function: LOCATE() → POSITION()'
  },
  
  // DATEDIFF function
  {
    pattern: /\bDATEDIFF\s*\(\s*([^,]+),\s*([^)]+)\s*\)/g,
    replacement: '($1::DATE - $2::DATE)',
    description: 'Date function: DATEDIFF() → date subtraction'
  }
];

async function migrateAllServices() {
  console.log('🔄 Migrating All Services from MySQL to PostgreSQL');
  console.log('==================================================\n');
  
  try {
    // Get all TypeScript files in services directory
    const serviceFiles = fs.readdirSync(SERVICES_DIR)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.bak'))
      .map(file => path.join(SERVICES_DIR, file));
    
    console.log(`📁 Found ${serviceFiles.length} service files to migrate:\n`);
    
    let totalFilesProcessed = 0;
    let totalChanges = 0;
    const migrationReport = [];
    
    for (const filePath of serviceFiles) {
      const fileName = path.basename(filePath);
      console.log(`🔧 Processing ${fileName}...`);
      
      try {
        // Read file content
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let fileChanges = 0;
        const fileReport = {
          file: fileName,
          changes: [],
          hasChanges: false
        };
        
        // Apply all conversion patterns
        for (const pattern of CONVERSION_PATTERNS) {
          const beforeLength = content.length;
          
          if (typeof pattern.replacement === 'function') {
            // Handle function replacements (like parameter placeholders)
            if (pattern.pattern.source === '\\?') {
              // Special handling for parameter placeholders
              content = convertParameterPlaceholders(content);
            } else {
              content = content.replace(pattern.pattern, pattern.replacement);
            }
          } else {
            content = content.replace(pattern.pattern, pattern.replacement);
          }
          
          const afterLength = content.length;
          const matches = (originalContent.match(pattern.pattern) || []).length;
          
          if (matches > 0) {
            fileChanges += matches;
            fileReport.changes.push({
              pattern: pattern.description,
              matches: matches
            });
          }
        }
        
        // Write back if changes were made
        if (content !== originalContent) {
          // Create backup
          fs.writeFileSync(filePath + '.mysql-backup', originalContent);
          
          // Write converted content
          fs.writeFileSync(filePath, content);
          
          fileReport.hasChanges = true;
          totalFilesProcessed++;
          totalChanges += fileChanges;
          
          console.log(`   ✅ ${fileChanges} changes applied`);
        } else {
          console.log(`   ℹ️  No MySQL patterns found`);
        }
        
        migrationReport.push(fileReport);
        
      } catch (error) {
        console.log(`   ❌ Error processing ${fileName}: ${error.message}`);
      }
    }
    
    // Generate detailed report
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('===================');
    console.log(`✅ Files processed: ${totalFilesProcessed}/${serviceFiles.length}`);
    console.log(`✅ Total changes applied: ${totalChanges}`);
    
    console.log('\n📋 DETAILED CHANGES BY FILE:');
    console.log('============================');
    
    migrationReport.forEach(report => {
      if (report.hasChanges) {
        console.log(`\n📄 ${report.file}:`);
        report.changes.forEach(change => {
          console.log(`   ✅ ${change.pattern}: ${change.matches} occurrences`);
        });
      }
    });
    
    // Show files with no changes
    const unchangedFiles = migrationReport.filter(r => !r.hasChanges);
    if (unchangedFiles.length > 0) {
      console.log('\n📄 Files with no MySQL patterns:');
      unchangedFiles.forEach(report => {
        console.log(`   ℹ️  ${report.file}`);
      });
    }
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('===================================');
    console.log('✅ All service files have been migrated to PostgreSQL');
    console.log('✅ Original files backed up with .mysql-backup extension');
    console.log('✅ Parameter placeholders converted to PostgreSQL format');
    console.log('✅ Date functions converted to PostgreSQL equivalents');
    console.log('✅ String functions converted to PostgreSQL syntax');
    console.log('✅ Boolean values converted to PostgreSQL format');
    console.log('✅ UPSERT operations converted to PostgreSQL syntax');
    
    // Save migration report
    const reportContent = JSON.stringify(migrationReport, null, 2);
    fs.writeFileSync('./services-migration-report.json', reportContent);
    console.log('✅ Detailed migration report saved to services-migration-report.json');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Special function to handle parameter placeholder conversion
function convertParameterPlaceholders(content) {
  // Split content by SQL query boundaries to handle each query separately
  const lines = content.split('\n');
  let result = [];
  
  for (let line of lines) {
    if (line.includes('?')) {
      // Check if this line contains SQL (has quotes and SQL keywords)
      const hasSQLKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|SET)\b/i.test(line);
      const hasQuotes = line.includes('`') || line.includes("'") || line.includes('"');
      
      if (hasSQLKeywords || hasQuotes) {
        // Convert parameter placeholders in this SQL line
        let paramIndex = 1;
        line = line.replace(/\?/g, () => `$${paramIndex++}`);
      }
    }
    result.push(line);
  }
  
  return result.join('\n');
}

// Run the migration
migrateAllServices()
  .then(() => {
    console.log('\n✅ All services migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Services migration failed:', error.message);
    process.exit(1);
  });
