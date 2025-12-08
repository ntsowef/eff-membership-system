#!/usr/bin/env node

/**
 * Test Puppeteer/Chromium Installation
 * 
 * This script tests if Puppeteer can successfully launch Chromium
 * and generate a simple PDF.
 * 
 * Usage: node test/test-puppeteer-chromium.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPuppeteer() {
  console.log('====================================================================================================');
  console.log('🧪 Testing Puppeteer/Chromium Installation');
  console.log('====================================================================================================');
  console.log('');

  let browser;
  
  try {
    // Test 1: Launch browser
    console.log('📋 Test 1: Launching Chromium...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('✅ Chromium launched successfully!');
    console.log('');

    // Test 2: Create a page
    console.log('📋 Test 2: Creating new page...');
    const page = await browser.newPage();
    console.log('✅ Page created successfully!');
    console.log('');

    // Test 3: Generate HTML content
    console.log('📋 Test 3: Setting HTML content...');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #d32f2f; }
            .success { color: #4caf50; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>EFF Membership System</h1>
          <h2>Puppeteer/Chromium Test</h2>
          <p class="success">✅ If you can see this PDF, Puppeteer is working correctly!</p>
          <p>Generated: ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
    console.log('✅ HTML content set successfully!');
    console.log('');

    // Test 4: Generate PDF
    console.log('📋 Test 4: Generating PDF...');
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const pdfPath = path.join(outputDir, 'puppeteer-test.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    console.log('✅ PDF generated successfully!');
    console.log(`📄 PDF saved to: ${pdfPath}`);
    console.log('');

    // Test 5: Verify file
    console.log('📋 Test 5: Verifying PDF file...');
    const stats = fs.statSync(pdfPath);
    console.log(`✅ PDF file exists (${stats.size} bytes)`);
    console.log('');

    // Close browser
    await browser.close();
    console.log('✅ Browser closed successfully!');
    console.log('');

    // Success summary
    console.log('====================================================================================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('====================================================================================================');
    console.log('');
    console.log('Puppeteer and Chromium are working correctly.');
    console.log('Your PDF generation should work now.');
    console.log('');
    console.log(`Test PDF location: ${pdfPath}`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('====================================================================================================');
    console.error('❌ TEST FAILED!');
    console.error('====================================================================================================');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.message.includes('Failed to launch')) {
      console.error('💡 SOLUTION:');
      console.error('   Run the following command to install required dependencies:');
      console.error('');
      console.error('   sudo bash deployment/install-chromium-dependencies.sh');
      console.error('');
      console.error('   Or see: deployment/PUPPETEER_FIX_GUIDE.md');
    }
    
    console.error('');
    console.error('Full error stack:');
    console.error(error.stack);
    console.error('');

    if (browser) {
      await browser.close();
    }

    process.exit(1);
  }
}

// Run the test
testPuppeteer();

