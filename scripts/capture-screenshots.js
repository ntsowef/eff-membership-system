/**
 * Automated Screenshot Capture Script
 * 
 * This script uses Playwright to automatically navigate through the Ward Audit System
 * and capture screenshots for documentation.
 * 
 * Prerequisites:
 * 1. Install Playwright: npm install -D @playwright/test
 * 2. Install browsers: npx playwright install
 * 3. Ensure backend and frontend are running
 * 4. Have valid admin credentials
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:5000',
  outputDir: path.join(__dirname, '../docs/images/ward-audit'),
  credentials: {
    email: 'national.admin@eff.org.za',
    password: 'Admin@123'
  },
  viewport: {
    width: 1920,
    height: 1080
  },
  testWard: {
    province: 'GP',
    region: 'TSH',
    subRegion: 'TSH',
    wardCode: '79800044'
  }
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...\n');
  
  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const context = await browser.newContext({
    viewport: CONFIG.viewport
  });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('📸 Capturing: Login page...');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'login-page.png'),
      fullPage: false
    });

    // Fill login form
    await page.fill('input[name="email"]', CONFIG.credentials.email);
    await page.fill('input[name="password"]', CONFIG.credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // 2. Dashboard Overview
    console.log('📸 Capturing: Dashboard overview...');
    await page.goto(`${CONFIG.baseUrl}/ward-audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for data to load
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'dashboard-overview.png'),
      fullPage: false
    });

    // 3. Navigate to specific ward
    console.log('📸 Capturing: Ward selection...');
    // Select province
    await page.click('text=Select Province');
    await page.click(`text=${CONFIG.testWard.province}`);
    await page.waitForTimeout(1000);
    
    // Select region
    await page.click('text=Select Region');
    await page.click(`text=${CONFIG.testWard.region}`);
    await page.waitForTimeout(1000);
    
    // Select ward
    await page.click(`text=${CONFIG.testWard.wardCode}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 4. Ward Compliance Criteria
    console.log('📸 Capturing: Compliance criteria...');
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'compliance-criteria.png'),
      fullPage: true
    });

    // 5. Open Meeting Form
    console.log('📸 Capturing: Meeting form...');
    await page.click('text=Record Meeting');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'meeting-form-basic.png'),
      fullPage: false
    });

    // 6. Fill meeting form to show quorum verification
    console.log('📸 Capturing: Quorum verification...');
    await page.selectOption('select[name="meeting_type"]', 'BPA');
    await page.fill('input[name="quorum_required"]', '50');
    await page.fill('input[name="quorum_achieved"]', '65');
    await page.fill('input[name="total_attendees"]', '65');
    
    // Scroll to verification section
    await page.evaluate(() => {
      document.querySelector('input[type="checkbox"][name="quorum_verified_manually"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(1000);
    
    // Capture quorum verification section
    const quorumSection = await page.locator('text=Criterion 2: Meeting Quorum Verification').locator('..');
    await quorumSection.screenshot({ 
      path: path.join(CONFIG.outputDir, 'quorum-verification.png')
    });

    // 7. Check quorum verification and add notes
    await page.check('input[type="checkbox"][name="quorum_verified_manually"]');
    await page.fill('textarea[name="quorum_verification_notes"]', 
      'Verified through signed attendance register. 65 members present out of 120 total ward members.');
    await page.waitForTimeout(500);

    // 8. Capture meeting attendance verification
    console.log('📸 Capturing: Meeting attendance verification...');
    await page.evaluate(() => {
      document.querySelector('input[type="checkbox"][name="meeting_took_place_verified"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(1000);
    
    const attendanceSection = await page.locator('text=Criterion 3: Meeting Attendance').locator('..');
    await attendanceSection.screenshot({ 
      path: path.join(CONFIG.outputDir, 'meeting-attendance.png')
    });

    // 9. Check meeting attendance and add notes
    await page.check('input[type="checkbox"][name="meeting_took_place_verified"]');
    await page.fill('textarea[name="meeting_verification_notes"]', 
      'Meeting held on 2025-10-06 at Ward Community Hall. Minutes and photos on file.');
    await page.waitForTimeout(500);

    // 10. Capture completed form
    console.log('📸 Capturing: Completed meeting form...');
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'meeting-form-complete.png'),
      fullPage: true
    });

    // 11. Presiding Officer Dropdown
    console.log('📸 Capturing: Presiding officer dropdown...');
    await page.click('input[name="presiding_officer"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'presiding-officer-dropdown.png'),
      fullPage: false
    });

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 12. Navigate to Delegate Management
    console.log('📸 Capturing: Delegate management...');
    await page.click('text=Manage Delegates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'delegate-list.png'),
      fullPage: false
    });

    // 13. Open Delegate Assignment Form
    console.log('📸 Capturing: Delegate assignment form...');
    await page.click('text=Assign New Delegate');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'delegate-assignment.png'),
      fullPage: false
    });

    // 14. Fill delegate form
    await page.selectOption('select[name="assembly_type"]', 'SRPA');
    await page.fill('input[name="term_start_date"]', '2025-10-06');
    await page.fill('input[name="term_end_date"]', '2026-10-06');
    await page.fill('textarea[name="notes"]', 'Elected at BPA meeting on 2025-10-05');
    await page.waitForTimeout(500);

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 15. Capture all criteria met
    console.log('📸 Capturing: All criteria met...');
    await page.goto(`${CONFIG.baseUrl}/ward-audit/ward/${CONFIG.testWard.wardCode}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'all-criteria-met.png'),
      fullPage: true
    });

    // 16. Capture validation error (simulate)
    console.log('📸 Capturing: Validation error...');
    await page.click('text=Record Meeting');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Save Meeting")'); // Try to submit empty form
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'validation-error.png'),
      fullPage: false
    });

    // 17. Mobile view screenshots
    console.log('📸 Capturing: Mobile views...');
    await context.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto(`${CONFIG.baseUrl}/ward-audit`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'mobile-dashboard.png'),
      fullPage: false
    });

    await page.click('text=Record Meeting');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(CONFIG.outputDir, 'mobile-meeting-form.png'),
      fullPage: true
    });

    console.log('\n✅ Screenshot capture complete!');
    console.log(`📁 Screenshots saved to: ${CONFIG.outputDir}`);
    console.log('\n📋 Captured screenshots:');
    const files = fs.readdirSync(CONFIG.outputDir);
    files.forEach(file => console.log(`   - ${file}`));

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots().catch(console.error);

