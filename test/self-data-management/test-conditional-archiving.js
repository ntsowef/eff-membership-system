/**
 * Integration Test: Conditional Archiving in Member Removal
 *
 * Tests that the archiveAndRemoveMembers method:
 * - SKIPS archiving to expelled_suspended_members when removal_reason is "Data Cleanup"
 * - SKIPS archiving to expelled_suspended_members when removal_reason is "Deceased"
 * - ARCHIVES to expelled_suspended_members for all other removal reasons (e.g. "Expelled")
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:5000
 *   - PostgreSQL database running on localhost:5432
 *
 * Usage:
 *   node test/self-data-management/test-conditional-archiving.js
 */

const { Client } = require('pg');
const axios = require('axios');

const API_URL = 'http://localhost:5000';
const AUTH_CREDENTIALS = {
  email: 'superadmin@eff.org.za',
  password: 'Admin@123',
};

// ─── Configuration ───────────────────────────────────────────────────────────
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
};

const TEST_ID_PREFIX = '0000000'; // Prefix for test ID numbers (unlikely to collide)

// ─── Helpers ─────────────────────────────────────────────────────────────────
let db;
let api;
let createdMemberIds = [];
let createdExpelledIds = [];

async function setupDb() {
  db = new Client(DB_CONFIG);
  await db.connect();
}

async function teardownDb() {
  if (db) await db.end();
}

/**
 * Insert a minimal test member into members_consolidated.
 * Returns { member_id, id_number }.
 */
async function createTestMember(suffix) {
  const idNumber = `${TEST_ID_PREFIX}${suffix}`;
  const res = await db.query(
    `INSERT INTO members_consolidated (id_number, firstname, surname, cell_number, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING member_id, id_number`,
    [idNumber, `TestFirst${suffix}`, `TestLast${suffix}`, `081000${suffix}`, `test${suffix}@cleanup.test`]
  );
  const member = res.rows[0];
  createdMemberIds.push(member.member_id);
  return member;
}

/**
 * Check if a member exists in members_consolidated.
 */
async function memberExists(memberId) {
  const res = await db.query('SELECT 1 FROM members_consolidated WHERE member_id = $1', [memberId]);
  return res.rowCount > 0;
}

/**
 * Check if a member was archived in expelled_suspended_members by original_member_id.
 * Returns the row if found, null otherwise.
 */
async function findArchivedMember(originalMemberId) {
  const res = await db.query(
    'SELECT * FROM expelled_suspended_members WHERE original_member_id = $1',
    [originalMemberId]
  );
  if (res.rowCount > 0) {
    createdExpelledIds.push(res.rows[0].id);
    return res.rows[0];
  }
  return null;
}

/**
 * Call the remove-by-ids API endpoint.
 */
async function callRemoveByIds(idNumbers, removalReason, removalType) {
  const response = await api.post('/api/v1/self-data-management/bulk-removal/remove-by-ids', {
    id_numbers: idNumbers,
    removal_reason: removalReason,
    removal_type: removalType,
    confirmation: 'CONFIRM',
  });
  return response.data;
}

/**
 * Clean up all test data created during the test run.
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    // Remove any remaining test members
    if (createdMemberIds.length > 0) {
      await db.query('DELETE FROM members_consolidated WHERE member_id = ANY($1::int[])', [createdMemberIds]);
      console.log(`   Deleted ${createdMemberIds.length} test member(s) from members_consolidated`);
    }
    // Remove any archived test records
    if (createdExpelledIds.length > 0) {
      await db.query('DELETE FROM expelled_suspended_members WHERE id = ANY($1::int[])', [createdExpelledIds]);
      console.log(`   Deleted ${createdExpelledIds.length} test record(s) from expelled_suspended_members`);
    }
    // Also clean up by test ID prefix pattern
    const cleanupRes = await db.query(
      `DELETE FROM expelled_suspended_members WHERE id_number LIKE $1 RETURNING id`,
      [`${TEST_ID_PREFIX}%`]
    );
    if (cleanupRes.rowCount > 0) {
      console.log(`   Cleaned ${cleanupRes.rowCount} additional expelled record(s) by ID prefix`);
    }
    const cleanupRes2 = await db.query(
      `DELETE FROM members_consolidated WHERE id_number LIKE $1 RETURNING member_id`,
      [`${TEST_ID_PREFIX}%`]
    );
    if (cleanupRes2.rowCount > 0) {
      console.log(`   Cleaned ${cleanupRes2.rowCount} additional member(s) by ID prefix`);
    }
    console.log('✅ Cleanup complete');
  } catch (err) {
    console.error('❌ Cleanup error:', err.message);
  }
}

// ─── Test Cases ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`   ❌ FAIL: ${message}`);
    failed++;
  }
}

/**
 * Test 1: "Data Cleanup" removal should skip archiving
 */
async function testDataCleanupSkipsArchiving() {
  console.log('\n📝 Test 1: Data Cleanup removal skips archiving');
  const member = await createTestMember('100001');
  console.log(`   Created test member: member_id=${member.member_id}, id_number=${member.id_number}`);

  const result = await callRemoveByIds([member.id_number], 'Data Cleanup', 'data_cleanup');
  console.log(`   API response: ${JSON.stringify(result.message || result)}`);

  // Wait briefly for DB to settle
  await new Promise(r => setTimeout(r, 500));

  const stillExists = await memberExists(member.member_id);
  assert(!stillExists, 'Member is deleted from members_consolidated');

  const archived = await findArchivedMember(member.member_id);
  assert(archived === null, 'Member is NOT archived in expelled_suspended_members (Data Cleanup)');
}

/**
 * Test 2: "Deceased" removal should skip archiving
 */
async function testDeceasedSkipsArchiving() {
  console.log('\n📝 Test 2: Deceased removal skips archiving');
  const member = await createTestMember('200002');
  console.log(`   Created test member: member_id=${member.member_id}, id_number=${member.id_number}`);

  const result = await callRemoveByIds([member.id_number], 'Deceased', 'deceased');
  console.log(`   API response: ${JSON.stringify(result.message || result)}`);

  await new Promise(r => setTimeout(r, 500));

  const stillExists = await memberExists(member.member_id);
  assert(!stillExists, 'Member is deleted from members_consolidated');

  const archived = await findArchivedMember(member.member_id);
  assert(archived === null, 'Member is NOT archived in expelled_suspended_members (Deceased)');
}

/**
 * Test 3: "Expelled" removal should archive normally
 */
async function testExpelledArchivesNormally() {
  console.log('\n📝 Test 3: Expelled removal archives normally');
  const member = await createTestMember('300003');
  console.log(`   Created test member: member_id=${member.member_id}, id_number=${member.id_number}`);

  const result = await callRemoveByIds([member.id_number], 'Expelled', 'expelled');
  console.log(`   API response: ${JSON.stringify(result.message || result)}`);

  await new Promise(r => setTimeout(r, 500));

  const stillExists = await memberExists(member.member_id);
  assert(!stillExists, 'Member is deleted from members_consolidated');

  const archived = await findArchivedMember(member.member_id);
  assert(archived !== null, 'Member IS archived in expelled_suspended_members (Expelled)');
  if (archived) {
    assert(archived.removal_reason === 'Expelled', `Archived removal_reason is "Expelled" (got: "${archived.removal_reason}")`);
    assert(archived.removal_type === 'expelled', `Archived removal_type is "expelled" (got: "${archived.removal_type}")`);
  }
}

// ─── Main Runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Conditional Archiving Integration Test');
  console.log('='.repeat(60));

  try {
    // Setup
    await setupDb();
    console.log('✅ Database connected');

    // Authenticate
    const loginResp = await axios.post(`${API_URL}/api/v1/auth/login`, AUTH_CREDENTIALS);
    const token = loginResp.data.data.token;
    api = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    console.log('✅ Authenticated as ' + AUTH_CREDENTIALS.email);

    // Pre-clean any leftover test data
    await cleanup();

    // Run tests
    await testDataCleanupSkipsArchiving();
    await testDeceasedSkipsArchiving();
    await testExpelledArchivesNormally();

    // Cleanup
    await cleanup();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n❌ Fatal error:', err.response?.data || err.message);
    process.exitCode = 1;
    // Attempt cleanup even on fatal error
    try { await cleanup(); } catch (_) {}
  } finally {
    await teardownDb();
  }
}

main();

