const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Super Admin Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .log {
            background: #f5f5f5;
            padding: 10px;
            margin: 10px 0;
            border-left: 4px solid #4CAF50;
            font-family: monospace;
            white-space: pre-wrap;
            font-size: 12px;
        }
        .error {
            border-left-color: #f44336;
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
        }
        button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <h1>Super Admin Login Test</h1>
    <button onclick="testLogin()">Test Login</button>
    <button onclick="testDashboard()">Test Dashboard (with stored token)</button>
    <button onclick="clearStorage()">Clear LocalStorage</button>
    <div id="logs"></div>

    <script>
        function log(message, isError = false) {
            const logsDiv = document.getElementById('logs');
            const logDiv = document.createElement('div');
            logDiv.className = 'log' + (isError ? ' error' : '');
            logDiv.textContent = message;
            logsDiv.appendChild(logDiv);
            console.log(message);
        }

        function clearStorage() {
            localStorage.clear();
            document.getElementById('logs').innerHTML = '';
            log('✅ LocalStorage cleared');
        }

        async function testLogin() {
            document.getElementById('logs').innerHTML = '';
            log('🧪 Testing Super Admin Login...\\n');

            try {
                log('📝 Step 1: Attempting login...');
                const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'superadmin@eff.org.za',
                        password: 'SuperAdmin@2024!'
                    })
                });

                const loginData = await loginResponse.json();
                log('✅ Login Status: ' + loginResponse.status);
                log('✅ User: ' + loginData.data.user.email);
                log('✅ Role: ' + loginData.data.user.role);
                log('✅ Token: ' + loginData.data.token.substring(0, 30) + '...');

                if (loginData.success && loginData.data.token) {
                    const { user, token, session_id } = loginData.data;

                    log('\\n📝 Step 2: Storing in localStorage...');
                    const authStorage = {
                        state: {
                            user: user,
                            token: token,
                            sessionId: session_id,
                            isAuthenticated: true,
                            provinceContext: null
                        },
                        version: 0
                    };

                    localStorage.setItem('auth-storage', JSON.stringify(authStorage));
                    log('✅ Stored in localStorage');

                    const stored = localStorage.getItem('auth-storage');
                    const parsed = JSON.parse(stored);
                    log('✅ Verified token in storage: ' + (parsed.state.token ? 'YES' : 'NO'));

                    log('\\n📝 Step 3: Testing dashboard access...');
                    await testDashboard();
                }
            } catch (error) {
                log('🚨 Error: ' + error.message, true);
                console.error(error);
            }
        }

        async function testDashboard() {
            try {
                const authStorage = localStorage.getItem('auth-storage');
                if (!authStorage) {
                    log('❌ No auth-storage in localStorage', true);
                    return;
                }

                const parsed = JSON.parse(authStorage);
                const token = parsed.state?.token;

                if (!token) {
                    log('❌ No token in auth-storage', true);
                    return;
                }

                log('🔑 Using token: ' + token.substring(0, 30) + '...');

                const dashboardResponse = await fetch('http://localhost:5000/api/v1/super-admin/dashboard', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });

                log('✅ Dashboard Status: ' + dashboardResponse.status);

                if (dashboardResponse.ok) {
                    const dashboardData = await dashboardResponse.json();
                    log('✅ Dashboard Data Retrieved!');
                    log('Total Users: ' + dashboardData.data.user_statistics.total_users);
                    log('Super Admins: ' + dashboardData.data.user_statistics.super_admins);
                } else {
                    const errorData = await dashboardResponse.json();
                    log('❌ Dashboard Error: ' + JSON.stringify(errorData, null, 2), true);
                }
            } catch (error) {
                log('🚨 Error: ' + error.message, true);
                console.error(error);
            }
        }
    </script>
</body>
</html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`✅ Test server running at http://localhost:${PORT}`);
  console.log(`📝 Open http://localhost:${PORT} in your browser to test login`);
});

