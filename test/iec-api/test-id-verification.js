/**
 * Production IEC ID-verification smoke test
 *
 * Usage (from repo root or any cwd):
 *   node test/iec-api/test-id-verification.js <id-number> [<id-number> ...]
 *
 * Credentials are loaded from backend/.env (IEC_API_USERNAME, IEC_API_PASSWORD).
 * Endpoint defaults to https://api.elections.org.za and can be overridden via
 * IEC_API_BASE_URL in the environment.
 *
 * Exit codes:
 *   0  all IDs verified successfully
 *   1  at least one ID failed with a non-Cloudflare error
 *   2  request was blocked by a Cloudflare challenge (network/IP issue, not code)
 *
 * No project imports — only `axios` and `dotenv` (already in backend deps).
 */
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Locate backend/.env relative to this file
const envPath = path.resolve(__dirname, '..', '..', 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.error('backend/.env not found at', envPath);
  process.exit(1);
}
require('dotenv').config({ path: envPath });

const BASE_URL = process.env.IEC_API_BASE_URL || 'https://api.elections.org.za';
const USERNAME = process.env.IEC_API_USERNAME;
const PASSWORD = process.env.IEC_API_PASSWORD;
const TIMEOUT  = parseInt(process.env.IEC_API_TIMEOUT || '30000', 10);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ids = process.argv.slice(2).filter(Boolean);
if (!ids.length) {
  console.error('Usage: node test/iec-api/test-id-verification.js <id-number> [<id-number> ...]');
  process.exit(1);
}
if (!USERNAME || !PASSWORD) {
  console.error('IEC_API_USERNAME / IEC_API_PASSWORD missing from backend/.env');
  process.exit(1);
}

const CF_MARKERS = /__cf_chl_tk|cf-chl|challenge-platform|Just a moment|cf_chl_opt/i;
function isCloudflareChallenge(status, body) {
  if (status !== 403 && status !== 429 && status !== 503) return false;
  const text = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
  return CF_MARKERS.test(text);
}

function bar() { console.log('='.repeat(60)); }

async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'password',
    username: USERNAME,
    password: PASSWORD,
  }).toString();

  const t0 = Date.now();
  const resp = await axios.post(`${BASE_URL}/token`, body, {
    timeout: TIMEOUT,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': UA,
    },
    validateStatus: () => true,
  });
  const ms = Date.now() - t0;

  if (isCloudflareChallenge(resp.status, resp.data)) {
    const ray = (resp.headers && resp.headers['cf-ray']) || 'unknown';
    const err = new Error(`Cloudflare challenge on /token (cf-ray: ${ray})`);
    err.cf = true; err.status = resp.status; err.ms = ms;
    throw err;
  }
  if (resp.status < 200 || resp.status >= 300) {
    const err = new Error(`/token HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 200)}`);
    err.status = resp.status; err.ms = ms;
    throw err;
  }
  return { token: resp.data.access_token, expiresIn: resp.data.expires_in, ms };
}

async function verifyVoter(token, id) {
  const t0 = Date.now();
  const resp = await axios.get(`${BASE_URL}/api/Voters/IDNumber/${id}`, {
    timeout: TIMEOUT,
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'User-Agent': UA },
    validateStatus: () => true,
  });
  const ms = Date.now() - t0;
  if (isCloudflareChallenge(resp.status, resp.data)) {
    const ray = (resp.headers && resp.headers['cf-ray']) || 'unknown';
    const err = new Error(`Cloudflare challenge on voter lookup (cf-ray: ${ray})`);
    err.cf = true; err.status = resp.status; err.ms = ms;
    throw err;
  }
  if (resp.status < 200 || resp.status >= 300) {
    const err = new Error(`voter lookup HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 200)}`);
    err.status = resp.status; err.ms = ms;
    throw err;
  }
  return { data: resp.data, ms };
}

(async () => {
  bar();
  console.log('IEC API ID Verification — Production Test');
  bar();
  console.log('Endpoint:  ', BASE_URL);
  console.log('Username:  ', USERNAME);
  console.log('IDs:       ', ids.join(', '));
  console.log();

  let token;
  try {
    console.log('[1] Requesting access token...');
    const t = await getToken();
    token = t.token;
    console.log(`    OK (${t.ms}ms) — token expires in ${t.expiresIn}s`);
    console.log(`    Preview: ${token.slice(0, 50)}...`);
  } catch (e) {
    console.log(`    FAIL (${e.ms || '?'}ms) — ${e.message}`);
    if (e.cf) { bar(); console.log('Result: Cloudflare blocked the token request.'); bar(); process.exit(2); }
    bar(); console.log('Result: token request failed.'); bar(); process.exit(1);
  }

  let hadFailure = false, hadCfBlock = false;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    console.log(`\n[2.${i + 1}] Verifying voter for ID ${id}...`);
    try {
      const { data, ms } = await verifyVoter(token, id);
      const d = (data.VotingStation && data.VotingStation.Delimitation) || {};
      console.log(`    OK (${ms}ms)`);
      console.log(`      Registered:      ${data.bRegistered}`);
      console.log(`      Voter status:    ${data.VoterStatus}`);
      console.log(`      Province:        ${d.Province || '-'} (${d.ProvinceID || '-'})`);
      console.log(`      Municipality:    ${d.Municipality || '-'} (${d.MunicipalityID || '-'})`);
      console.log(`      Ward:            ${d.WardID || '-'}`);
      console.log(`      Voting District: ${d.VDNumber || '-'}`);
      console.log(`      Voting Station:  ${(data.VotingStation && data.VotingStation.Name) || '-'}`);
    } catch (e) {
      hadFailure = true;
      if (e.cf) hadCfBlock = true;
      console.log(`    FAIL (${e.ms || '?'}ms) — ${e.message}`);
    }
  }

  bar();
  if (!hadFailure) { console.log('Result: SUCCESS — all IDs verified.'); bar(); process.exit(0); }
  console.log(`Result: ${hadCfBlock ? 'BLOCKED by Cloudflare on one or more requests.' : 'FAILED for one or more IDs.'}`);
  bar();
  process.exit(hadCfBlock ? 2 : 1);
})().catch(err => { console.error('Unexpected error:', err); process.exit(1); });
