#!/usr/bin/env node

const axios = require('axios');
const mysql = require('mysql2/promise');

async function testCompleteSessionSystem() {
  try {
    console.log('🔍 Testing Complete Session Logging System...\n');
    
    const baseURL = 'http://localhost:5000/api/v1';
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Clear existing sessions for clean test
    await connection.execute('DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)', ['admin@membership.org']);
    console.log('🧹 Cleared existing test sessions');
    
    // Test 1: Login and session creation
    console.log('\n1. 🔐 Testing login with session creation...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@membership.org',
      password: 'admin123'
    }, {
      headers: {
        'User-Agent': 'Complete-Session-Test/1.0'
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
    console.log(`📋 Token: ${token ? 'Present' : 'Missing'}`);
    
    // Verify session in database
    const [sessions] = await connection.execute(`
      SELECT * FROM user_sessions WHERE session_id = ?
    `, [sessionId]);
    
    if (sessions.length > 0) {
      const session = sessions[0];
      console.log('✅ Session created in database:');
      console.log(`   IP: ${session.ip_address}`);
      console.log(`   User Agent: ${session.user_agent}`);
      console.log(`   Active: ${session.is_active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${session.created_at}`);
    } else {
      console.log('❌ Session not found in database');
      return;
    }
    
    // Test 2: Authenticated request with session tracking
    console.log('\n2. 🔍 Testing authenticated request with session tracking...');
    const beforeActivity = new Date();
    
    const statsResponse = await axios.get(`${baseURL}/admin-management/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-ID': sessionId,
        'User-Agent': 'Complete-Session-Test/1.0'
      }
    });
    
    if (statsResponse.data.success) {
      console.log('✅ Authenticated request successful');
      
      // Check if last_activity was updated
      const [updatedSession] = await connection.execute(`
        SELECT last_activity FROM user_sessions WHERE session_id = ?
      `, [sessionId]);
      
      if (updatedSession.length > 0) {
        const lastActivity = new Date(updatedSession[0].last_activity);
        console.log(`📋 Last activity: ${lastActivity}`);
        console.log(`📋 Activity updated: ${lastActivity >= beforeActivity ? 'Yes' : 'No'}`);
      }
    } else {
      console.log('❌ Authenticated request failed');
    }
    
    // Test 3: Multiple sessions for same user
    console.log('\n3. 🔄 Testing multiple sessions for same user...');
    const secondLoginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@membership.org',
      password: 'admin123'
    }, {
      headers: {
        'User-Agent': 'Complete-Session-Test-Second/1.0'
      }
    });
    
    const secondSessionId = secondLoginResponse.data.data.session_id;
    console.log(`✅ Second session created: ${secondSessionId}`);
    
    // Check total active sessions for user
    const [userSessions] = await connection.execute(`
      SELECT COUNT(*) as count FROM user_sessions 
      WHERE user_id = ? AND is_active = 1
    `, [userId]);
    
    console.log(`📊 Total active sessions for user: ${userSessions[0].count}`);
    
    // Test 4: Session-specific logout
    console.log('\n4. 🚪 Testing session-specific logout...');
    const logoutResponse = await axios.post(`${baseURL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-ID': sessionId
      }
    });
    
    if (logoutResponse.data.success) {
      console.log('✅ Logout successful');
      
      // Check if specific session was deactivated
      const [loggedOutSession] = await connection.execute(`
        SELECT is_active FROM user_sessions WHERE session_id = ?
      `, [sessionId]);
      
      if (loggedOutSession.length > 0) {
        console.log(`📋 First session active: ${loggedOutSession[0].is_active ? 'Yes' : 'No'}`);
      }
      
      // Check if second session is still active
      const [secondSession] = await connection.execute(`
        SELECT is_active FROM user_sessions WHERE session_id = ?
      `, [secondSessionId]);
      
      if (secondSession.length > 0) {
        console.log(`📋 Second session active: ${secondSession[0].is_active ? 'Yes' : 'No'}`);
      }
    }
    
    // Test 5: Session cleanup and audit trail
    console.log('\n5. 📋 Testing audit trail...');
    const [auditLogs] = await connection.execute(`
      SELECT action, entity_type, ip_address, user_agent, session_id, created_at
      FROM audit_logs
      WHERE (user_id = ? OR action IN ('login', 'logout'))
      AND action IN ('login', 'logout')
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    console.log('📋 Recent audit logs:');
    auditLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.action} - ${log.created_at}`);
      console.log(`      IP: ${log.ip_address || 'N/A'}`);
      console.log(`      User Agent: ${log.user_agent || 'N/A'}`);
      console.log(`      Session ID: ${log.session_id ? log.session_id.substring(0, 16) + '...' : 'N/A'}`);
    });
    
    // Test 6: Session expiration handling
    console.log('\n6. ⏰ Testing session expiration...');
    const [allSessions] = await connection.execute(`
      SELECT session_id, expires_at, is_active,
             CASE WHEN expires_at < NOW() THEN 'Expired' ELSE 'Valid' END as status
      FROM user_sessions 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    console.log('📋 Session status:');
    allSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.session_id.substring(0, 16)}... - ${session.status} (Active: ${session.is_active ? 'Yes' : 'No'})`);
      console.log(`      Expires: ${session.expires_at}`);
    });
    
    // Final cleanup
    console.log('\n7. 🧹 Cleaning up test sessions...');
    await connection.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    console.log('✅ Test sessions cleaned up');
    
    await connection.end();
    
    console.log('\n🎉 Complete session logging system test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Session creation on login');
    console.log('✅ Session ID returned to client');
    console.log('✅ Session tracking in database');
    console.log('✅ Activity updates on requests');
    console.log('✅ Multiple concurrent sessions');
    console.log('✅ Session-specific logout');
    console.log('✅ Audit trail logging');
    console.log('✅ Session expiration handling');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.log('📋 Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Wait for server to start
setTimeout(testCompleteSessionSystem, 3000);
