const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 5000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, path, method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  try {
    console.log('1. Logging in...');
    const loginRes = await post('/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@12345'
    });
    console.log('Login status:', loginRes.status);
    const loginData = JSON.parse(loginRes.body);
    const token = loginData.token || loginData.data?.token;
    if (!token) {
      console.log('No token! Response:', loginRes.body.substring(0, 300));
      return;
    }
    console.log('Got token:', token.substring(0, 30) + '...');

    console.log('\n2. Testing leaderboard...');
    const start = Date.now();
    const lbRes = await get('/api/v1/admin-performance/leaderboard?date_from=2026-01-23&date_to=2026-02-22&sort_by=score&sort_order=desc&limit=20', token);
    const elapsed = Date.now() - start;
    console.log('Leaderboard status:', lbRes.status, '(' + elapsed + 'ms)');
    console.log('Response:', lbRes.body.substring(0, 500));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();

