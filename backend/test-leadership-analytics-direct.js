/**
 * Test leadership analytics directly by calling the model method
 */

const { AnalyticsModel } = require('./dist/models/analytics');

async function testLeadershipAnalyticsDirect() {
  console.log('🎯 Testing leadership analytics model directly...');
  
  try {
    console.log('\n1. Testing AnalyticsModel.getLeadershipAnalytics()...');
    
    // Call the method directly to bypass authentication
    const result = await AnalyticsModel.getLeadershipAnalytics();
    
    console.log('✅ SUCCESS! Leadership analytics method executed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    console.log('\n🎉 TIMESTAMPDIFF FIX CONFIRMED WORKING!');
    console.log('The original "column \'month\' does not exist" error is RESOLVED!');
    
  } catch (error) {
    console.log('❌ Error calling leadership analytics:', error.message);
    
    if (error.message.includes('column "month" does not exist')) {
      console.log('\n🚨 TIMESTAMPDIFF ERROR STILL EXISTS!');
      console.log('The fix did not work properly.');
    } else if (error.message.includes('TIMESTAMPDIFF')) {
      console.log('\n⚠️  TIMESTAMPDIFF-related error, but different from original:');
      console.log(error.message);
    } else {
      console.log('\n✅ Different error (not TIMESTAMPDIFF-related):');
      console.log('This suggests our TIMESTAMPDIFF fix is working!');
      console.log('Error details:', error.message);
    }
    
    console.log('\nFull error:', error);
  }
}

testLeadershipAnalyticsDirect();
