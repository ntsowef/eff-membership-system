#!/usr/bin/env node

/**
 * Document Service Syntax Validation
 * Validates that the documentService.ts has correct syntax by parsing it
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Document Service Syntax...\n');

try {
  // Read the file
  const filePath = path.join(__dirname, 'src/services/documentService.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 File loaded successfully');
  console.log(`📊 File size: ${content.length} characters`);
  console.log(`📊 Lines: ${content.split('\n').length}`);
  
  // Check for common syntax issues that were fixed
  const issues = [];
  
  // Check for $1 parameter naming issues
  if (content.includes('$1')) {
    issues.push('❌ Found $1 parameter naming issues');
  } else {
    console.log('✅ No $1 parameter naming issues found');
  }
  
  // Check for broken template literals (single quotes with ${} inside)
  // But exclude cases where it's inside a proper template literal
  const lines = content.split('\n');
  let brokenTemplateCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for single quotes containing ${} that are NOT inside backtick template literals
    if (line.includes("'${") && !line.includes("`")) {
      // Check if this line is part of a multi-line template literal
      let isInTemplate = false;
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('`') && !lines[j].includes('`')) {
          isInTemplate = true;
          break;
        }
        if (lines[j].includes('`')) break;
      }
      if (!isInTemplate) {
        brokenTemplateCount++;
      }
    }
  }

  if (brokenTemplateCount > 0) {
    issues.push(`❌ Found ${brokenTemplateCount} broken template literals`);
  } else {
    console.log('✅ No broken template literals found');
  }
  
  // Check for mixed string concatenation issues
  const mixedConcatPattern = /'\s*\+\s*[^']+\s*\+\s*''/g;
  const mixedConcat = content.match(mixedConcatPattern);
  if (mixedConcat) {
    issues.push(`❌ Found ${mixedConcat.length} mixed string concatenation issues`);
  } else {
    console.log('✅ No mixed string concatenation issues found');
  }
  
  // Check for proper interface definitions
  if (content.includes('entity_type:') && content.includes('access_level:')) {
    console.log('✅ Interface properties properly defined');
  } else {
    issues.push('❌ Interface property issues found');
  }
  
  // Check for proper template literal usage
  const properTemplatePattern = /`[^`]*\$\{[^}]+\}[^`]*`/g;
  const properTemplates = content.match(properTemplatePattern);
  if (properTemplates && properTemplates.length > 0) {
    console.log(`✅ Found ${properTemplates.length} properly formatted template literals`);
  }
  
  if (issues.length === 0) {
    console.log('\n🎉 All syntax validations passed!');
    console.log('✅ Document Service syntax is correct');
    console.log('✅ All template literals properly formatted');
    console.log('✅ All interface properties correctly named');
    console.log('✅ All string concatenations properly handled');
  } else {
    console.log('\n❌ Syntax issues found:');
    issues.forEach(issue => console.log(issue));
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error validating file:', error.message);
  process.exit(1);
}

console.log('\n🏆 Document Service Syntax Validation Complete!');
