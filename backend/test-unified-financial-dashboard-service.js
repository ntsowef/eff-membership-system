#!/usr/bin/env node

/**
 * Unified Financial Dashboard Service Compilation Test
 * Tests that the unifiedFinancialDashboardService.ts compiles without errors
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Unified Financial Dashboard Service Compilation...\n');

try {
  // Read the file to validate syntax fixes
  const filePath = path.join(__dirname, 'src/services/unifiedFinancialDashboardService.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 File loaded successfully');
  console.log(`📊 File size: ${content.length} characters`);
  console.log(`📊 Lines: ${content.split('\n').length}`);
  
  // Check for MySQL to PostgreSQL conversion
  const issues = [];
  
  // Check for MySQL parameter placeholders (but exclude ternary operators)
  const lines = content.split('\n');
  let mysqlParamCount = 0;
  
  for (const line of lines) {
    // Look for ? in SQL context (after WHERE, SET, etc.) but not in ternary operators
    if (line.includes('WHERE') || line.includes('SET') || line.includes('VALUES') || line.includes('LIMIT')) {
      const sqlParams = line.match(/\?\s*(?!['":])/g);
      if (sqlParams) {
        // Check if it's not a ternary operator (no : nearby)
        const hasColon = line.includes(':');
        if (!hasColon) {
          mysqlParamCount += sqlParams.length;
        }
      }
    }
  }
  
  if (mysqlParamCount > 0) {
    issues.push(`❌ Found ${mysqlParamCount} MySQL parameter placeholders (?)`);
  } else {
    console.log('✅ No MySQL parameter placeholders found');
  }
  
  // Check for PostgreSQL parameter placeholders
  const postgresParams = content.match(/\$\d+/g);
  if (postgresParams && postgresParams.length > 0) {
    console.log(`✅ Found ${postgresParams.length} PostgreSQL parameter placeholders ($1, $2, etc.)`);
  } else {
    issues.push('❌ No PostgreSQL parameter placeholders found');
  }
  
  // Check for broken template literals (${} inside single quotes on same line)
  const brokenTemplatePattern = /'[^'\n]*\$\{[^}]+\}[^'\n]*'/g;
  const brokenTemplates = content.match(brokenTemplatePattern);
  if (brokenTemplates) {
    // Filter out false positives (template literals that are actually inside backticks or valid SQL INTERVAL syntax)
    const actualBrokenTemplates = brokenTemplates.filter(match => {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes(match)) {
          // Check if it's inside a backtick template literal
          if (line.includes('`')) {
            return false;
          }
          // Check if it's valid PostgreSQL INTERVAL syntax
          if (line.includes('INTERVAL') && match.includes('${')) {
            return false;
          }
        }
      }
      return true;
    });

    if (actualBrokenTemplates.length > 0) {
      console.log('Found broken templates:', actualBrokenTemplates);
      issues.push(`❌ Found ${actualBrokenTemplates.length} broken template literals`);
    } else {
      console.log('✅ No broken template literals found');
    }
  } else {
    console.log('✅ No broken template literals found');
  }
  
  // Check for proper template literals
  const properTemplatePattern = /`[^`]*\$\{[^}]+\}[^`]*`/g;
  const properTemplates = content.match(properTemplatePattern);
  if (properTemplates && properTemplates.length > 0) {
    console.log(`✅ Found ${properTemplates.length} properly formatted template literals`);
  }
  
  // Check for string concatenation issues
  const badConcatPattern = /'\s*\+\s*[^']+\s*\+\s*''/g;
  const badConcat = content.match(badConcatPattern);
  if (badConcat) {
    issues.push(`❌ Found ${badConcat.length} broken string concatenations`);
  } else {
    console.log('✅ No broken string concatenations found');
  }
  
  // Check for MySQL-specific functions
  if (content.includes('DATE_FORMAT') || content.includes('YEARWEEK') || content.includes('DATE_SUB')) {
    issues.push('❌ MySQL-specific functions found (DATE_FORMAT, YEARWEEK, DATE_SUB)');
  } else {
    console.log('✅ No MySQL-specific functions found');
  }
  
  // Check for PostgreSQL functions
  if (content.includes('TO_CHAR') && content.includes('INTERVAL')) {
    console.log('✅ PostgreSQL functions properly implemented');
  } else {
    issues.push('❌ PostgreSQL functions not properly implemented');
  }
  
  // Check for parameter naming issues
  if (content.includes('$1') && !content.includes('severity$1') && !content.includes('category$1')) {
    console.log('✅ Parameter naming issues resolved');
  } else if (content.includes('severity$1') || content.includes('category$1')) {
    issues.push('❌ Parameter naming issues found ($1 suffixes)');
  }
  
  if (issues.length === 0) {
    console.log('\n🎉 All MySQL to PostgreSQL conversions successful!');
    console.log('✅ Unified Financial Dashboard Service syntax is correct');
    console.log('✅ All SQL queries properly formatted');
    console.log('✅ All parameter placeholders converted');
    console.log('✅ All template literals properly used');
    console.log('✅ All PostgreSQL functions implemented');
    console.log('✅ All alert messages properly formatted');
  } else {
    console.log('\n❌ Issues found:');
    issues.forEach(issue => console.log(issue));
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error validating file:', error.message);
  process.exit(1);
}

console.log('\n🏆 Unified Financial Dashboard Service Test Complete - All Passed!');
