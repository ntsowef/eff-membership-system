/**
 * Test script to verify birthday SMS is using the correct template
 * and that {{firstname}} variable is properly replaced
 */

import { BirthdaySMSService } from '../src/services/birthdaySMSService';
import { SMSManagementService } from '../src/services/smsManagementService';
import { renderTemplateString } from '../src/utils/templateRenderer';
import { initializeDatabase } from '../src/config/database-hybrid';

async function testBirthdayTemplate() {
  // Initialize database connection
  await initializeDatabase();
  console.log('='.repeat(60));
  console.log('Birthday SMS Template Test');
  console.log('='.repeat(60));

  try {
    // 1. Get the birthday config to see which template_id is being used
    console.log('\n1. Getting birthday config...');
    const config = await BirthdaySMSService.getBirthdayConfig();
    
    if (!config) {
      console.error('❌ No birthday config found!');
      process.exit(1);
    }
    
    console.log('   ✅ Birthday config loaded');
    console.log(`   Template ID: ${config.template_id}`);
    console.log(`   Is Enabled: ${config.is_enabled}`);

    // 2. Get the template that will be used
    console.log('\n2. Fetching template by ID...');
    const template = await SMSManagementService.getTemplateById(config.template_id);
    
    if (!template) {
      console.error(`❌ Template with ID ${config.template_id} not found!`);
      process.exit(1);
    }
    
    console.log('   ✅ Template loaded');
    console.log(`   Template Name: ${template.name}`);
    console.log(`   Template Category: ${template.category}`);
    console.log(`   Template Content:\n   "${template.content}"`);

    // 3. Check if it's a birthday template (not WELCOME)
    console.log('\n3. Verifying template is a birthday template...');
    const templateCategory = String(template.category).toLowerCase();
    const templateName = String(template.name).toLowerCase();

    if (templateName.includes('welcome') || templateCategory === 'membership') {
      console.error('❌ ERROR: Wrong template! This is the WELCOME template, not a birthday template!');
      console.error('   The birthday SMS system is incorrectly configured.');
      process.exit(1);
    }

    if (templateCategory !== 'birthday') {
      console.warn(`⚠️ Warning: Template category is "${template.category}", expected "birthday"`);
    } else {
      console.log('   ✅ Template is correctly categorized as "birthday"');
    }

    // 4. Test variable replacement
    console.log('\n4. Testing variable replacement...');
    const testVariables = {
      firstname: 'John',
      surname: 'Doe',
      full_name: 'John Doe',
      age: '35',
      membership_number: 'EFF-2024-001234'
    };
    
    const renderedMessage = renderTemplateString(template.content, testVariables, { keepUnmatched: false });
    
    console.log('   Test variables:', JSON.stringify(testVariables, null, 2));
    console.log(`   Rendered message:\n   "${renderedMessage}"`);
    
    // Check if {{firstname}} was replaced
    if (renderedMessage.includes('{{firstname}}') || renderedMessage.includes('{firstname}')) {
      console.error('❌ ERROR: {{firstname}} variable was NOT replaced!');
      process.exit(1);
    }
    
    if (renderedMessage.includes('John')) {
      console.log('   ✅ {{firstname}} was correctly replaced with "John"');
    } else {
      console.error('❌ ERROR: Expected "John" in the rendered message');
      process.exit(1);
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`- Birthday template ID: ${config.template_id}`);
    console.log(`- Template name: ${template.name}`);
    console.log(`- Template category: ${template.category}`);
    console.log('- Variable replacement: Working correctly');
    console.log('\nThe birthday SMS system is correctly configured!');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

testBirthdayTemplate();

