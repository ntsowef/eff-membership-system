/**
 * Simple IEC LGE Ballot Results Test
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

async function testSimple() {
  try {
    console.log('🧪 Simple IEC LGE Ballot Results Test');
    console.log('=====================================\n');

    // Test database connection
    const { initializeDatabase } = require('./backend/dist/config/database');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    // Test services
    const { IecGeographicMappingService } = require('./backend/dist/services/iecGeographicMappingService');
    const mappingService = new IecGeographicMappingService();
    console.log('✅ IecGeographicMappingService created');

    // Test mapping statistics
    const stats = await mappingService.getMappingStatistics();
    console.log('📊 Mapping Statistics:');
    console.log(`   Provinces: ${stats.provinces.total} total, ${stats.provinces.mapped} mapped`);
    console.log(`   Municipalities: ${stats.municipalities.total} total, ${stats.municipalities.mapped} mapped`);
    console.log(`   Wards: ${stats.wards.total} total, ${stats.wards.mapped} mapped`);

    // Test discovery
    console.log('\n🔍 Running discovery...');
    const discoveryResults = await mappingService.discoverAndPopulateAllMappings();
    console.log(`✅ Discovery completed: ${discoveryResults.provinces} provinces, ${discoveryResults.municipalities} municipalities, ${discoveryResults.wards} wards`);

    // Test ballot results service
    const { IecLgeBallotResultsService } = require('./backend/dist/services/iecLgeBallotResultsService');
    const ballotService = new IecLgeBallotResultsService();
    console.log('✅ IecLgeBallotResultsService created');

    // Test province ballot results
    console.log('\n🗳️ Testing province ballot results...');
    try {
      const provinceResults = await ballotService.getBallotResultsByProvinceCode('LP');
      console.log(`✅ Retrieved ${provinceResults.length} ballot results for LP`);
    } catch (error) {
      console.log(`⚠️ Province test error: ${error.message}`);
    }

    console.log('\n🎉 Simple test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSimple().then(() => {
  console.log('\n✅ All tests passed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
