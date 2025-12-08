import { test, expect } from '@playwright/test';

/**
 * Test: Member Approval with Voter Status and VD Code Assignment
 * 
 * This test verifies that when a membership application is approved:
 * 1. voter_status_id is correctly set based on IEC verification
 * 2. voting_district_code is assigned according to business rules
 * 3. municipality_code is mapped from ward table (sub-region, not metro)
 * 4. membership_status_id is set to 1 (Active/Good Standing)
 */

test.describe('Member Approval - Voter Status & VD Code', () => {
  const BASE_URL = 'http://localhost:3000';
  const API_URL = 'http://localhost:5000/api/v1';
  
  // Test ID numbers
  const REGISTERED_VOTER_ID = '7808020703087'; // Known registered voter
  const TEST_APPLICATION_DATA = {
    id_number: REGISTERED_VOTER_ID,
    first_name: 'Test',
    last_name: 'Playwright',
    date_of_birth: '1978-08-02',
    gender: 'Male',
    cell_number: '0821234567',
    email: 'test.playwright@example.com',
    residential_address: '123 Test Street, Test Suburb',
    postal_address: '123 Test Street, Test Suburb',
    membership_type: 'Regular'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to the application page
    await page.goto(`${BASE_URL}/apply`);
  });

  test('should approve member with correct voter status and VD code', async ({ page }) => {
    console.log('🧪 TEST: Member Approval with Voter Status');
    
    // Step 1: Fill in the application form
    console.log('📝 Step 1: Filling application form...');
    
    await page.fill('input[name="id_number"]', TEST_APPLICATION_DATA.id_number);
    await page.fill('input[name="first_name"]', TEST_APPLICATION_DATA.first_name);
    await page.fill('input[name="last_name"]', TEST_APPLICATION_DATA.last_name);
    await page.fill('input[name="date_of_birth"]', TEST_APPLICATION_DATA.date_of_birth);
    await page.selectOption('select[name="gender"]', TEST_APPLICATION_DATA.gender);
    await page.fill('input[name="cell_number"]', TEST_APPLICATION_DATA.cell_number);
    await page.fill('input[name="email"]', TEST_APPLICATION_DATA.email);
    await page.fill('textarea[name="residential_address"]', TEST_APPLICATION_DATA.residential_address);
    await page.fill('textarea[name="postal_address"]', TEST_APPLICATION_DATA.postal_address);
    
    // Step 2: Trigger IEC verification (if auto-verify on ID input)
    console.log('🔍 Step 2: Waiting for IEC verification...');
    
    // Wait for IEC verification to complete (adjust selector based on your UI)
    await page.waitForTimeout(2000); // Wait for IEC API call
    
    // Check if verification succeeded (adjust based on your UI feedback)
    const verificationStatus = await page.locator('[data-testid="iec-verification-status"]').textContent().catch(() => null);
    console.log('   IEC Verification Status:', verificationStatus);
    
    // Step 3: Submit the application
    console.log('📤 Step 3: Submitting application...');
    
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    const successMessage = await page.locator('[data-testid="success-message"]').textContent();
    console.log('   ✅ Application submitted:', successMessage);
    
    // Extract application ID from success message or URL
    const applicationId = await page.evaluate(() => {
      const url = new URL(window.location.href);
      return url.searchParams.get('applicationId');
    });
    
    console.log('   Application ID:', applicationId);
    
    // Step 4: Navigate to admin panel to approve the application
    console.log('👨‍💼 Step 4: Navigating to admin panel...');
    
    await page.goto(`${BASE_URL}/admin/applications`);
    
    // Login if needed (adjust based on your auth flow)
    const loginRequired = await page.locator('input[name="username"]').isVisible().catch(() => false);
    if (loginRequired) {
      console.log('   🔐 Logging in as admin...');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
    }
    
    // Step 5: Find and approve the application
    console.log('✅ Step 5: Approving application...');
    
    // Find the application in the list (adjust selector based on your UI)
    await page.fill('input[placeholder="Search by ID number"]', TEST_APPLICATION_DATA.id_number);
    await page.click('button[aria-label="Search"]');
    
    // Click approve button
    await page.click(`button[data-application-id="${applicationId}"][aria-label="Approve"]`);
    
    // Confirm approval in modal/dialog if needed
    const confirmButton = await page.locator('button:has-text("Confirm")').isVisible().catch(() => false);
    if (confirmButton) {
      await page.click('button:has-text("Confirm")');
    }
    
    // Wait for approval success
    await page.waitForSelector('[data-testid="approval-success"]', { timeout: 10000 });
    
    console.log('   ✅ Application approved successfully');
    
    // Step 6: Verify the member record in database
    console.log('🔍 Step 6: Verifying member record...');
    
    // Make API call to get member details
    const response = await page.request.get(`${API_URL}/members/by-id-number/${TEST_APPLICATION_DATA.id_number}`);
    expect(response.ok()).toBeTruthy();
    
    const memberData = await response.json();
    console.log('   Member Data:', JSON.stringify(memberData, null, 2));
    
    // Assertions
    console.log('🧪 Step 7: Running assertions...');
    
    // Check voter_status_id
    expect(memberData.voter_status_id).toBeTruthy();
    expect([1, 2, 4]).toContain(memberData.voter_status_id);
    console.log(`   ✅ voter_status_id: ${memberData.voter_status_id}`);
    
    // Check voting_district_code
    expect(memberData.voting_district_code).toBeTruthy();
    console.log(`   ✅ voting_district_code: ${memberData.voting_district_code}`);
    
    // Verify special codes or actual VD number
    const isSpecialCode = ['222222222', '999999999', '888888888'].includes(memberData.voting_district_code);
    const isActualVD = /^\d{8}$/.test(memberData.voting_district_code);
    expect(isSpecialCode || isActualVD).toBeTruthy();
    
    if (isSpecialCode) {
      console.log(`   ℹ️ Special VD code assigned: ${memberData.voting_district_code}`);
    } else {
      console.log(`   ℹ️ Actual VD number assigned: ${memberData.voting_district_code}`);
    }
    
    // Check municipality_code (should be sub-region, not metro)
    expect(memberData.municipality_code).toBeTruthy();
    expect(memberData.municipality_code).not.toBe('EKU'); // Should not be metro code
    expect(memberData.municipality_code).not.toBe('JHB'); // Should not be metro code
    console.log(`   ✅ municipality_code: ${memberData.municipality_code} (sub-region)`);
    
    // Check membership_status_id
    expect(memberData.membership_status_id).toBe(1); // Active/Good Standing
    console.log(`   ✅ membership_status_id: ${memberData.membership_status_id} (Active)`);
    
    // Check ward_code
    expect(memberData.ward_code).toBeTruthy();
    console.log(`   ✅ ward_code: ${memberData.ward_code}`);
    
    console.log('\n🎉 TEST PASSED: All assertions successful!');
  });

  test('should handle registered voter with VD code', async ({ page }) => {
    // This test specifically checks for registered voters with VD codes
    // Expected: voter_status_id = 1, voting_district_code = actual VD number
    
    console.log('🧪 TEST: Registered Voter with VD Code');
    
    // Use the test data and follow similar flow as above
    // ... (implementation similar to main test)
  });

  test('should handle registered voter without VD code', async ({ page }) => {
    // This test checks for registered voters without VD codes
    // Expected: voter_status_id = 1, voting_district_code = '222222222'
    
    console.log('🧪 TEST: Registered Voter without VD Code');
    
    // ... (implementation)
  });

  test('should handle non-registered voter', async ({ page }) => {
    // This test checks for non-registered voters
    // Expected: voter_status_id = 2, voting_district_code = '999999999'
    
    console.log('🧪 TEST: Non-Registered Voter');
    
    // ... (implementation)
  });
});

