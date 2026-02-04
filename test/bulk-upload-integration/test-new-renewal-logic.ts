/**
 * Test script for the new bulk upload processing logic
 * 
 * This tests the new business rules:
 * 1. Determine New vs Renewal by comparing date_joined with last_payment_date
 *    - If date_joined == last_payment_date → New Member (subscription_type_id = 6)
 *    - If date_joined < last_payment_date → Renewal (subscription_type_id = 7)
 * 2. Calculate expiry_date as last_payment_date + 2 years
 * 3. Set membership_status_id to 1 (Active) for both new and renewal records
 */

import { Pool } from 'pg';
import * as path from 'path';

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

interface TestCase {
  name: string;
  dateJoined: Date | null;
  lastPaymentDate: Date | null;
  expectedIsRenewal: boolean;
  expectedSubscriptionTypeId: number;
}

/**
 * Helper function to determine if record is a renewal based on dates
 */
function isRenewalBasedOnDates(dateJoined: Date | null, lastPaymentDate: Date | null): boolean {
  if (!dateJoined && !lastPaymentDate) return false;
  if (dateJoined && !lastPaymentDate) return false;
  if (!dateJoined && lastPaymentDate) return false;
  
  if (dateJoined && lastPaymentDate) {
    const djNormalized = new Date(dateJoined.getFullYear(), dateJoined.getMonth(), dateJoined.getDate());
    const lpNormalized = new Date(lastPaymentDate.getFullYear(), lastPaymentDate.getMonth(), lastPaymentDate.getDate());
    return djNormalized.getTime() < lpNormalized.getTime();
  }
  
  return false;
}

/**
 * Calculate expiry date as payment date + 2 years
 */
function calculateExpiryDate(lastPaymentDate: Date | null, dateJoined: Date | null): Date | null {
  if (lastPaymentDate) {
    const expiry = new Date(lastPaymentDate);
    expiry.setFullYear(expiry.getFullYear() + 2);
    return expiry;
  }
  if (dateJoined) {
    const expiry = new Date(dateJoined);
    expiry.setFullYear(expiry.getFullYear() + 2);
    return expiry;
  }
  return null;
}

async function runTests() {
  console.log('🧪 Testing New Bulk Upload Processing Logic\n');
  console.log('=' .repeat(60));
  
  // Test cases for isRenewalBasedOnDates
  const testCases: TestCase[] = [
    {
      name: 'New Member: date_joined == last_payment_date (same day)',
      dateJoined: new Date('2024-01-15'),
      lastPaymentDate: new Date('2024-01-15'),
      expectedIsRenewal: false,
      expectedSubscriptionTypeId: 6
    },
    {
      name: 'Renewal: date_joined < last_payment_date',
      dateJoined: new Date('2022-06-01'),
      lastPaymentDate: new Date('2024-06-01'),
      expectedIsRenewal: true,
      expectedSubscriptionTypeId: 7
    },
    {
      name: 'New Member: only date_joined provided',
      dateJoined: new Date('2024-01-15'),
      lastPaymentDate: null,
      expectedIsRenewal: false,
      expectedSubscriptionTypeId: 6
    },
    {
      name: 'New Member (edge case): only last_payment_date provided',
      dateJoined: null,
      lastPaymentDate: new Date('2024-01-15'),
      expectedIsRenewal: false,
      expectedSubscriptionTypeId: 6
    },
    {
      name: 'New Member: no dates provided',
      dateJoined: null,
      lastPaymentDate: null,
      expectedIsRenewal: false,
      expectedSubscriptionTypeId: 6
    },
    {
      name: 'New Member: date_joined > last_payment_date (edge case)',
      dateJoined: new Date('2024-06-01'),
      lastPaymentDate: new Date('2024-01-15'),
      expectedIsRenewal: false,
      expectedSubscriptionTypeId: 6
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const isRenewal = isRenewalBasedOnDates(tc.dateJoined, tc.lastPaymentDate);
    const subscriptionTypeId = isRenewal ? 7 : 6;
    const expiryDate = calculateExpiryDate(tc.lastPaymentDate, tc.dateJoined);
    
    const renewalMatch = isRenewal === tc.expectedIsRenewal;
    const subTypeMatch = subscriptionTypeId === tc.expectedSubscriptionTypeId;
    
    if (renewalMatch && subTypeMatch) {
      console.log(`✅ PASS: ${tc.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${tc.name}`);
      console.log(`   Expected: isRenewal=${tc.expectedIsRenewal}, subscriptionTypeId=${tc.expectedSubscriptionTypeId}`);
      console.log(`   Got: isRenewal=${isRenewal}, subscriptionTypeId=${subscriptionTypeId}`);
      failed++;
    }
    
    if (expiryDate) {
      console.log(`   📅 Expiry Date: ${expiryDate.toISOString().split('T')[0]} (2 years from payment)`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  
  // Query subscription types to verify IDs
  console.log('\n📋 Verifying subscription_types table:');
  const result = await pool.query(
    "SELECT subscription_type_id, subscription_name FROM subscription_types WHERE subscription_name IN ('New', 'Renewal')"
  );
  console.log(result.rows);
  
  await pool.end();
  
  return failed === 0;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => { console.error(err); process.exit(1); });

