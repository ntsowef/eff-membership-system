const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Starting Playwright Test: IEC Auto-Population');
  console.log('=' .repeat(80));
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the membership application
    console.log('\n📍 Step 1: Navigating to membership application...');
    await page.goto('http://localhost:3000/membership/apply');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    // Fill in Step 1: Personal Information
    console.log('\n📍 Step 2: Filling Personal Information (Step 1)...');
    
    // ID Number
    await page.fill('input[name="id_number"]', '7808020703087');
    console.log('✅ ID Number entered: 7808020703087');
    
    // Wait for ID validation
    await page.waitForTimeout(2000);
    
    // First Name
    await page.fill('input[name="first_name"]', 'Test');
    console.log('✅ First Name entered');
    
    // Last Name
    await page.fill('input[name="last_name"]', 'User');
    console.log('✅ Last Name entered');
    
    // Email
    await page.fill('input[name="email"]', 'test@example.com');
    console.log('✅ Email entered');
    
    // Phone
    await page.fill('input[name="phone_number"]', '0123456789');
    console.log('✅ Phone entered');
    
    // Click Next to go to Step 2
    console.log('\n📍 Step 3: Moving to Contact Information (Step 2)...');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(3000); // Wait for IEC API call and auto-population
    console.log('✅ Moved to Step 2');

    // Check if IEC info alert is displayed
    const iecAlert = await page.locator('text=Your geographic information has been pre-filled').count();
    if (iecAlert > 0) {
      console.log('✅ IEC auto-population alert displayed!');
    } else {
      console.log('⚠️  IEC auto-population alert NOT displayed');
    }

    // Take screenshot of Step 2
    await page.screenshot({ path: 'test/screenshots/step2-before-check.png', fullPage: true });
    console.log('📸 Screenshot saved: test/screenshots/step2-before-check.png');

    // Check auto-populated fields
    console.log('\n📊 Checking Auto-Populated Fields:');
    console.log('-'.repeat(80));

    // Province
    const provinceValue = await page.inputValue('select[name="province_code"]');
    console.log(`Province: ${provinceValue || '❌ NOT POPULATED'}`);
    if (provinceValue) {
      console.log('  ✅ Province auto-populated!');
    }

    // Wait a bit for cascading selects to load
    await page.waitForTimeout(2000);

    // District
    const districtValue = await page.inputValue('select[name="district_code"]');
    console.log(`District: ${districtValue || '❌ NOT POPULATED'}`);
    if (districtValue) {
      console.log('  ✅ District auto-populated!');
    }

    // Municipality
    const municipalityValue = await page.inputValue('select[name="municipal_code"]');
    console.log(`Municipality: ${municipalityValue || '❌ NOT POPULATED'}`);
    if (municipalityValue) {
      console.log('  ✅ Municipality auto-populated!');
    }

    // Wait for wards to load
    await page.waitForTimeout(2000);

    // Ward
    const wardValue = await page.inputValue('select[name="ward_code"]');
    console.log(`Ward: ${wardValue || '❌ NOT POPULATED'}`);
    if (wardValue) {
      console.log('  ✅ Ward auto-populated!');
    }

    // Wait for voting districts to load
    await page.waitForTimeout(2000);

    // Voting District
    const votingDistrictValue = await page.inputValue('select[name="voting_district_code"]');
    console.log(`Voting District: ${votingDistrictValue || '❌ NOT POPULATED'}`);
    if (votingDistrictValue) {
      console.log('  ✅ Voting District auto-populated!');
    }

    // Take final screenshot
    await page.screenshot({ path: 'test/screenshots/step2-final.png', fullPage: true });
    console.log('\n📸 Final screenshot saved: test/screenshots/step2-final.png');

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTO-POPULATION SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Province:        ${provinceValue ? '✅ ' + provinceValue : '❌ NOT POPULATED'}`);
    console.log(`District:        ${districtValue ? '✅ ' + districtValue : '❌ NOT POPULATED'}`);
    console.log(`Municipality:    ${municipalityValue ? '✅ ' + municipalityValue : '❌ NOT POPULATED'}`);
    console.log(`Ward:            ${wardValue ? '✅ ' + wardValue : '❌ NOT POPULATED'}`);
    console.log(`Voting District: ${votingDistrictValue ? '✅ ' + votingDistrictValue : '❌ NOT POPULATED'}`);
    console.log('='.repeat(80));

    // Wait before closing
    console.log('\n⏳ Waiting 5 seconds before closing browser...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    await page.screenshot({ path: 'test/screenshots/error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Test completed!');
  }
})();

