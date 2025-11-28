/**
 * Email Templates Test Script (JavaScript Version)
 * 
 * Usage:
 *   node test/email/email-templates-test.js --email your-email@example.com
 *   node test/email/email-templates-test.js --email your-email@example.com --template welcome-email
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '../../.env.postgres') });

// Then require the email service (so it picks up the env vars)
const { EmailService } = require('../../backend/dist/services/emailService');
const emailService = new EmailService();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test data
const testData = {
  email: '',
  memberName: 'John Doe',
  applicantName: 'Jane Smith',
  membershipNumber: 'EFF-2024-001234',
  applicationNumber: 'APP-2024-005678',
  expiryDate: '2024-12-31',
  resetToken: 'test-reset-token-12345',
};

// Template tests
const templateTests = [
  {
    name: 'welcome-email',
    description: 'Welcome Email for New Members',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Welcome Email${colors.reset}`);
      return await emailService.sendWelcomeEmail(
        testData.email,
        testData.memberName,
        testData.membershipNumber
      );
    },
  },
  {
    name: 'application-submitted',
    description: 'Application Submitted Notification',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Application Submitted${colors.reset}`);
      return await emailService.sendApplicationStatusNotification(
        testData.email,
        testData.applicantName,
        testData.applicationNumber,
        'Submitted'
      );
    },
  },
  {
    name: 'application-under-review',
    description: 'Application Under Review Notification',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Application Under Review${colors.reset}`);
      return await emailService.sendApplicationStatusNotification(
        testData.email,
        testData.applicantName,
        testData.applicationNumber,
        'Under Review'
      );
    },
  },
  {
    name: 'application-approved',
    description: 'Application Approved Notification',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Application Approved${colors.reset}`);
      return await emailService.sendApplicationStatusNotification(
        testData.email,
        testData.applicantName,
        testData.applicationNumber,
        'Approved'
      );
    },
  },
  {
    name: 'application-rejected',
    description: 'Application Rejected Notification',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Application Rejected${colors.reset}`);
      return await emailService.sendApplicationStatusNotification(
        testData.email,
        testData.applicantName,
        testData.applicationNumber,
        'Rejected',
        'Incomplete documentation provided'
      );
    },
  },
  {
    name: 'expiry-reminder',
    description: 'Membership Expiry Reminder (30 days)',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Expiry Reminder (30 days)${colors.reset}`);
      return await emailService.sendMembershipExpiryReminder(
        testData.email,
        testData.memberName,
        testData.membershipNumber,
        testData.expiryDate,
        30
      );
    },
  },
  {
    name: 'expiry-warning',
    description: 'Membership Expiry Warning (15 days)',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Expiry Warning (15 days)${colors.reset}`);
      return await emailService.sendMembershipExpiryReminder(
        testData.email,
        testData.memberName,
        testData.membershipNumber,
        testData.expiryDate,
        15
      );
    },
  },
  {
    name: 'expiry-urgent',
    description: 'Membership Expiry Urgent (5 days)',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Expiry Urgent (5 days)${colors.reset}`);
      return await emailService.sendMembershipExpiryReminder(
        testData.email,
        testData.memberName,
        testData.membershipNumber,
        testData.expiryDate,
        5
      );
    },
  },
  {
    name: 'password-reset',
    description: 'Password Reset Email',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: Password Reset${colors.reset}`);
      return await emailService.sendPasswordResetEmail(
        testData.email,
        testData.memberName,
        testData.resetToken
      );
    },
  },
  {
    name: 'system-announcement-text',
    description: 'System Announcement (Text)',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: System Announcement (Text)${colors.reset}`);
      return await emailService.sendSystemAnnouncement(
        [testData.email],
        'System Maintenance Scheduled',
        'Dear Members,\n\nWe will be performing scheduled maintenance on our systems on Saturday, December 15th from 2:00 AM to 6:00 AM.\n\nDuring this time, the membership portal may be temporarily unavailable.\n\nWe apologize for any inconvenience.',
        false
      );
    },
  },
  {
    name: 'system-announcement-html',
    description: 'System Announcement (HTML)',
    testFunction: async () => {
      console.log(`${colors.cyan}Testing: System Announcement (HTML)${colors.reset}`);
      return await emailService.sendSystemAnnouncement(
        [testData.email],
        'Important: New Features Available',
        `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #d32f2f;">New Features Available!</h2>
            <p>Dear Members,</p>
            <p>We are excited to announce new features in the membership portal:</p>
            <ul>
              <li>Digital Membership Cards</li>
              <li>Online Renewal System</li>
              <li>Enhanced Member Directory</li>
            </ul>
            <p>Log in to explore these new features!</p>
            <p>Best regards,<br>The EFF Team</p>
          </div>
        `,
        true
      );
    },
  },
];

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let email = '';
  let template = undefined;
  let all = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--template' && args[i + 1]) {
      template = args[i + 1];
      all = false;
      i++;
    } else if (args[i] === '--all') {
      all = true;
    }
  }

  return { email, template, all };
}

// Display help
function displayHelp() {
  console.log(`
${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗
║           EFF Membership System - Email Template Test         ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Usage:${colors.reset}
  node test/email/email-templates-test.js --email your-email@example.com

${colors.bright}Options:${colors.reset}
  --email <email>     Email address to send test emails to (required)
  --template <name>   Test specific template only (optional)
  --all              Send all templates in sequence (default)

${colors.bright}Available Templates:${colors.reset}
${templateTests.map((t, i) => `  ${i + 1}. ${colors.cyan}${t.name}${colors.reset} - ${t.description}`).join('\n')}
  `);
}

// Display test summary
function displaySummary(results) {
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║                      Test Summary                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.bright}Total Tests:${colors.reset} ${results.length}`);
  console.log(`${colors.green}${colors.bright}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}${colors.bright}Failed:${colors.reset} ${failed}\n`);

  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
        if (r.error) {
          console.log(`    ${colors.yellow}Error: ${r.error}${colors.reset}`);
        }
      });
  }
}

// Main test runner
async function runTests() {
  const { email, template, all } = parseArgs();

  // Display header
  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║           EFF Membership System - Email Template Test         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Validate email
  if (!email) {
    console.log(`${colors.red}${colors.bright}Error: Email address is required${colors.reset}\n`);
    displayHelp();
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log(`${colors.red}${colors.bright}Error: Invalid email format${colors.reset}\n`);
    process.exit(1);
  }

  testData.email = email;

  console.log(`${colors.bright}Test Configuration:${colors.reset}`);
  console.log(`  Target Email: ${colors.cyan}${email}${colors.reset}`);
  console.log(`  SMTP Host: ${colors.cyan}${process.env.SMTP_HOST || 'Not configured'}${colors.reset}`);
  console.log(`  SMTP Port: ${colors.cyan}${process.env.SMTP_PORT || 'Not configured'}${colors.reset}`);
  console.log(`  SMTP User: ${colors.cyan}${process.env.SMTP_USER || 'Not configured'}${colors.reset}\n`);

  // Test email configuration
  console.log(`${colors.yellow}Testing email configuration...${colors.reset}`);
  const configTest = await emailService.testEmailConfiguration();
  if (!configTest.success) {
    console.log(`${colors.yellow}⚠️  Warning: ${configTest.message}${colors.reset}`);
    console.log(`${colors.yellow}Emails will be logged to console only.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓ Email configuration is valid${colors.reset}\n`);
  }

  // Select tests to run
  let testsToRun;
  if (template) {
    const selectedTest = templateTests.find(t => t.name === template);
    if (!selectedTest) {
      console.log(`${colors.red}Error: Template '${template}' not found${colors.reset}\n`);
      console.log(`${colors.bright}Available templates:${colors.reset}`);
      templateTests.forEach(t => console.log(`  - ${t.name}`));
      process.exit(1);
    }
    testsToRun = [selectedTest];
  } else {
    testsToRun = templateTests;
  }

  console.log(`${colors.bright}Running ${testsToRun.length} test(s)...${colors.reset}\n`);

  // Run tests
  const results = [];

  for (const test of testsToRun) {
    try {
      console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log(`${colors.bright}Test: ${test.description}${colors.reset}`);
      console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

      const success = await test.testFunction();

      if (success) {
        console.log(`${colors.green}${colors.bright}✓ Success${colors.reset}\n`);
        results.push({ name: test.name, success: true });
      } else {
        console.log(`${colors.red}${colors.bright}✗ Failed${colors.reset}\n`);
        results.push({ name: test.name, success: false });
      }

      // Wait 2 seconds between tests to avoid rate limiting
      if (testsToRun.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(`${colors.red}${colors.bright}✗ Error: ${error}${colors.reset}\n`);
      results.push({ name: test.name, success: false, error: String(error) });
    }
  }

  // Display summary
  displaySummary(results);

  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}${colors.bright}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});

