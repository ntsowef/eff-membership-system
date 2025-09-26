/**
 * IEC Electoral Events API Analysis Script
 * This script tests the IEC API ElectoralEvent endpoints to understand the structure
 * and relationship between ElectoralEventTypeID and ElectoralEventID
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

class IECElectoralEventsAnalyzer {
  constructor() {
    this.API_BASE_URL = 'https://api.elections.org.za/';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get access token for IEC API
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting IEC API access token...');
      
      const response = await axios.post(`${this.API_BASE_URL}token`, new URLSearchParams({
        grant_type: 'password',
        username: process.env.IEC_API_USERNAME,
        password: process.env.IEC_API_PASSWORD
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes
        console.log('✅ Access token obtained successfully');
        return this.accessToken;
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('❌ Failed to get access token:', error.message);
      throw error;
    }
  }

  /**
   * Make authenticated API call
   */
  async makeApiCall(endpoint) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${this.API_BASE_URL}${endpoint}`;
      
      console.log(`📡 Making API call to: ${endpoint}`);
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `bearer ${accessToken}`
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error(`❌ API call failed for ${endpoint}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Analyze ElectoralEvent endpoints
   */
  async analyzeElectoralEvents() {
    console.log('\n🔍 ANALYZING IEC ELECTORAL EVENTS API');
    console.log('=====================================\n');

    try {
      // 1. Get all Electoral Event Types
      console.log('1️⃣ Fetching all Electoral Event Types...');
      const eventTypes = await this.makeApiCall('api/v1/ElectoralEvent');
      
      console.log('📊 Electoral Event Types Response:');
      console.log(JSON.stringify(eventTypes, null, 2));
      
      if (Array.isArray(eventTypes)) {
        console.log(`\n📈 Found ${eventTypes.length} Electoral Event Types:`);
        eventTypes.forEach((eventType, index) => {
          console.log(`   ${index + 1}. ${eventType.ElectoralEventTypeName || eventType.Name || 'Unknown'} (ID: ${eventType.ElectoralEventTypeID || eventType.ID || 'Unknown'})`);
        });

        // Find Local Government Elections (includes Municipal Elections)
        const localGovElections = eventTypes.filter(et =>
          (et.Description || et.ElectoralEventTypeName || et.Name || '').toLowerCase().includes('local') ||
          (et.Description || et.ElectoralEventTypeName || et.Name || '').toLowerCase().includes('municipal')
        );

        if (localGovElections.length > 0) {
          console.log('\n🏛️ Local Government Elections Found:');
          localGovElections.forEach(me => {
            console.log(`   - ${me.Description || me.ElectoralEventTypeName || me.Name} (ID: ${me.ID || me.ElectoralEventTypeID})`);
          });

          // 2. Get specific events for Local Government Elections
          const municipalEventTypeId = localGovElections[0].ID || localGovElections[0].ElectoralEventTypeID;
          if (municipalEventTypeId) {
            console.log(`\n2️⃣ Fetching events for Local Government Elections (Type ID: ${municipalEventTypeId})...`);
            
            try {
              const municipalEvents = await this.makeApiCall(`api/v1/ElectoralEvent?ElectoralEventTypeID=${municipalEventTypeId}`);

              console.log('📊 Local Government Electoral Events Response:');
              console.log(JSON.stringify(municipalEvents, null, 2));

              if (Array.isArray(municipalEvents)) {
                console.log(`\n📈 Found ${municipalEvents.length} Local Government Electoral Events:`);
                municipalEvents.forEach((event, index) => {
                  console.log(`   ${index + 1}. ${event.Description || event.ElectoralEventName || event.Name || 'Unknown'} (Event ID: ${event.ID || event.ElectoralEventID || 'Unknown'})`);
                  if (event.ElectionDate || event.Date || event.IsActive !== undefined) {
                    console.log(`      Date: ${event.ElectionDate || event.Date || 'N/A'}, Active: ${event.IsActive || 'N/A'}`);
                  }
                });
              }
            } catch (error) {
              console.log('⚠️ Could not fetch specific local government events:', error.message);
            }
          }
        } else {
          console.log('\n⚠️ No Local Government Elections found in event types');
        }

      } else {
        console.log('⚠️ Unexpected response format for Electoral Event Types');
      }

      // 3. Test with ParentEventID parameter
      console.log('\n3️⃣ Testing ParentEventID parameter...');
      try {
        const parentEvents = await this.makeApiCall('api/v1/ElectoralEvent?ElectoralEventTypeID=1&ParentEventID=0');
        console.log('📊 Parent Events Response:');
        console.log(JSON.stringify(parentEvents, null, 2));
      } catch (error) {
        console.log('⚠️ ParentEventID test failed:', error.message);
      }

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
    }
  }

  /**
   * Test other related endpoints
   */
  async testRelatedEndpoints() {
    console.log('\n🔍 TESTING RELATED ENDPOINTS');
    console.log('=============================\n');

    const testEndpoints = [
      'api/v1/Delimitation?ElectoralEventID=1',
      'api/v1/ContestingParties?ElectoralEventID=1',
      'api/v1/VotingStations?ElectoralEventID=1'
    ];

    for (const endpoint of testEndpoints) {
      try {
        console.log(`📡 Testing: ${endpoint}`);
        const response = await this.makeApiCall(endpoint);
        console.log(`✅ Success - Response type: ${Array.isArray(response) ? 'Array' : typeof response}`);
        if (Array.isArray(response)) {
          console.log(`   Items count: ${response.length}`);
          if (response.length > 0) {
            console.log(`   Sample keys: ${Object.keys(response[0]).join(', ')}`);
          }
        }
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
      console.log('');
    }
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('\n📋 ANALYSIS SUMMARY');
    console.log('==================');
    console.log('');
    console.log('Key Findings:');
    console.log('1. ElectoralEventTypeID identifies the type of election (Municipal, National, etc.)');
    console.log('2. ElectoralEventID identifies specific election instances');
    console.log('3. ParentEventID creates hierarchical relationships between events');
    console.log('4. Municipal Elections can be filtered using ElectoralEventTypeID');
    console.log('');
    console.log('Recommended Database Structure:');
    console.log('- iec_electoral_event_types (stores event types like Municipal Elections)');
    console.log('- iec_electoral_events (stores specific election instances)');
    console.log('- Relationship: event_types.id -> events.electoral_event_type_id');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Create database tables based on API response structure');
    console.log('2. Implement service to sync data from IEC API');
    console.log('3. Add caching layer for performance');
    console.log('4. Integrate with existing voter verification service');
  }

  /**
   * Run complete analysis
   */
  async run() {
    try {
      await this.analyzeElectoralEvents();
      await this.testRelatedEndpoints();
      this.generateReport();
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new IECElectoralEventsAnalyzer();
  analyzer.run().then(() => {
    console.log('\n✅ Analysis completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = IECElectoralEventsAnalyzer;
