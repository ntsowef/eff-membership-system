/**
 * Hierarchical Meeting Management System Test
 * Tests the complete hierarchical meeting system including database schema,
 * automatic invitation logic, and API endpoints
 */

const mysql = require('mysql2/promise');
const axios = require('axios');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_new'
};

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

class HierarchicalMeetingSystemTest {
  constructor() {
    this.connection = null;
    this.testResults = {
      database: [],
      api: [],
      invitations: [],
      errors: []
    };
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log('✅ Connected to MySQL database');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.testResults.errors.push(`Database connection: ${error.message}`);
      return false;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Disconnected from database');
    }
  }

  async testDatabaseSchema() {
    console.log('\n🔍 Testing Database Schema...');
    
    const requiredTables = [
      'meeting_types',
      'meetings',
      'organizational_roles',
      'member_roles',
      'meeting_attendance',
      'meeting_invitation_log',
      'meeting_recurring_schedule',
      'meeting_templates'
    ];

    for (const table of requiredTables) {
      try {
        const [rows] = await this.connection.execute(`DESCRIBE ${table}`);
        console.log(`✅ Table ${table} exists with ${rows.length} columns`);
        this.testResults.database.push(`${table}: OK`);
      } catch (error) {
        console.error(`❌ Table ${table} missing or invalid:`, error.message);
        this.testResults.database.push(`${table}: FAILED - ${error.message}`);
      }
    }

    // Test views
    const requiredViews = [
      'vw_hierarchical_meeting_statistics',
      'vw_hierarchical_attendance_statistics'
    ];

    for (const view of requiredViews) {
      try {
        const [rows] = await this.connection.execute(`SELECT * FROM ${view} LIMIT 1`);
        console.log(`✅ View ${view} exists and accessible`);
        this.testResults.database.push(`${view}: OK`);
      } catch (error) {
        console.error(`❌ View ${view} missing or invalid:`, error.message);
        this.testResults.database.push(`${view}: FAILED - ${error.message}`);
      }
    }
  }

  async testMeetingTypes() {
    console.log('\n🔍 Testing Meeting Types...');
    
    try {
      const [rows] = await this.connection.execute(`
        SELECT type_code, type_name, hierarchy_level, meeting_category 
        FROM meeting_types 
        WHERE is_active = TRUE
        ORDER BY hierarchy_level, type_name
      `);

      console.log(`✅ Found ${rows.length} active meeting types`);
      
      // Test specific meeting types
      const expectedTypes = [
        'war_council',
        'npa',
        'nga',
        'cct_nec_quarterly',
        'policy_conference',
        'elective_conference',
        'ppa',
        'provincial_elective',
        'pga',
        'special_pga',
        'regional_coord',
        'sub_regional',
        'branch_meeting'
      ];

      const foundTypes = rows.map(row => row.type_code);
      
      for (const expectedType of expectedTypes) {
        if (foundTypes.includes(expectedType)) {
          console.log(`✅ Meeting type ${expectedType} found`);
          this.testResults.database.push(`Meeting type ${expectedType}: OK`);
        } else {
          console.error(`❌ Meeting type ${expectedType} missing`);
          this.testResults.database.push(`Meeting type ${expectedType}: MISSING`);
        }
      }

      // Display hierarchy distribution
      const hierarchyStats = {};
      rows.forEach(row => {
        if (!hierarchyStats[row.hierarchy_level]) {
          hierarchyStats[row.hierarchy_level] = 0;
        }
        hierarchyStats[row.hierarchy_level]++;
      });

      console.log('\n📊 Meeting Types by Hierarchy:');
      Object.entries(hierarchyStats).forEach(([level, count]) => {
        console.log(`   ${level}: ${count} types`);
      });

    } catch (error) {
      console.error('❌ Failed to test meeting types:', error.message);
      this.testResults.errors.push(`Meeting types test: ${error.message}`);
    }
  }

  async testOrganizationalRoles() {
    console.log('\n🔍 Testing Organizational Roles...');
    
    try {
      const [rows] = await this.connection.execute(`
        SELECT role_code, role_name, hierarchy_level, role_category, meeting_invitation_priority
        FROM organizational_roles 
        WHERE is_active = TRUE
        ORDER BY hierarchy_level, meeting_invitation_priority DESC
      `);

      console.log(`✅ Found ${rows.length} active organizational roles`);
      
      // Test key roles
      const keyRoles = [
        'president',
        'deputy_president',
        'secretary_general',
        'national_chairperson',
        'treasurer_general',
        'nec_member',
        'cct_member',
        'provincial_chairperson',
        'provincial_secretary',
        'ward_chairperson',
        'branch_delegate'
      ];

      const foundRoles = rows.map(row => row.role_code);
      
      for (const keyRole of keyRoles) {
        if (foundRoles.includes(keyRole)) {
          console.log(`✅ Role ${keyRole} found`);
          this.testResults.database.push(`Role ${keyRole}: OK`);
        } else {
          console.error(`❌ Role ${keyRole} missing`);
          this.testResults.database.push(`Role ${keyRole}: MISSING`);
        }
      }

      // Display hierarchy and priority distribution
      console.log('\n📊 Roles by Hierarchy and Priority:');
      const hierarchyRoles = {};
      rows.forEach(row => {
        if (!hierarchyRoles[row.hierarchy_level]) {
          hierarchyRoles[row.hierarchy_level] = [];
        }
        hierarchyRoles[row.hierarchy_level].push({
          role: row.role_name,
          priority: row.meeting_invitation_priority,
          category: row.role_category
        });
      });

      Object.entries(hierarchyRoles).forEach(([level, roles]) => {
        console.log(`   ${level}: ${roles.length} roles`);
        roles.slice(0, 3).forEach(role => {
          console.log(`     - ${role.role} (Priority: ${role.priority}, ${role.category})`);
        });
      });

    } catch (error) {
      console.error('❌ Failed to test organizational roles:', error.message);
      this.testResults.errors.push(`Organizational roles test: ${error.message}`);
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔍 Testing API Endpoints...');
    
    const endpoints = [
      {
        method: 'GET',
        url: '/hierarchical-meetings/meeting-types',
        description: 'Get meeting types'
      },
      {
        method: 'GET',
        url: '/hierarchical-meetings/organizational-roles',
        description: 'Get organizational roles'
      },
      {
        method: 'GET',
        url: '/hierarchical-meetings/members-with-roles?hierarchy_level=National',
        description: 'Get members with roles'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method.toLowerCase(),
          url: `${API_BASE_URL}${endpoint.url}`,
          timeout: 5000
        });

        if (response.status === 200 && response.data.success) {
          console.log(`✅ ${endpoint.description}: OK`);
          this.testResults.api.push(`${endpoint.description}: OK`);
        } else {
          console.error(`❌ ${endpoint.description}: Invalid response`);
          this.testResults.api.push(`${endpoint.description}: INVALID RESPONSE`);
        }
      } catch (error) {
        console.error(`❌ ${endpoint.description}: ${error.message}`);
        this.testResults.api.push(`${endpoint.description}: FAILED - ${error.message}`);
      }
    }
  }

  async testInvitationPreview() {
    console.log('\n🔍 Testing Invitation Preview Logic...');
    
    try {
      // Get a meeting type for testing
      const [meetingTypes] = await this.connection.execute(`
        SELECT type_id, type_code, type_name, hierarchy_level 
        FROM meeting_types 
        WHERE is_active = TRUE 
        LIMIT 3
      `);

      for (const meetingType of meetingTypes) {
        try {
          const response = await axios.post(`${API_BASE_URL}/hierarchical-meetings/invitation-preview`, {
            meeting_type_id: meetingType.type_id,
            hierarchy_level: meetingType.hierarchy_level
          });

          if (response.status === 200 && response.data.success) {
            const data = response.data.data;
            console.log(`✅ ${meetingType.type_name} (${meetingType.type_code}): ${data.total_invitations} invitations`);
            console.log(`   - Required: ${data.summary.required}`);
            console.log(`   - Optional: ${data.summary.optional}`);
            console.log(`   - With voting rights: ${data.summary.total_with_voting_rights}`);
            
            this.testResults.invitations.push(`${meetingType.type_name}: ${data.total_invitations} invitations`);
          } else {
            console.error(`❌ ${meetingType.type_name}: Invalid response`);
            this.testResults.invitations.push(`${meetingType.type_name}: FAILED`);
          }
        } catch (error) {
          console.error(`❌ ${meetingType.type_name}: ${error.message}`);
          this.testResults.invitations.push(`${meetingType.type_name}: ERROR - ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to test invitation preview:', error.message);
      this.testResults.errors.push(`Invitation preview test: ${error.message}`);
    }
  }

  async testMeetingCreation() {
    console.log('\n🔍 Testing Meeting Creation...');
    
    try {
      // Get a meeting type for testing
      const [meetingTypes] = await this.connection.execute(`
        SELECT type_id, type_name, hierarchy_level 
        FROM meeting_types 
        WHERE is_active = TRUE AND type_code = 'branch_meeting'
        LIMIT 1
      `);

      if (meetingTypes.length === 0) {
        console.error('❌ No suitable meeting type found for testing');
        return;
      }

      const meetingType = meetingTypes[0];
      const testMeetingData = {
        meeting_title: `Test ${meetingType.type_name} - ${new Date().toISOString()}`,
        meeting_type_id: meetingType.type_id,
        hierarchy_level: meetingType.hierarchy_level,
        meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        meeting_time: '10:00',
        duration_minutes: 120,
        location: 'Test Location',
        meeting_platform: 'In-Person',
        description: 'Test meeting created by automated test',
        objectives: 'Test the hierarchical meeting creation system',
        quorum_required: 5,
        auto_send_invitations: false // Don't send actual invitations during test
      };

      const response = await axios.post(`${API_BASE_URL}/hierarchical-meetings`, testMeetingData);

      if (response.status === 201 && response.data.success) {
        const meetingId = response.data.data.meeting.meeting_id;
        console.log(`✅ Test meeting created successfully (ID: ${meetingId})`);
        this.testResults.api.push(`Meeting creation: OK (ID: ${meetingId})`);

        // Clean up - delete the test meeting
        try {
          await this.connection.execute('DELETE FROM meetings WHERE meeting_id = ?', [meetingId]);
          console.log(`✅ Test meeting cleaned up`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to clean up test meeting: ${cleanupError.message}`);
        }
      } else {
        console.error('❌ Meeting creation failed: Invalid response');
        this.testResults.api.push('Meeting creation: FAILED - Invalid response');
      }
    } catch (error) {
      console.error('❌ Meeting creation test failed:', error.message);
      this.testResults.api.push(`Meeting creation: FAILED - ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📋 TEST REPORT');
    console.log('='.repeat(50));
    
    console.log('\n🗄️ Database Tests:');
    this.testResults.database.forEach(result => console.log(`   ${result}`));
    
    console.log('\n🌐 API Tests:');
    this.testResults.api.forEach(result => console.log(`   ${result}`));
    
    console.log('\n📧 Invitation Tests:');
    this.testResults.invitations.forEach(result => console.log(`   ${result}`));
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach(error => console.log(`   ${error}`));
    }

    const totalTests = this.testResults.database.length + this.testResults.api.length + this.testResults.invitations.length;
    const failedTests = this.testResults.errors.length + 
      this.testResults.database.filter(r => r.includes('FAILED')).length +
      this.testResults.api.filter(r => r.includes('FAILED')).length +
      this.testResults.invitations.filter(r => r.includes('FAILED')).length;
    
    console.log('\n📊 Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalTests - failedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${Math.round(((totalTests - failedTests) / totalTests) * 100)}%`);
  }

  async runAllTests() {
    console.log('🚀 Starting Hierarchical Meeting Management System Tests...');
    
    const connected = await this.connect();
    if (!connected) {
      console.error('❌ Cannot proceed without database connection');
      return;
    }

    try {
      await this.testDatabaseSchema();
      await this.testMeetingTypes();
      await this.testOrganizationalRoles();
      await this.testAPIEndpoints();
      await this.testInvitationPreview();
      await this.testMeetingCreation();
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      this.testResults.errors.push(`Test execution: ${error.message}`);
    } finally {
      await this.disconnect();
      this.generateReport();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new HierarchicalMeetingSystemTest();
  tester.runAllTests().catch(console.error);
}

module.exports = HierarchicalMeetingSystemTest;
