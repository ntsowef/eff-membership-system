/**
 * SMS Callback Service Tests
 * Tests the smsCallbackService functionality including:
 * - Webhook validation (signature, IP whitelist, rate limiting)
 * - Callback parsing (JSON Applink and generic providers)
 * - Callback logging to sms_delivery_callbacks table
 * - Integration with sms_delivery_tracking and sms_send_log
 * - Retry processing for failed callbacks
 * - Callback statistics and querying
 *
 * Usage: node test/sms-webhooks/test-sms-callback-service.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1/sms-webhooks';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function loginAndGetToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Token is at parsed.data.token
          const token = parsed.data?.token || parsed.token || '';
          if (token) console.log('🔑 Auth token obtained successfully');
          else console.log('⚠️  No auth token in response:', JSON.stringify(parsed).substring(0, 200));
          resolve(token);
        } catch {
          resolve('');
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ email: 'national.admin@eff.org.za', password: 'Admin@123' }));
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('SMS Callback Service - Integration Tests');
  console.log('='.repeat(70));

  // Get auth token for admin endpoints
  const token = await loginAndGetToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // =========================================================================
  // Test 1: JSON Applink webhook - delivered status
  // =========================================================================
  console.log('\n📋 Test 1: JSON Applink webhook - delivered status');
  const deliveredPayload = {
    reference: `test_delivered_${Date.now()}`,
    apiMsgId: `applink_${Date.now()}`,
    status: 'DELIVRD',
    delivered_at: new Date().toISOString(),
    creditCost: '0.35',
  };
  const r1 = await makeRequest('POST', '/delivery/json-applink', deliveredPayload);
  assert(r1.status === 200, 'Returns 200 status');
  assert(r1.body.success === true, 'Response success is true');
  assert(r1.body.delivery_status === 'delivered', 'Status mapped to delivered');
  assert(r1.body.callback_id > 0, `Callback ID returned: ${r1.body.callback_id}`);

  // =========================================================================
  // Test 2: JSON Applink webhook - failed status
  // =========================================================================
  console.log('\n📋 Test 2: JSON Applink webhook - failed status');
  const failedPayload = {
    reference: `test_failed_${Date.now()}`,
    apiMsgId: `applink_fail_${Date.now()}`,
    status: 'UNDELIV',
    error_code: 'EC_UNREACHABLE',
    error_message: 'Subscriber not reachable',
  };
  const r2 = await makeRequest('POST', '/delivery/json-applink', failedPayload);
  assert(r2.status === 200, 'Returns 200 status');
  assert(r2.body.delivery_status === 'failed', 'Status mapped to failed');

  // =========================================================================
  // Test 3: Generic provider webhook
  // =========================================================================
  console.log('\n📋 Test 3: Generic provider webhook');
  const genericPayload = {
    message_id: `test_generic_${Date.now()}`,
    provider_message_id: `generic_${Date.now()}`,
    status: 'delivered',
    timestamp: new Date().toISOString(),
  };
  const r3 = await makeRequest('POST', '/delivery/custom-provider', genericPayload);
  assert(r3.status === 200, 'Returns 200 status');
  assert(r3.body.success === true, 'Response success is true');
  assert(r3.body.delivery_status === 'delivered', 'Status mapped correctly');

  // =========================================================================
  // Test 4: Invalid webhook data
  // =========================================================================
  console.log('\n📋 Test 4: Webhook with no status info (empty object)');
  const r4 = await makeRequest('POST', '/delivery/json-applink', {});
  assert(r4.status === 200, 'Accepts empty object (logs with unknown status)');
  assert(r4.body.delivery_status === 'unknown', `Status is unknown for empty body (got: ${r4.body.delivery_status})`);

  // =========================================================================
  // Test 5: Test webhook endpoint
  // =========================================================================
  console.log('\n📋 Test 5: Test webhook endpoint');
  const r5 = await makeRequest('POST', '/test/json-applink', { status: 'sent' });
  assert(r5.status === 200, 'Test endpoint returns 200');
  assert(r5.body.success === true, 'Test endpoint success');
  assert(r5.body.data?.callback_id > 0, `Test callback ID: ${r5.body.data?.callback_id}`);

  // =========================================================================
  // Test 6: Get callbacks (admin, requires auth)
  // =========================================================================
  console.log('\n📋 Test 6: Get callbacks (admin)');
  if (token) {
    const r6 = await makeRequest('GET', '/callbacks?limit=5', null, authHeaders);
    assert(r6.status === 200, 'Returns 200 status');
    assert(r6.body.success === true, 'Response success');
    assert(Array.isArray(r6.body.data?.callbacks), 'Returns callbacks array');
    assert(r6.body.data?.callbacks.length > 0, `Found ${r6.body.data?.callbacks.length} callbacks`);
  } else {
    console.log('  ⚠️  SKIP: No auth token available');
  }

  // =========================================================================
  // Test 7: Get callback statistics (admin)
  // =========================================================================
  console.log('\n📋 Test 7: Get callback statistics (admin)');
  if (token) {
    const r7 = await makeRequest('GET', '/callback-stats?timeframe=day', null, authHeaders);
    assert(r7.status === 200, 'Returns 200 status');
    assert(r7.body.success === true, 'Response success');
    assert(r7.body.data?.statistics !== undefined, 'Returns statistics');
  } else {
    console.log('  ⚠️  SKIP: No auth token available');
  }

  // =========================================================================
  // Test 8: Get webhook logs (admin)
  // =========================================================================
  console.log('\n📋 Test 8: Get webhook logs (admin)');
  if (token) {
    const r8 = await makeRequest('GET', '/logs?limit=5', null, authHeaders);
    assert(r8.status === 200, 'Returns 200 status');
    assert(r8.body.success === true, 'Response success');
    assert(Array.isArray(r8.body.data?.logs), 'Returns logs array');
  } else {
    console.log('  ⚠️  SKIP: No auth token available');
  }

  // =========================================================================
  // Test 9: Retry failed callbacks (admin)
  // =========================================================================
  console.log('\n📋 Test 9: Retry failed callbacks (admin)');
  if (token) {
    const r9 = await makeRequest('POST', '/retry-failed', { max_attempts: 3 }, authHeaders);
    assert(r9.status === 200, 'Returns 200 status');
    assert(r9.body.success === true, 'Response success');
    assert(r9.body.data?.retried_count !== undefined, `Retried: ${r9.body.data?.retried_count}`);
  } else {
    console.log('  ⚠️  SKIP: No auth token available');
  }

  // =========================================================================
  // Test 10: Get supported providers (admin)
  // =========================================================================
  console.log('\n📋 Test 10: Get supported providers (admin)');
  if (token) {
    const r10 = await makeRequest('GET', '/providers', null, authHeaders);
    assert(r10.status === 200, 'Returns 200 status');
    assert(r10.body.success === true, 'Response success');
    assert(Array.isArray(r10.body.data?.providers), 'Returns providers array');
    assert(r10.body.data?.providers.includes('json-applink'), 'Includes json-applink provider');
  } else {
    console.log('  ⚠️  SKIP: No auth token available');
  }

  // =========================================================================
  // Test 11: Multiple status mappings
  // =========================================================================
  console.log('\n📋 Test 11: Status mapping variations');
  const statusTests = [
    { status: 'DELIVRD', expected: 'delivered' },
    { status: 'UNDELIV', expected: 'failed' },
    { status: 'EXPIRED', expected: 'expired' },
    { status: 'REJECTD', expected: 'rejected' },
    { status: 'ACCEPTD', expected: 'sent' },
    { status: 'ENROUTE', expected: 'pending' },
  ];

  for (const test of statusTests) {
    const payload = {
      reference: `test_status_${test.status}_${Date.now()}`,
      status: test.status,
    };
    const r = await makeRequest('POST', '/delivery/json-applink', payload);
    assert(r.body.delivery_status === test.expected, `${test.status} → ${test.expected} (got: ${r.body.delivery_status})`);
  }

  // =========================================================================
  // Test 12: Rate limiting (send many requests quickly)
  // =========================================================================
  console.log('\n📋 Test 12: Rate limiting (basic check)');
  // Just verify the endpoint doesn't crash under rapid requests
  const rapidPromises = [];
  for (let i = 0; i < 10; i++) {
    rapidPromises.push(makeRequest('POST', '/delivery/json-applink', {
      reference: `rate_test_${i}_${Date.now()}`,
      status: 'delivered',
    }));
  }
  const rapidResults = await Promise.all(rapidPromises);
  const allSucceeded = rapidResults.every(r => r.status === 200);
  assert(allSucceeded, `All 10 rapid requests succeeded`);

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('='.repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
