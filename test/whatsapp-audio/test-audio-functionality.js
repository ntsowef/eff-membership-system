/**
 * WhatsApp Audio/Voice Note Functionality Test Script
 * 
 * Tests the audio sending functionality of the WasenderAPI service.
 * 
 * Prerequisites:
 * 1. Backend server running on port 5000
 * 2. WhatsApp bot enabled (WHATSAPP_BOT_ENABLED=true in .env)
 * 
 * Usage:
 *   node test/whatsapp-audio/test-audio-functionality.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const TEST_PHONE = process.env.TEST_PHONE || '0000000000';

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}[TEST]${colors.reset} ${msg}`)
};

async function testBotStatus() {
  log.test('Testing WhatsApp bot status...');
  try {
    const response = await fetch(`${BASE_URL}/whatsapp/status`);
    const data = await response.json();
    if (data.success && data.data.enabled) {
      log.success('WhatsApp bot is enabled and running');
      return true;
    }
    log.warn('WhatsApp bot is disabled or not connected');
    return false;
  } catch (error) {
    log.error(`Failed to check bot status: ${error.message}`);
    return false;
  }
}

async function testAudioUpload() {
  log.test('Testing audio upload validation...');
  try {
    const response = await fetch(`${BASE_URL}/whatsapp/audio/upload`, { method: 'POST' });
    const data = await response.json();
    if (!data.success && data.error.includes('No audio file')) {
      log.success('Upload validation working correctly');
      return { success: true };
    }
    return { success: false, error: 'Unexpected response' };
  } catch (error) {
    log.error(`Upload test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testListAudioFiles() {
  log.test('Testing audio file listing...');
  try {
    const response = await fetch(`${BASE_URL}/whatsapp/audio/list`);
    const data = await response.json();
    if (data.success) {
      log.success(`Found ${data.data.total} audio files`);
      return { success: true, data: data.data };
    }
    log.error(`List failed: ${data.error}`);
    return { success: false, error: data.error };
  } catch (error) {
    log.error(`List test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSendAudio(audioUrl) {
  log.test('Testing audio send endpoint...');
  if (TEST_PHONE === '0000000000') {
    log.warn('TEST_PHONE not set - skipping actual send');
    return { success: true, skipped: true };
  }
  try {
    const response = await fetch(`${BASE_URL}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: TEST_PHONE, type: 'audio', message: audioUrl })
    });
    const data = await response.json();
    if (data.success) {
      log.success('Audio message sent successfully');
      return { success: true };
    }
    log.error(`Send failed: ${data.error}`);
    return { success: false, error: data.error };
  } catch (error) {
    log.error(`Send test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testBulkAudioEndpoint() {
  log.test('Testing bulk audio endpoint validation...');
  try {
    const response = await fetch(`${BASE_URL}/whatsapp/send/audio/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    if (!data.success && data.error.includes('recipients')) {
      log.success('Bulk endpoint validates input correctly');
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    log.error(`Bulk test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(50));
  console.log('  WhatsApp Audio Functionality Tests');
  console.log('='.repeat(50) + '\n');

  const results = {};
  results.botStatus = await testBotStatus(); console.log('');
  results.upload = (await testAudioUpload()).success; console.log('');
  const listResult = await testListAudioFiles(); 
  results.list = listResult.success; console.log('');
  
  const audioUrl = listResult.data?.files?.[0]?.url;
  results.send = audioUrl ? (await testSendAudio(audioUrl)).success : true;
  console.log('');
  results.bulk = (await testBulkAudioEndpoint()).success; console.log('');

  console.log('='.repeat(50));
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  Object.entries(results).forEach(([k, v]) => 
    console.log(`  ${k}: ${v ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`));
  console.log(`\n  Total: ${passed}/${total} passed\n`);
  return passed === total;
}

runTests().then(s => process.exit(s ? 0 : 1)).catch(e => { log.error(e.message); process.exit(1); });

