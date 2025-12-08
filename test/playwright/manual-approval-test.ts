/**
 * Manual Playwright Test for Member Approval
 * 
 * This script opens a browser and allows you to manually test the approval process
 * while automatically verifying the database results.
 */

import { chromium } from '@playwright/test';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

async function verifyMemberInDatabase(idNumber: string) {
  console.log('\n' + '='.repeat(100));
  console.log('🔍 VERIFYING MEMBER IN DATABASE');
  console.log('='.repeat(100));
  
  try {
    const response = await axios.get(`${API_URL}/members/by-id-number/${idNumber}`);
    const member = response.data;
    
    console.log('\n📋 Member Details:');
    console.log(`   Member ID: ${member.member_id}`);
    console.log(`   Name: ${member.firstname} ${member.surname}`);
    console.log(`   ID Number: ${member.id_number}`);
    console.log(`   Ward Code: ${member.ward_code}`);
    console.log(`   Municipality Code: ${member.municipality_code}`);
    
    console.log('\n✅ Voter Status:');
    console.log(`   Voter Status ID: ${member.voter_status_id}`);
    console.log(`   Voter Status: ${member.voter_status_name || 'N/A'}`);
    
    console.log('\n📍 Voting District:');
    console.log(`   Voting District Code: ${member.voting_district_code}`);
    
    // Check if it's a special code
    const specialCodes: { [key: string]: string } = {
      '222222222': 'Registered - No VD Data',
      '999999999': 'Not Registered to Vote',
      '888888888': 'Verification Failed/Pending'
    };
    
    if (specialCodes[member.voting_district_code]) {
      console.log(`   ℹ️ Special Code: ${specialCodes[member.voting_district_code]}`);
    } else {
      console.log(`   ℹ️ Actual VD Number from IEC`);
    }
    
    console.log('\n🎯 Membership Status:');
    console.log(`   Membership Status ID: ${member.membership_status_id}`);
    console.log(`   Membership Status: ${member.membership_status_name || 'N/A'}`);
    
    // Validation checks
    console.log('\n' + '='.repeat(100));
    console.log('✅ VALIDATION CHECKS');
    console.log('='.repeat(100));
    
    const checks = [
      {
        name: 'Voter Status ID is set',
        pass: member.voter_status_id !== null,
        value: member.voter_status_id
      },
      {
        name: 'Voter Status ID is valid (1, 2, or 4)',
        pass: [1, 2, 4].includes(member.voter_status_id),
        value: member.voter_status_id
      },
      {
        name: 'Voting District Code is set',
        pass: member.voting_district_code !== null,
        value: member.voting_district_code
      },
      {
        name: 'Municipality Code is sub-region (not metro)',
        pass: !['EKU', 'JHB', 'TSH', 'CPT'].includes(member.municipality_code),
        value: member.municipality_code
      },
      {
        name: 'Membership Status is Active (ID: 1)',
        pass: member.membership_status_id === 1,
        value: member.membership_status_id
      }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      const status = check.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${check.name} (${check.value})`);
      if (!check.pass) allPassed = false;
    });
    
    console.log('\n' + '='.repeat(100));
    if (allPassed) {
      console.log('🎉 ALL CHECKS PASSED!');
    } else {
      console.log('⚠️ SOME CHECKS FAILED!');
    }
    console.log('='.repeat(100) + '\n');
    
    return member;
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('\n❌ Member not found in database');
      console.log('   This could mean:');
      console.log('   1. Application not yet approved');
      console.log('   2. ID number incorrect');
      console.log('   3. Member not created');
    } else {
      console.log('\n❌ Error fetching member:', error.message);
    }
    return null;
  }
}

async function main() {
  console.log('='.repeat(100));
  console.log('🎭 PLAYWRIGHT MANUAL TEST - MEMBER APPROVAL');
  console.log('='.repeat(100));
  console.log('\nThis script will:');
  console.log('1. Open a browser for you to manually test the approval process');
  console.log('2. Keep the browser open for you to interact with');
  console.log('3. Verify the database results when you provide an ID number');
  console.log('\n' + '='.repeat(100) + '\n');
  
  // Launch browser in headed mode
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('🌐 Opening frontend...');
  await page.goto(FRONTEND_URL);
  
  console.log('\n' + '='.repeat(100));
  console.log('📋 MANUAL TEST INSTRUCTIONS');
  console.log('='.repeat(100));
  console.log('\n1. Use the browser to navigate to the application page');
  console.log('2. Submit a new membership application');
  console.log('3. Navigate to the admin panel');
  console.log('4. Approve the application');
  console.log('5. Note the ID number of the approved member');
  console.log('6. Return to this terminal and enter the ID number to verify');
  console.log('\n' + '='.repeat(100) + '\n');
  
  // Keep browser open and wait for user input
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askForIdNumber = () => {
    readline.question('\n📝 Enter ID number to verify (or "exit" to close): ', async (idNumber: string) => {
      if (idNumber.toLowerCase() === 'exit') {
        console.log('\n👋 Closing browser...');
        await browser.close();
        readline.close();
        process.exit(0);
      }
      
      if (idNumber.trim()) {
        await verifyMemberInDatabase(idNumber.trim());
      }
      
      askForIdNumber();
    });
  };
  
  askForIdNumber();
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

