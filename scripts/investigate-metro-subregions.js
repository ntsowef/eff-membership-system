const http = require('http');
const fs = require('fs');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const output = [];
  const PROD_API = 'http://69.164.245.173:5000/api/v1';

  // Test production API endpoints (same as what the frontend calls)

  // 1. Test municipalities endpoint
  output.push('=== TEST 1: Production API - municipalities for Free State ===');
  try {
    const muniData = await httpGet(PROD_API + '/geographic/municipalities?province=FS');
    const munis = muniData.data;
    const subRegions = munis.filter(m => m.municipality_type === 'Metro Sub-Region');
    output.push('Total municipalities: ' + munis.length);
    output.push('Sub-regions: ' + subRegions.length);
    subRegions.forEach(sr => output.push('  ' + sr.municipality_id + ' | ' + sr.municipality_code + ' | ' + sr.municipality_name));
  } catch(e) { output.push('ERROR: ' + e.message); }

  // 2. Test positions endpoint for Bloemfontein (entity_id=581)
  output.push('\n=== TEST 2: Production API - positions for Bloemfontein (entity_id=581) ===');
  try {
    const posData = await httpGet(PROD_API + '/leadership/positions?hierarchy_level=Municipality&entity_id=581');
    const positions = posData.data?.positions || posData.data || [];
    const filled = positions.filter(p => p.position_status === 'Filled');
    const vacant = positions.filter(p => p.position_status !== 'Filled');
    output.push('Total positions: ' + positions.length);
    output.push('Filled: ' + filled.length);
    output.push('Vacant: ' + vacant.length);
    output.push('\nFilled positions:');
    filled.forEach(p => output.push('  ' + p.position_code + ' | ' + p.position_name + ' | holders: ' + (p.current_holders || 'none')));
    output.push('\nVacant positions:');
    vacant.forEach(p => output.push('  ' + p.position_code + ' | ' + p.position_name));
  } catch(e) { output.push('ERROR: ' + e.message); }

  // 3. Test positions endpoint for Botshabelo (entity_id=582)
  output.push('\n=== TEST 3: Production API - positions for Botshabelo (entity_id=582) ===');
  try {
    const posData = await httpGet(PROD_API + '/leadership/positions?hierarchy_level=Municipality&entity_id=582');
    const positions = posData.data?.positions || posData.data || [];
    const filled = positions.filter(p => p.position_status === 'Filled');
    const vacant = positions.filter(p => p.position_status !== 'Filled');
    output.push('Total positions: ' + positions.length);
    output.push('Filled: ' + filled.length);
    output.push('Vacant: ' + vacant.length);
    output.push('\nFilled positions:');
    filled.forEach(p => output.push('  ' + p.position_code + ' | ' + p.position_name + ' | holders: ' + (p.current_holders || 'none')));
  } catch(e) { output.push('ERROR: ' + e.message); }

  // 4. Test a regular municipality for comparison (Setsoto, entity_id=494)
  output.push('\n=== TEST 4: Production API - positions for Setsoto (entity_id=494) ===');
  try {
    const posData = await httpGet(PROD_API + '/leadership/positions?hierarchy_level=Municipality&entity_id=494');
    const positions = posData.data?.positions || posData.data || [];
    const filled = positions.filter(p => p.position_status === 'Filled');
    const vacant = positions.filter(p => p.position_status !== 'Filled');
    output.push('Total positions: ' + positions.length);
    output.push('Filled: ' + filled.length);
    output.push('Vacant: ' + vacant.length);
    output.push('\nFilled positions (first 5):');
    filled.slice(0, 5).forEach(p => output.push('  ' + p.position_code + ' | ' + p.position_name + ' | holders: ' + (p.current_holders || 'none')));
  } catch(e) { output.push('ERROR: ' + e.message); }

  fs.writeFileSync('scripts/metro-debug.txt', output.join('\n'));
  console.log('Done - written to scripts/metro-debug.txt');
}

run().catch(e => { console.error(e.message); });

