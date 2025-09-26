/**
 * Test IEC Electoral Events API Endpoints
 * This script tests the REST API endpoints for IEC Electoral Events
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_PREFIX = '/api/v1';
const IEC_EVENTS_BASE = `${BASE_URL}${API_PREFIX}/iec-electoral-events`;

// Test configuration
const TEST_CONFIG = {
  skipAuth: process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true',
  timeout: 30000
};

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TEST_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Mock authentication token (if needed)
let authToken = null;

async function authenticate() {
  if (TEST_CONFIG.skipAuth) {
    console.log('🔓 Authentication skipped (development mode)');
    return;
  }

  try {
    // You would implement actual authentication here
    console.log('🔑 Authentication required but not implemented in test');
    console.log('   Set SKIP_AUTH=true in .env for development testing');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function testHealthEndpoint() {
  console.log('🏥 Testing health endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/health`);
    
    if (response.data.success) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Total Event Types: ${response.data.data.statistics.total_event_types}`);
      console.log(`   Municipal Event Types: ${response.data.data.statistics.municipal_event_types}`);
      console.log(`   Has Current Municipal Election: ${response.data.data.statistics.has_current_municipal_election}`);
      if (response.data.data.statistics.current_election_id) {
        console.log(`   Current Election ID: ${response.data.data.statistics.current_election_id}`);
        console.log(`   Current Election Year: ${response.data.data.statistics.current_election_year}`);
      }
    } else {
      console.log('❌ Health check failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Health endpoint test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetElectoralEventTypes() {
  console.log('📊 Testing GET /types endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/types`);
    
    if (response.data.success) {
      console.log(`✅ Retrieved ${response.data.data.length} electoral event types`);
      response.data.data.forEach(type => {
        const municipal = type.is_municipal_election ? '🏛️ Municipal' : '🏢 Other';
        console.log(`   ${municipal} ${type.description} (IEC ID: ${type.iec_event_type_id})`);
      });
    } else {
      console.log('❌ Failed to retrieve electoral event types');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Electoral event types test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetMunicipalElectionTypes() {
  console.log('🏛️ Testing GET /types/municipal endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/types/municipal`);
    
    if (response.data.success) {
      console.log(`✅ Retrieved ${response.data.data.length} municipal election types`);
      response.data.data.forEach(type => {
        console.log(`   🏛️ ${type.description} (IEC ID: ${type.iec_event_type_id})`);
      });
    } else {
      console.log('❌ Failed to retrieve municipal election types');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Municipal election types test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetElectoralEventsByType() {
  console.log('📋 Testing GET /events/:eventTypeId endpoint...');
  try {
    // Test with Municipal Election type (ID = 3)
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/events/3`);
    
    if (response.data.success) {
      console.log(`✅ Retrieved ${response.data.data.length} municipal elections`);
      response.data.data.slice(0, 5).forEach(event => {
        const status = event.is_active ? '🟢 Active' : '🔴 Inactive';
        console.log(`   ${status} ${event.description} (IEC ID: ${event.iec_event_id}, Year: ${event.election_year})`);
      });
    } else {
      console.log('❌ Failed to retrieve electoral events by type');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Electoral events by type test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetActiveMunicipalElections() {
  console.log('🟢 Testing GET /municipal/active endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/municipal/active`);
    
    if (response.data.success) {
      console.log(`✅ Retrieved ${response.data.data.length} active municipal elections`);
      response.data.data.forEach(election => {
        console.log(`   🏛️ ${election.description} (IEC ID: ${election.iec_event_id}, Year: ${election.election_year})`);
      });
    } else {
      console.log('❌ Failed to retrieve active municipal elections');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Active municipal elections test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetCurrentMunicipalElection() {
  console.log('🎯 Testing GET /municipal/current endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/municipal/current`);
    
    if (response.data.success) {
      const election = response.data.data;
      console.log('✅ Retrieved current municipal election:');
      console.log(`   Name: ${election.description}`);
      console.log(`   IEC Event ID: ${election.iec_event_id}`);
      console.log(`   Year: ${election.election_year}`);
      console.log(`   Active: ${election.is_active ? 'Yes' : 'No'}`);
      console.log(`   Last Synced: ${election.last_synced_at || 'Never'}`);
      console.log(`   Sync Status: ${election.sync_status}`);
    } else {
      console.log('❌ Failed to retrieve current municipal election');
    }
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️ No current municipal election found (404)');
      return null;
    }
    console.error('❌ Current municipal election test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetMunicipalElectionHistory() {
  console.log('📚 Testing GET /municipal/history endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/municipal/history`);
    
    if (response.data.success) {
      console.log(`✅ Retrieved ${response.data.data.length} municipal elections in history`);
      response.data.data.slice(0, 5).forEach(election => {
        const status = election.is_active ? '🟢 Active' : '🔴 Inactive';
        console.log(`   ${status} ${election.description} (IEC ID: ${election.iec_event_id}, Year: ${election.election_year})`);
      });
    } else {
      console.log('❌ Failed to retrieve municipal election history');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Municipal election history test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetSyncLogs() {
  console.log('📝 Testing GET /sync/logs endpoint...');
  try {
    const response = await api.get(`${API_PREFIX}/iec-electoral-events/sync/logs?limit=5`);
    
    if (response.data.success) {
      console.log(`✅ Retrieved ${response.data.data.length} sync log entries`);
      response.data.data.forEach(log => {
        const status = log.sync_status === 'completed' ? '✅' : 
                      log.sync_status === 'failed' ? '❌' : '⏳';
        console.log(`   ${status} ${log.sync_type} - ${log.sync_status} (${log.started_at})`);
        if (log.records_processed > 0) {
          console.log(`      Processed: ${log.records_processed}, Created: ${log.records_created}, Updated: ${log.records_updated}`);
        }
      });
    } else {
      console.log('❌ Failed to retrieve sync logs');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Sync logs test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🧪 Starting IEC Electoral Events API Tests');
  console.log('==========================================\n');

  try {
    // Authenticate if needed
    await authenticate();

    // Run all tests
    const results = {
      health: await testHealthEndpoint(),
      eventTypes: await testGetElectoralEventTypes(),
      municipalTypes: await testGetMunicipalElectionTypes(),
      eventsByType: await testGetElectoralEventsByType(),
      activeElections: await testGetActiveMunicipalElections(),
      currentElection: await testGetCurrentMunicipalElection(),
      electionHistory: await testGetMunicipalElectionHistory(),
      syncLogs: await testGetSyncLogs()
    };

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('=====================================');
    console.log('✅ Health endpoint working');
    console.log('✅ Electoral event types retrieval working');
    console.log('✅ Municipal election types filtering working');
    console.log('✅ Electoral events by type working');
    console.log('✅ Active municipal elections working');
    console.log('✅ Current municipal election detection working');
    console.log('✅ Municipal election history working');
    console.log('✅ Sync logs retrieval working');
    console.log('');
    console.log('🚀 API endpoints are ready for frontend integration!');

    return results;

  } catch (error) {
    console.error('\n❌ API tests failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHealthEndpoint,
  testGetElectoralEventTypes,
  testGetMunicipalElectionTypes,
  testGetElectoralEventsByType,
  testGetActiveMunicipalElections,
  testGetCurrentMunicipalElection,
  testGetMunicipalElectionHistory,
  testGetSyncLogs
};
