/**
 * =============================================================================
 * Peach Payments V2 Integration Test Script
 * =============================================================================
 *
 * Tests the Peach Payments Checkout V2 API integration using the new
 * OAuth-based authentication (client_id / client_secret / merchant_id).
 *
 * Usage:
 *   npx ts-node scripts/test-peach-payments.ts
 *
 * What it tests:
 *   1. Environment variable loading
 *   2. OAuth token generation (POST /api/oauth/token)
 *   3. Checkout session creation (POST /v2/checkout)
 *   4. Payment status query (GET /v2/checkout/{checkoutId}/status)
 * =============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import axios, { AxiosError } from 'axios';

// CLI flag: --prod loads backend/.env.peach-production instead of backend/.env
const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.peach-production' : '.env';
const envPath = path.join(__dirname, '..', envFile);

if (!fs.existsSync(envPath)) {
  console.error(`\n❌ Env file not found: ${envPath}`);
  if (isProd) {
    console.error('   Create backend/.env.peach-production with your production Peach credentials.');
  }
  process.exit(1);
}

dotenv.config({ path: envPath });
console.log(`\n📄 Loaded env from: ${envFile}${isProd ? '  ⚠️  PRODUCTION MODE' : ''}`);

// ─── Configuration ───────────────────────────────────────────────────────────

interface PeachConfig {
  entityId: string;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  merchantId: string;
  baseUrl: string;
  authUrl: string;
  testMode: boolean;
  shopperResultUrl: string;
  notificationUrl: string;
  merchantOrigin: string;
}

// Derive shopperResultUrl and merchant origin from env, with sane defaults
const defaultShopperResultUrl = isProd
  ? 'https://effmemberportal.org/payment-result'
  : 'http://localhost:3000/payment-result';
const shopperResultUrl = process.env.PEACH_SHOPPER_RESULT_URL || defaultShopperResultUrl;
let merchantOrigin = '';
try {
  merchantOrigin = new URL(shopperResultUrl).origin;
} catch {
  merchantOrigin = isProd ? 'https://effmemberportal.org' : 'http://localhost:3000';
}

const peachConfig: PeachConfig = {
  entityId: process.env.PEACH_ENTITY_ID || '',
  accessToken: process.env.PEACH_ACCESS_TOKEN || '',
  clientId: process.env.PEACH_CLIENT_ID || '',
  clientSecret: process.env.PEACH_CLIENT_SECRET || '',
  merchantId: process.env.PEACH_MERCHANT_ID || '',
  baseUrl: process.env.PEACH_BASE_URL || (isProd ? 'https://secure.peachpayments.com' : 'https://testsecure.peachpayments.com'),
  authUrl: process.env.PEACH_AUTH_URL || (isProd ? 'https://dashboard.peachpayments.com' : 'https://sandbox-dashboard.peachpayments.com'),
  testMode: process.env.PEACH_TEST_MODE === 'true',
  shopperResultUrl,
  notificationUrl: process.env.PEACH_NOTIFICATION_URL || '',
  merchantOrigin,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printHeader(title: string) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function printResult(label: string, value: string, ok: boolean) {
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} ${label}: ${value}`);
}

function maskSecret(value: string): string {
  if (!value) return '(empty)';
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function formatAxiosError(error: AxiosError): string {
  if (error.response) {
    return JSON.stringify(error.response.data, null, 2);
  }
  return error.message;
}

// ─── Test 1: Environment Variables ───────────────────────────────────────────

function testEnvironmentVars(): boolean {
  printHeader('TEST 1: Environment Variables');

  const checks = [
    { label: 'PEACH_ENTITY_ID', value: peachConfig.entityId },
    { label: 'PEACH_ACCESS_TOKEN', value: peachConfig.accessToken },
    { label: 'PEACH_CLIENT_ID', value: peachConfig.clientId },
    { label: 'PEACH_CLIENT_SECRET', value: peachConfig.clientSecret },
    { label: 'PEACH_MERCHANT_ID', value: peachConfig.merchantId },
    { label: 'PEACH_BASE_URL', value: peachConfig.baseUrl },
    { label: 'PEACH_AUTH_URL', value: peachConfig.authUrl },
    { label: 'PEACH_TEST_MODE', value: String(peachConfig.testMode) },
  ];

  let allOk = true;
  for (const check of checks) {
    const ok = !!check.value && check.value !== 'undefined';
    const display = check.label.includes('SECRET') || check.label.includes('TOKEN')
      ? maskSecret(check.value)
      : check.value;
    printResult(check.label, display, ok);
    if (!ok) allOk = false;
  }

  if (!allOk) {
    console.log('\n  ⚠️  Some environment variables are missing. Check backend/.env');
  }

  return allOk;
}

// ─── Test 2: OAuth Token Generation ──────────────────────────────────────────

async function testOAuthToken(): Promise<string | null> {
  printHeader('TEST 2: OAuth Token Generation');

  const tokenUrl = `${peachConfig.authUrl}/api/oauth/token`;
  console.log(`  📡 POST ${tokenUrl}`);
  console.log(`  📦 Payload: { clientId: "${peachConfig.clientId}", clientSecret: "****", merchantId: "${peachConfig.merchantId}" }`);

  try {
    const response = await axios.post(tokenUrl, {
      clientId: peachConfig.clientId,
      clientSecret: peachConfig.clientSecret,
      merchantId: peachConfig.merchantId,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = response.data;
    console.log(`\n  📥 Response Status: ${response.status}`);

    if (data.access_token) {
      printResult('Token received', maskSecret(data.access_token), true);
      printResult('Token type', data.token_type || 'N/A', true);
      printResult('Expires in', `${data.expires_in || 'N/A'} seconds`, true);
      return data.access_token;
    } else {
      printResult('Token received', 'No access_token in response', false);
      console.log('  📋 Full response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error: any) {
    console.log(`\n  📥 Response Status: ${error.response?.status || 'N/A'}`);
    printResult('OAuth token', formatAxiosError(error), false);

    // Fallback: try the static access token from .env
    if (peachConfig.accessToken) {
      console.log('\n  🔄 Falling back to static PEACH_ACCESS_TOKEN from .env');
      printResult('Static token', maskSecret(peachConfig.accessToken), true);
      return peachConfig.accessToken;
    }
    return null;
  }
}

// ─── Test 3: Create Checkout Session (V2) ────────────────────────────────────

async function testCheckoutCreation(token: string): Promise<string | null> {
  printHeader('TEST 3: Create Checkout Session (V2)');

  const checkoutUrl = `${peachConfig.baseUrl}/v2/checkout`;
  const nonce = `test-${Date.now()}`;
  const merchantTxnId = `TEST-${Date.now()}`;

  const payload: Record<string, string> = {
    'authentication.entityId': peachConfig.entityId,
    merchantTransactionId: merchantTxnId,
    amount: '10.00',
    currency: 'ZAR',
    paymentType: 'DB',
    nonce: nonce,
    shopperResultUrl: peachConfig.shopperResultUrl,
  };
  if (peachConfig.notificationUrl) payload.notificationUrl = peachConfig.notificationUrl;

  console.log(`  \ud83d\udce1 POST ${checkoutUrl}`);
  console.log(`  \ud83c\udfe0 Merchant Origin (sent as Origin/Referer): ${peachConfig.merchantOrigin}`);
  console.log(`  \ud83d\udce6 Payload:`);
  console.log(`     entityId:              ${peachConfig.entityId}`);
  console.log(`     merchantTransactionId: ${merchantTxnId}`);
  console.log(`     amount:                R10.00 ZAR`);
  console.log(`     paymentType:           DB (Debit)`);
  console.log(`     nonce:                 ${nonce}`);
  console.log(`     shopperResultUrl:      ${peachConfig.shopperResultUrl}`);
  if (peachConfig.notificationUrl) {
    console.log(`     notificationUrl:       ${peachConfig.notificationUrl}`);
  }

  try {
    const response = await axios.post(checkoutUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': peachConfig.merchantOrigin,
        'Referer': peachConfig.merchantOrigin + '/',
      },
      timeout: 15000,
    });

    const data = response.data;
    console.log(`\n  📥 Response Status: ${response.status}`);

    const checkoutId = data.id || data.checkoutId;
    if (checkoutId) {
      printResult('Checkout ID', checkoutId, true);
      printResult('Result code', data.result?.code || 'N/A', true);
      printResult('Result description', data.result?.description || 'N/A', true);

      if (data.redirectUrl) {
        console.log(`\n  🌐 Redirect URL: ${data.redirectUrl}`);
      }

      return checkoutId;
    } else {
      printResult('Checkout creation', 'No checkout ID returned', false);
      console.log('  📋 Full response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error: any) {
    const status = error.response?.status || 'N/A';
    const body = error.response?.data;
    console.log(`\n  \ud83d\udce5 Response Status: ${status}`);
    if (body) {
      console.log('  \ud83d\udccb V2 error body:');
      console.log(JSON.stringify(body, null, 2));
      if (body.result?.parameterErrors) {
        console.log('  \ud83d\udd0d Parameter errors:');
        for (const pe of body.result.parameterErrors) {
          console.log(`     - ${pe.name}: ${pe.message} (value: ${pe.value})`);
        }
      }
    } else {
      printResult('V2 checkout error', error.message, false);
    }
    return null;
  }
}

// ─── Test 3b: Fallback — Legacy Copy-and-Pay Checkout ────────────────────────

async function testLegacyCheckout(token: string): Promise<string | null> {
  printHeader('TEST 3b: Legacy Copy-and-Pay Checkout (V1 Fallback)');

  const checkoutUrl = `${peachConfig.baseUrl}/v1/checkouts`;
  const nonce = `test-legacy-${Date.now()}`;
  const merchantTxnId = `TEST-LEGACY-${Date.now()}`;

  const v1Params: Record<string, string> = {
    'authentication.entityId': peachConfig.entityId,
    amount: '10.00',
    currency: 'ZAR',
    paymentType: 'DB',
    nonce: nonce,
    shopperResultUrl: peachConfig.shopperResultUrl,
    merchantTransactionId: merchantTxnId,
  };
  // testMode is sandbox-only; do NOT send on production
  if (!isProd) v1Params.testMode = 'EXTERNAL';
  const checkoutData = new URLSearchParams(v1Params);

  console.log(`  \ud83d\udce1 POST ${checkoutUrl}`);
  console.log(`  \ud83c\udfe0 Merchant Origin: ${peachConfig.merchantOrigin}`);
  console.log(`  \ud83d\udce6 Using Bearer token + form-encoded body`);

  try {
    const response = await axios.post(checkoutUrl, checkoutData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
        'Origin': peachConfig.merchantOrigin,
        'Referer': peachConfig.merchantOrigin + '/',
      },
      timeout: 15000,
    });

    const data = response.data;
    console.log(`\n  📥 Response Status: ${response.status}`);

    const checkoutId = data.id;
    if (checkoutId) {
      printResult('Checkout ID (Legacy)', checkoutId, true);
      printResult('Result code', data.result?.code || 'N/A', true);
      printResult('Result description', data.result?.description || 'N/A', true);
      return checkoutId;
    } else {
      printResult('Legacy checkout', 'No checkout ID returned', false);
      console.log('  📋 Full response:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error: any) {
    console.log(`\n  📥 Response Status: ${error.response?.status || 'N/A'}`);
    printResult('Legacy checkout', formatAxiosError(error), false);
    return null;
  }
}

// ─── Test 4: Query Checkout Status ───────────────────────────────────────────

async function testCheckoutStatus(token: string, checkoutId: string): Promise<void> {
  printHeader('TEST 4: Query Checkout Status');

  // Try V2 status endpoint
  const statusUrl = `${peachConfig.baseUrl}/v2/checkout/${checkoutId}/status`;
  console.log(`  📡 GET ${statusUrl}`);

  try {
    const response = await axios.get(statusUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 15000,
    });

    const data = response.data;
    console.log(`\n  📥 Response Status: ${response.status}`);
    printResult('Checkout status', data.status || data.result?.description || 'Received', true);
    console.log('  📋 Full response:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    // Try V1 fallback
    console.log(`\n  📥 V2 Status: ${error.response?.status || 'N/A'} — trying V1 fallback...`);

    try {
      const v1StatusUrl = `${peachConfig.baseUrl}/v1/checkouts/${checkoutId}/payment`;
      const queryParams = new URLSearchParams({
        'authentication.entityId': peachConfig.entityId,
      });

      const v1Response = await axios.get(`${v1StatusUrl}?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000,
      });

      console.log(`  📥 V1 Status: ${v1Response.status}`);
      printResult('Checkout status (V1)', v1Response.data?.result?.description || 'Received', true);
    } catch (v1Error: any) {
      printResult('Checkout status', `V1 also failed: ${v1Error.response?.status || v1Error.message}`, false);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\ud83c\udfe6 \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   PEACH PAYMENTS V2 INTEGRATION TEST');
  console.log('   Environment:      ' + (isProd ? '\u26a0\ufe0f  LIVE PRODUCTION (real money)' : 'SANDBOX'));
  console.log('   Base URL:         ' + peachConfig.baseUrl);
  console.log('   Auth URL:         ' + peachConfig.authUrl);
  console.log('   Merchant Domain:  ' + peachConfig.merchantOrigin + '   \u2190 sent as Origin/Referer');
  console.log('   Shopper Result:   ' + peachConfig.shopperResultUrl);
  console.log('   Notification URL: ' + (peachConfig.notificationUrl || '(not set)'));
  console.log('   Timestamp:   ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (isProd) {
    console.log('   \u26a0\ufe0f  This will create a REAL R10.00 ZAR checkout on production Peach.');
    console.log('   \u26a0\ufe0f  Any successful card capture will be billable.');
    console.log('   Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Test 1: Check env vars
  const envOk = testEnvironmentVars();
  if (!envOk) {
    console.log('\n❌ Cannot continue — critical environment variables are missing.');
    process.exit(1);
  }

  // Test 2: Get OAuth token
  const token = await testOAuthToken();
  if (!token) {
    console.log('\n❌ Cannot continue — failed to obtain an access token.');
    process.exit(1);
  }

  // Test 3: Create checkout session (try V2 first, then V1)
  let checkoutId = await testCheckoutCreation(token);

  if (!checkoutId) {
    console.log('\n  ℹ️  V2 checkout failed — trying V1 legacy endpoint...');
    checkoutId = await testLegacyCheckout(token);
  }

  // Test 4: Check status (if we got a checkoutId)
  if (checkoutId) {
    await testCheckoutStatus(token, checkoutId);
  } else {
    console.log('\n  ⚠️  Skipping status check — no checkout ID available.');
  }

  // Summary
  printHeader('SUMMARY');
  printResult('Environment vars', 'Loaded', envOk);
  printResult('OAuth token', token ? 'Obtained' : 'Failed', !!token);
  printResult('Checkout session', checkoutId || 'Not created', !!checkoutId);

  if (checkoutId) {
    console.log('\n  🎉 Peach Payments integration is working!');
    console.log('  💳 Checkout JS URL: ' + (peachConfig.testMode
      ? 'https://sandbox-checkout.peachpayments.com/js/checkout.js'
      : 'https://checkout.peachpayments.com/js/checkout.js'));
    console.log(`  🔗 Test payment at: ${peachConfig.baseUrl}/v2/checkout/${checkoutId}`);
  } else {
    console.log('\n  ⚠️  Checkout creation failed. Check the error details above.');
    console.log('  💡 Common causes:');
    console.log('     - Invalid credentials (client_id, client_secret, merchant_id)');
    console.log('     - Entity ID mismatch');
    console.log('     - Account not activated for sandbox testing');
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

main().catch((err) => {
  console.error('\n💥 Unhandled error:', err.message);
  process.exit(1);
});
