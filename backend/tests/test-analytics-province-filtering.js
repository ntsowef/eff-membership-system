const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test credentials
const NATIONAL_ADMIN = {
  email: 'admin@membership.org',
  password: 'Admin123!'
};

const PROVINCIAL_ADMIN = {
  email: 'gauteng.admin@membership.org',
  password: 'GautengAdmin2024!'
};

async function login(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
    return response.data.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getAnalytics(token, description) {
  try {
    console.log(`\n=== ${description} ===`);
    
    const response = await axios.get(`${BASE_URL}/analytics/membership`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const analytics = response.data.data.analytics;
    
    console.log('📊 Age Distribution:');
    if (analytics.age_distribution && analytics.age_distribution.length > 0) {
      analytics.age_distribution.forEach(item => {
        console.log(`  ${item.age_group}: ${item.member_count} (${item.percentage}%)`);
      });
    } else {
      console.log('  No age distribution data');
    }

    console.log('\n👥 Gender Distribution:');
    if (analytics.gender_distribution && analytics.gender_distribution.length > 0) {
      analytics.gender_distribution.forEach(item => {
        console.log(`  ${item.gender}: ${item.member_count} (${item.percentage}%)`);
      });
    } else {
      console.log('  No gender distribution data');
    }

    console.log(`\n📈 Total Members: ${analytics.total_members}`);
    
    return analytics;
  } catch (error) {
    console.error('Analytics request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testProvinceFiltering() {
  try {
    console.log('🧪 Testing Province-Based Analytics Filtering...\n');

    // Test National Admin (should see all data)
    console.log('🔐 Logging in as National Admin...');
    const nationalToken = await login(NATIONAL_ADMIN);
    const nationalAnalytics = await getAnalytics(nationalToken, 'National Admin Analytics (All Provinces)');

    // Test Provincial Admin (should see province-specific data)
    console.log('\n🔐 Logging in as Provincial Admin (Gauteng)...');
    const provincialToken = await login(PROVINCIAL_ADMIN);
    const provincialAnalytics = await getAnalytics(provincialToken, 'Provincial Admin Analytics (Gauteng Only)');

    // Compare results
    console.log('\n📊 COMPARISON RESULTS:');
    console.log('='.repeat(50));
    
    console.log(`National Total Members: ${nationalAnalytics.total_members}`);
    console.log(`Provincial Total Members: ${provincialAnalytics.total_members}`);
    
    if (provincialAnalytics.total_members < nationalAnalytics.total_members) {
      console.log('✅ SUCCESS: Provincial data is filtered (smaller than national)');
    } else if (provincialAnalytics.total_members === nationalAnalytics.total_members) {
      console.log('⚠️  WARNING: Provincial data equals national data (may indicate no filtering)');
    } else {
      console.log('❌ ERROR: Provincial data is larger than national data (unexpected)');
    }

    // Check age distribution differences
    const nationalAgeTotal = nationalAnalytics.age_distribution?.reduce((sum, item) => sum + item.member_count, 0) || 0;
    const provincialAgeTotal = provincialAnalytics.age_distribution?.reduce((sum, item) => sum + item.member_count, 0) || 0;
    
    console.log(`\nAge Distribution Totals:`);
    console.log(`National: ${nationalAgeTotal} members`);
    console.log(`Provincial: ${provincialAgeTotal} members`);
    
    if (provincialAgeTotal <= nationalAgeTotal && provincialAgeTotal > 0) {
      console.log('✅ SUCCESS: Age distribution filtering working correctly');
    } else {
      console.log('❌ ERROR: Age distribution filtering may not be working');
    }

    // Check gender distribution differences
    const nationalGenderTotal = nationalAnalytics.gender_distribution?.reduce((sum, item) => sum + item.member_count, 0) || 0;
    const provincialGenderTotal = provincialAnalytics.gender_distribution?.reduce((sum, item) => sum + item.member_count, 0) || 0;
    
    console.log(`\nGender Distribution Totals:`);
    console.log(`National: ${nationalGenderTotal} members`);
    console.log(`Provincial: ${provincialGenderTotal} members`);
    
    if (provincialGenderTotal <= nationalGenderTotal && provincialGenderTotal > 0) {
      console.log('✅ SUCCESS: Gender distribution filtering working correctly');
    } else {
      console.log('❌ ERROR: Gender distribution filtering may not be working');
    }

    console.log('\n🎯 TEST COMPLETED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProvinceFiltering();
