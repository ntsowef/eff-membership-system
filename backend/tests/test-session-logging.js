#!/usr/bin/env node

const axios = require('axios');
const mysql = require('mysql2/promise');

async function testSessionLogging() {
  try {
    console.log('🔍 Testing Session Logging...\n');
    
    const baseURL = 'http://localhost:5000/api/v1';
    
    // Connect to database to check sessions
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Check initial session count
    const [initialSessions] = await connection.execute('SELECT COUNT(*) as count FROM user_sessions WHERE is_active = 1');
    console.log(`📊 Initial active sessions: ${initialSessions[0].count}`);
    
    // Test login to create a session
    console.log('\n1. 🔐 Testing login with session creation...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@membership.org',
      password: 'admin123'
    }, {
      headers: {
        'User-Agent': 'Test-Session-Client/1.0'
      }
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginResponse.data.data.token;
    const sessionId = loginResponse.data.data.session_id;
    const userId = loginResponse.data.data.user.id;
    
    console.log('✅ Login successful');
    console.log(`📋 User ID: ${userId}`);
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📋 Token received: ${token ? 'Yes' : 'No'}`);
    
    // Check if session was created in database
    console.log('\n2. 📊 Checking session in database...');
    const [sessions] = await connection.execute(`
      SELECT s.*, u.name, u.email 
      FROM user_sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.session_id = ?
    `, [sessionId]);
    
    if (sessions.length > 0) {
      const session = sessions[0];
      console.log('✅ Session found in database:');
      console.log(`   User: ${session.name} (${session.email})`);
      console.log(`   Session ID: ${session.session_id}`);
      console.log(`   IP Address: ${session.ip_address}`);
      console.log(`   User Agent: ${session.user_agent}`);
      console.log(`   Created: ${session.created_at}`);
      console.log(`   Active: ${session.is_active ? 'Yes' : 'No'}`);
      console.log(`   Expires: ${session.expires_at}`);
    } else {
      console.log('❌ Session not found in database');
    }
    
    // Check total active sessions
    const [activeSessions] = await connection.execute('SELECT COUNT(*) as count FROM user_sessions WHERE is_active = 1');
    console.log(`\n📊 Total active sessions: ${activeSessions[0].count}`);
    
    // Test making an authenticated request
    console.log('\n3. 🔍 Testing authenticated request...');
    try {
      const statsResponse = await axios.get(`${baseURL}/admin-management/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-ID': sessionId
        }
      });
      
      if (statsResponse.data.success) {
        console.log('✅ Authenticated request successful');
        
        // Check if session activity was updated
        const [updatedSession] = await connection.execute(`
          SELECT last_activity FROM user_sessions WHERE session_id = ?
        `, [sessionId]);
        
        if (updatedSession.length > 0) {
          console.log(`📋 Last activity updated: ${updatedSession[0].last_activity}`);
        }
      }
    } catch (authError) {
      console.log('❌ Authenticated request failed:', authError.response?.data?.error?.message || authError.message);
    }
    
    // Test logout
    console.log('\n4. 🚪 Testing logout...');
    try {
      const logoutResponse = await axios.post(`${baseURL}/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-ID': sessionId
        }
      });
      
      if (logoutResponse.data.success) {
        console.log('✅ Logout successful');
        
        // Check if session was deactivated
        const [loggedOutSession] = await connection.execute(`
          SELECT is_active, last_activity FROM user_sessions WHERE session_id = ?
        `, [sessionId]);
        
        if (loggedOutSession.length > 0) {
          console.log(`📋 Session active: ${loggedOutSession[0].is_active ? 'Yes' : 'No'}`);
          console.log(`📋 Last activity: ${loggedOutSession[0].last_activity}`);
        }
      }
    } catch (logoutError) {
      console.log('❌ Logout failed:', logoutError.response?.data?.error?.message || logoutError.message);
    }
    
    // Final session count
    const [finalSessions] = await connection.execute('SELECT COUNT(*) as count FROM user_sessions WHERE is_active = 1');
    console.log(`\n📊 Final active sessions: ${finalSessions[0].count}`);
    
    // Show recent sessions
    console.log('\n5. 📋 Recent sessions:');
    const [recentSessions] = await connection.execute(`
      SELECT s.session_id, u.name, u.email, s.ip_address, s.created_at, s.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    recentSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.name} - ${session.is_active ? 'Active' : 'Inactive'} (${session.created_at})`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.log('📋 Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Wait for server to start
setTimeout(testSessionLogging, 3000);
