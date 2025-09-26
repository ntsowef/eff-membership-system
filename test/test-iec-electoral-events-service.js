/**
 * Test IEC Electoral Events Service
 * This script tests the IEC Electoral Events Service functionality
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Import the compiled service (we'll need to compile TypeScript first)
async function testService() {
  try {
    console.log('🧪 Testing IEC Electoral Events Service...');
    console.log('=====================================\n');

    // For now, let's test the database directly since we need to compile TypeScript
    const mysql = require('mysql2/promise');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new'
    });

    console.log('✅ Database connection established');

    // Test 1: Check if tables exist and have data
    console.log('1️⃣ Testing database tables...');
    
    const [eventTypes] = await connection.execute(`
      SELECT * FROM iec_electoral_event_types ORDER BY iec_event_type_id
    `);
    
    console.log(`📊 Found ${eventTypes.length} electoral event types:`);
    eventTypes.forEach(type => {
      const municipal = type.is_municipal_election ? '🏛️ Municipal' : '🏢 Other';
      console.log(`   ${municipal} ${type.description} (IEC ID: ${type.iec_event_type_id})`);
    });

    const [events] = await connection.execute(`
      SELECT * FROM iec_electoral_events ORDER BY election_year DESC, iec_event_id DESC
    `);
    
    console.log(`\n📊 Found ${events.length} electoral events:`);
    events.slice(0, 5).forEach(event => {
      const status = event.is_active ? '🟢 Active' : '🔴 Inactive';
      console.log(`   ${status} ${event.description} (IEC ID: ${event.iec_event_id}, Year: ${event.election_year})`);
    });

    // Test 2: Test views
    console.log('\n2️⃣ Testing database views...');
    
    const [activeMunicipal] = await connection.execute(`
      SELECT * FROM active_municipal_elections
    `);
    
    console.log(`📊 Active Municipal Elections: ${activeMunicipal.length}`);
    activeMunicipal.forEach(election => {
      console.log(`   🏛️ ${election.description} (IEC ID: ${election.iec_event_id}, Year: ${election.election_year})`);
    });

    const [municipalHistory] = await connection.execute(`
      SELECT * FROM municipal_election_history LIMIT 5
    `);
    
    console.log(`\n📊 Municipal Election History (last 5):`);
    municipalHistory.forEach(election => {
      const status = election.is_active ? '🟢 Active' : '🔴 Inactive';
      console.log(`   ${status} ${election.description} (IEC ID: ${election.iec_event_id}, Year: ${election.election_year})`);
    });

    // Test 3: Test specific queries for Municipal Elections
    console.log('\n3️⃣ Testing Municipal Elections queries...');
    
    const [municipalTypes] = await connection.execute(`
      SELECT * FROM iec_electoral_event_types WHERE is_municipal_election = TRUE
    `);
    
    console.log(`📊 Municipal Election Types: ${municipalTypes.length}`);
    municipalTypes.forEach(type => {
      console.log(`   🏛️ ${type.description} (IEC Type ID: ${type.iec_event_type_id})`);
    });

    // Get events for Municipal Election type (ID = 3)
    const [municipalEvents] = await connection.execute(`
      SELECT * FROM iec_electoral_events 
      WHERE iec_event_type_id = 3 
      ORDER BY election_year DESC
    `);
    
    console.log(`\n📊 Municipal Elections (Type ID 3): ${municipalEvents.length}`);
    municipalEvents.forEach(event => {
      const status = event.is_active ? '🟢 Active' : '🔴 Inactive';
      console.log(`   ${status} ${event.description} (IEC Event ID: ${event.iec_event_id}, Year: ${event.election_year})`);
    });

    // Test 4: Test current active municipal election
    console.log('\n4️⃣ Testing current active municipal election...');
    
    const [currentElection] = await connection.execute(`
      SELECT iee.* FROM iec_electoral_events iee
      JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
      WHERE ieet.is_municipal_election = TRUE AND iee.is_active = TRUE
      ORDER BY iee.election_year DESC, iee.iec_event_id DESC
      LIMIT 1
    `);
    
    if (currentElection.length > 0) {
      const election = currentElection[0];
      console.log(`🏛️ Current Active Municipal Election:`);
      console.log(`   Name: ${election.description}`);
      console.log(`   IEC Event ID: ${election.iec_event_id}`);
      console.log(`   Year: ${election.election_year}`);
      console.log(`   Last Synced: ${election.last_synced_at || 'Never'}`);
      console.log(`   Sync Status: ${election.sync_status}`);
    } else {
      console.log('❌ No active municipal election found');
    }

    // Test 5: Show key information for integration
    console.log('\n5️⃣ Key Information for Integration...');
    console.log('=====================================');
    console.log('');
    console.log('🔑 Key IEC API Mappings:');
    console.log('   ElectoralEventTypeID = 3 → Local Government Election (Municipal)');
    console.log('   ElectoralEventID = 1091 → LOCAL GOVERNMENT ELECTION 2021 (Active)');
    console.log('');
    console.log('📊 Database Structure:');
    console.log('   iec_electoral_event_types → Stores election types (National, Provincial, Municipal, By-Election)');
    console.log('   iec_electoral_events → Stores specific election instances');
    console.log('   iec_electoral_event_delimitations → Geographic data (to be populated)');
    console.log('   iec_electoral_event_sync_logs → Synchronization audit trail');
    console.log('');
    console.log('🔍 Views Available:');
    console.log('   active_municipal_elections → Currently active municipal elections');
    console.log('   municipal_election_history → All municipal elections ordered by year');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Compile TypeScript service and test API integration');
    console.log('   2. Create REST API endpoints');
    console.log('   3. Integrate with voter verification service');
    console.log('   4. Set up automated synchronization');

    await connection.end();
    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Additional test for API integration (requires compilation)
async function testAPIIntegration() {
  console.log('\n🌐 Testing IEC API Integration...');
  console.log('==================================');
  
  try {
    // This would test the actual service after TypeScript compilation
    console.log('⚠️ API integration test requires TypeScript compilation');
    console.log('   Run: npm run build');
    console.log('   Then: node dist/test-service.js');
    
    // For now, let's test the raw API calls
    const axios = require('axios');
    
    console.log('🔑 Testing IEC API authentication...');
    
    const tokenResponse = await axios.post('https://api.elections.org.za/token', new URLSearchParams({
      grant_type: 'password',
      username: process.env.IEC_API_USERNAME,
      password: process.env.IEC_API_PASSWORD
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });

    if (tokenResponse.data.access_token) {
      console.log('✅ IEC API authentication successful');
      
      // Test fetching electoral event types
      const eventTypesResponse = await axios.get('https://api.elections.org.za/api/v1/ElectoralEvent', {
        headers: {
          'Authorization': `bearer ${tokenResponse.data.access_token}`
        },
        timeout: 30000
      });
      
      console.log(`📊 Fetched ${eventTypesResponse.data.length} electoral event types from API`);
      
      // Test fetching municipal elections (Type ID = 3)
      const municipalEventsResponse = await axios.get('https://api.elections.org.za/api/v1/ElectoralEvent?ElectoralEventTypeID=3', {
        headers: {
          'Authorization': `bearer ${tokenResponse.data.access_token}`
        },
        timeout: 30000
      });
      
      console.log(`📊 Fetched ${municipalEventsResponse.data.length} municipal elections from API`);
      console.log('✅ IEC API integration test successful');
      
    } else {
      console.log('❌ IEC API authentication failed');
    }
    
  } catch (error) {
    console.log('❌ IEC API integration test failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  testService()
    .then(() => testAPIIntegration())
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testService, testAPIIntegration };
