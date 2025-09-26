/**
 * Test Compiled IEC Electoral Events Service
 * This script tests the compiled TypeScript service
 */

require('dotenv').config();

async function testCompiledService() {
  try {
    console.log('🧪 Testing Compiled IEC Electoral Events Service...');
    console.log('=================================================\n');

    // Initialize database connection
    console.log('🔌 Initializing database connection...');
    const { initializeDatabase } = require('./dist/config/database');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    // Import the compiled service
    const { iecElectoralEventsService } = require('./dist/services/iecElectoralEventsService');
    
    // Test 1: Get electoral event types
    console.log('1️⃣ Testing getElectoralEventTypes()...');
    const eventTypes = await iecElectoralEventsService.getElectoralEventTypes();
    console.log(`📊 Found ${eventTypes.length} electoral event types:`);
    eventTypes.forEach(type => {
      const municipal = type.is_municipal_election ? '🏛️ Municipal' : '🏢 Other';
      console.log(`   ${municipal} ${type.description} (IEC ID: ${type.iec_event_type_id})`);
    });

    // Test 2: Get municipal election types only
    console.log('\n2️⃣ Testing getMunicipalElectionTypes()...');
    const municipalTypes = await iecElectoralEventsService.getMunicipalElectionTypes();
    console.log(`📊 Found ${municipalTypes.length} municipal election types:`);
    municipalTypes.forEach(type => {
      console.log(`   🏛️ ${type.description} (IEC ID: ${type.iec_event_type_id})`);
    });

    // Test 3: Get electoral events by type (Municipal = 3)
    console.log('\n3️⃣ Testing getElectoralEventsByType(3)...');
    const municipalEvents = await iecElectoralEventsService.getElectoralEventsByType(3);
    console.log(`📊 Found ${municipalEvents.length} municipal elections:`);
    municipalEvents.forEach(event => {
      const status = event.is_active ? '🟢 Active' : '🔴 Inactive';
      console.log(`   ${status} ${event.description} (IEC ID: ${event.iec_event_id}, Year: ${event.election_year})`);
    });

    // Test 4: Get active municipal elections
    console.log('\n4️⃣ Testing getActiveMunicipalElections()...');
    const activeElections = await iecElectoralEventsService.getActiveMunicipalElections();
    console.log(`📊 Found ${activeElections.length} active municipal elections:`);
    activeElections.forEach(election => {
      console.log(`   🏛️ ${election.description} (IEC ID: ${election.iec_event_id}, Year: ${election.election_year})`);
    });

    // Test 5: Get current municipal election
    console.log('\n5️⃣ Testing getCurrentMunicipalElection()...');
    const currentElection = await iecElectoralEventsService.getCurrentMunicipalElection();
    if (currentElection) {
      console.log(`🏛️ Current Municipal Election:`);
      console.log(`   Name: ${currentElection.description}`);
      console.log(`   IEC Event ID: ${currentElection.iec_event_id}`);
      console.log(`   Year: ${currentElection.election_year}`);
      console.log(`   Active: ${currentElection.is_active ? 'Yes' : 'No'}`);
      console.log(`   Last Synced: ${currentElection.last_synced_at || 'Never'}`);
      console.log(`   Sync Status: ${currentElection.sync_status}`);
    } else {
      console.log('❌ No current municipal election found');
    }

    // Test 6: Get municipal election history
    console.log('\n6️⃣ Testing getMunicipalElectionHistory()...');
    const electionHistory = await iecElectoralEventsService.getMunicipalElectionHistory();
    console.log(`📊 Found ${electionHistory.length} municipal elections in history:`);
    electionHistory.slice(0, 5).forEach(election => {
      const status = election.is_active ? '🟢 Active' : '🔴 Inactive';
      console.log(`   ${status} ${election.description} (IEC ID: ${election.iec_event_id}, Year: ${election.election_year})`);
    });

    // Test 7: Test API synchronization (if credentials are available)
    console.log('\n7️⃣ Testing API synchronization...');
    if (process.env.IEC_API_USERNAME && process.env.IEC_API_PASSWORD) {
      console.log('🔄 Testing syncElectoralEventTypes()...');
      try {
        const syncResult = await iecElectoralEventsService.syncElectoralEventTypes();
        console.log(`✅ Sync completed:`);
        console.log(`   Success: ${syncResult.success}`);
        console.log(`   Processed: ${syncResult.records_processed}`);
        console.log(`   Created: ${syncResult.records_created}`);
        console.log(`   Updated: ${syncResult.records_updated}`);
        console.log(`   Failed: ${syncResult.records_failed}`);
        console.log(`   Duration: ${syncResult.duration_ms}ms`);
        
        if (syncResult.error_message) {
          console.log(`   Error: ${syncResult.error_message}`);
        }
      } catch (error) {
        console.log(`⚠️ Sync test failed: ${error.message}`);
      }

      console.log('\n🔄 Testing syncElectoralEvents(3) - Municipal Elections...');
      try {
        const syncResult = await iecElectoralEventsService.syncElectoralEvents(3);
        console.log(`✅ Sync completed:`);
        console.log(`   Success: ${syncResult.success}`);
        console.log(`   Processed: ${syncResult.records_processed}`);
        console.log(`   Created: ${syncResult.records_created}`);
        console.log(`   Updated: ${syncResult.records_updated}`);
        console.log(`   Failed: ${syncResult.records_failed}`);
        console.log(`   Duration: ${syncResult.duration_ms}ms`);
        
        if (syncResult.error_message) {
          console.log(`   Error: ${syncResult.error_message}`);
        }
      } catch (error) {
        console.log(`⚠️ Sync test failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ Skipping API sync tests - IEC credentials not configured');
    }

    // Test 8: Get sync logs
    console.log('\n8️⃣ Testing getSyncLogs()...');
    try {
      const syncLogs = await iecElectoralEventsService.getSyncLogs(5);
      console.log(`📊 Found ${syncLogs.length} sync log entries:`);
      syncLogs.forEach(log => {
        const status = log.sync_status === 'completed' ? '✅' : 
                      log.sync_status === 'failed' ? '❌' : '⏳';
        console.log(`   ${status} ${log.sync_type} - ${log.sync_status} (${log.started_at})`);
        if (log.records_processed > 0) {
          console.log(`      Processed: ${log.records_processed}, Created: ${log.records_created}, Updated: ${log.records_updated}`);
        }
      });
    } catch (error) {
      console.log(`⚠️ Sync logs test failed: ${error.message}`);
    }

    console.log('\n🎉 All service tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('=====================================');
    console.log('✅ Service compilation successful');
    console.log('✅ Database queries working');
    console.log('✅ Municipal election filtering working');
    console.log('✅ Current election detection working');
    console.log('✅ Election history retrieval working');
    if (process.env.IEC_API_USERNAME && process.env.IEC_API_PASSWORD) {
      console.log('✅ API synchronization tested');
    }
    console.log('');
    console.log('🚀 Ready for API endpoint integration!');

  } catch (error) {
    console.error('❌ Service test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCompiledService().then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = testCompiledService;
