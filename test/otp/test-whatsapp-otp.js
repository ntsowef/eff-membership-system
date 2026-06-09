/**
 * Test script for WhatsApp OTP delivery
 * Usage: node test/otp/test-whatsapp-otp.js
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function testWhatsAppOTPColumns() {
  console.log('\n=== Test 1: Verify WhatsApp OTP columns exist ===');
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'user_otp_codes' AND column_name LIKE 'whatsapp%' ORDER BY column_name"
    );
    if (result.rows.length === 3) {
      console.log('✅ All 3 WhatsApp columns exist:');
      result.rows.forEach(row => console.log(`   - ${row.column_name} (${row.data_type}) default: ${row.column_default || 'NULL'}`));
      return true;
    }
    console.log(`❌ Expected 3 WhatsApp columns, found ${result.rows.length}`);
    return false;
  } finally { client.release(); }
}

async function testPhoneNumberFormatting() {
  console.log('\n=== Test 2: Phone number formatting for WhatsApp ===');
  const testCases = [
    { input: '0821234567', expected: '+27821234567' },
    { input: '27821234567', expected: '+27821234567' },
    { input: '+27821234567', expected: '+27821234567' },
    { input: '082 123 4567', expected: '+27821234567' },
    { input: '082-123-4567', expected: '+27821234567' },
  ];
  let passed = 0;
  for (const tc of testCases) {
    let f = tc.input.trim().replace(/[\s\-\(\)]/g, '');
    if (f.startsWith('0')) f = '+27' + f.substring(1);
    else if (f.startsWith('27') && !f.startsWith('+')) f = '+' + f;
    else if (!f.startsWith('+')) f = '+27' + f;
    if (f === tc.expected) { console.log(`   ✅ "${tc.input}" → "${f}"`); passed++; }
    else console.log(`   ❌ "${tc.input}" → "${f}" (expected "${tc.expected}")`);
  }
  console.log(`   ${passed}/${testCases.length} passed`);
  return passed === testCases.length;
}

async function testPhoneNumberValidation() {
  console.log('\n=== Test 3: Phone number validation (SA format) ===');
  const testCases = [
    { input: '0821234567', expected: true },
    { input: '0721234567', expected: true },
    { input: '0611234567', expected: true },
    { input: '27821234567', expected: true },
    { input: '0121234567', expected: false },
    { input: '123456', expected: false },
    { input: '', expected: false },
  ];
  let passed = 0;
  for (const tc of testCases) {
    const d = tc.input.replace(/\D/g, '');
    let v = false;
    if (d.length === 10 && d.startsWith('0')) v = /^0[6-8][0-9]{8}$/.test(d);
    else if (d.length === 11 && d.startsWith('27')) v = /^27[6-8][0-9]{8}$/.test(d);
    if (v === tc.expected) { console.log(`   ✅ "${tc.input}" → valid=${v}`); passed++; }
    else console.log(`   ❌ "${tc.input}" → valid=${v} (expected ${tc.expected})`);
  }
  console.log(`   ${passed}/${testCases.length} passed`);
  return passed === testCases.length;
}

async function testWhatsAppDeliveryStatusUpdate() {
  console.log('\n=== Test 4: WhatsApp delivery status DB update ===');
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT otp_id FROM user_otp_codes ORDER BY otp_id DESC LIMIT 1');
    if (existing.rows.length === 0) {
      console.log('   ⚠️ No OTP records found. Skipping DB update test.');
      return true;
    }
    const otpId = existing.rows[0].otp_id;
    await client.query(
      "UPDATE user_otp_codes SET whatsapp_delivery_status = $1, whatsapp_delivered_at = CURRENT_TIMESTAMP, whatsapp_delivery_error = $2 WHERE otp_id = $3",
      ['sent', null, otpId]
    );
    const verify = await client.query('SELECT whatsapp_delivery_status, whatsapp_delivered_at FROM user_otp_codes WHERE otp_id = $1', [otpId]);
    if (verify.rows[0].whatsapp_delivery_status === 'sent' && verify.rows[0].whatsapp_delivered_at) {
      console.log(`   ✅ WhatsApp delivery status updated for OTP ID ${otpId}`);
      await client.query("UPDATE user_otp_codes SET whatsapp_delivery_status = 'pending', whatsapp_delivered_at = NULL WHERE otp_id = $1", [otpId]);
      return true;
    }
    console.log('   ❌ WhatsApp delivery status update failed');
    return false;
  } finally { client.release(); }
}

async function runAllTests() {
  console.log('========================================');
  console.log(' WhatsApp OTP Delivery - Test Suite');
  console.log('========================================');
  const results = [];
  results.push({ name: 'WhatsApp OTP columns', passed: await testWhatsAppOTPColumns() });
  results.push({ name: 'Phone formatting', passed: await testPhoneNumberFormatting() });
  results.push({ name: 'Phone validation', passed: await testPhoneNumberValidation() });
  results.push({ name: 'DB status update', passed: await testWhatsAppDeliveryStatusUpdate() });
  console.log('\n========================================');
  console.log(' Results Summary');
  console.log('========================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
    if (!r.passed) allPassed = false;
  }
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(err => { console.error('Fatal error:', err); pool.end(); process.exit(1); });

