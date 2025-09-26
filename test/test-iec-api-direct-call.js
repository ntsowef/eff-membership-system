/**
 * Direct IEC API Test - Print Municipality IDs from Provincial ID
 * Tests the real IEC API by making direct calls to verify data
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

class IECAPITester {
  constructor() {
    this.apiUrl = process.env.IEC_API_URL || 'https://api.iec.org.za';
    this.username = process.env.IEC_API_USERNAME;
    this.password = process.env.IEC_API_PASSWORD;
    this.timeout = parseInt(process.env.IEC_API_TIMEOUT || '30000', 10);
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
      console.log('🔐 Getting IEC API access token...');
      
      const response = await axios.post(`${this.apiUrl}/token`, new URLSearchParams({
        grant_type: 'password',
        username: this.username,
        password: this.password
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: this.timeout
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes
        console.log('✅ Successfully obtained access token');
        return this.accessToken;
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('❌ Failed to get IEC API access token:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Fetch municipalities from IEC API for a specific province
   */
  async fetchMunicipalitiesFromIEC(electoralEventId, provinceId) {
    try {
      const token = await this.getAccessToken();
      
      console.log(`🏛️ Fetching municipalities for Province ID ${provinceId} from IEC API...`);
      console.log(`📡 Endpoint: GET ${this.apiUrl}/api/Delimitation/ElectoralEventID/${electoralEventId}/ProvinceID/${provinceId}`);
      
      const response = await axios.get(
        `${this.apiUrl}/api/Delimitation/ElectoralEventID/${electoralEventId}/ProvinceID/${provinceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      console.log(`✅ API Response Status: ${response.status}`);
      console.log(`📊 Retrieved ${response.data?.length || 0} municipalities from IEC API`);
      
      return response.data || [];
      
    } catch (error) {
      console.error(`❌ Failed to fetch municipalities from IEC API:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Fetch wards from IEC API for a specific municipality
   */
  async fetchWardsFromIEC(electoralEventId, provinceId, municipalityId) {
    try {
      const token = await this.getAccessToken();
      
      console.log(`🗳️ Fetching wards for Municipality ID ${municipalityId} from IEC API...`);
      console.log(`📡 Endpoint: GET ${this.apiUrl}/api/Delimitation/ElectoralEventID/${electoralEventId}/ProvinceID/${provinceId}/MunicipalityID/${municipalityId}`);
      
      const response = await axios.get(
        `${this.apiUrl}/api/Delimitation/ElectoralEventID/${electoralEventId}/ProvinceID/${provinceId}/MunicipalityID/${municipalityId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      console.log(`✅ API Response Status: ${response.status}`);
      console.log(`📊 Retrieved ${response.data?.length || 0} wards from IEC API`);
      
      return response.data || [];
      
    } catch (error) {
      console.error(`❌ Failed to fetch wards from IEC API:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}

async function testDirectIECAPICalls() {
  try {
    console.log('🧪 Direct IEC API Test - Municipality IDs from Provincial ID\n');

    // Configuration check
    console.log('📋 IEC API Configuration:');
    console.log(`- API URL: ${process.env.IEC_API_URL || 'https://api.iec.org.za'}`);
    console.log(`- Username: ${process.env.IEC_API_USERNAME ? '***configured***' : '❌ NOT SET'}`);
    console.log(`- Password: ${process.env.IEC_API_PASSWORD ? '***configured***' : '❌ NOT SET'}`);
    console.log(`- Timeout: ${process.env.IEC_API_TIMEOUT || '30000'}ms\n`);

    if (!process.env.IEC_API_USERNAME || !process.env.IEC_API_PASSWORD) {
      console.error('❌ IEC API credentials not configured. Please set IEC_API_USERNAME and IEC_API_PASSWORD in .env file');
      return;
    }

    const tester = new IECAPITester();

    // Test 1: Eastern Cape (Province ID = 1)
    console.log('1️⃣ Testing Eastern Cape (Province ID = 1)');
    console.log('=' .repeat(50));
    
    try {
      const ecMunicipalities = await tester.fetchMunicipalitiesFromIEC(1091, 1);
      
      if (ecMunicipalities && ecMunicipalities.length > 0) {
        console.log(`\n📋 Eastern Cape Municipalities (${ecMunicipalities.length} total):`);
        console.log('-'.repeat(80));
        
        ecMunicipalities.forEach((mun, index) => {
          console.log(`${(index + 1).toString().padStart(2, '0')}. Municipality ID: ${mun.MunicipalityID} | Name: ${mun.MunicipalityName}`);
          if (mun.MunicipalityCode) {
            console.log(`    Code: ${mun.MunicipalityCode}`);
          }
        });

        // Test ward data for first municipality
        if (ecMunicipalities.length > 0) {
          const firstMun = ecMunicipalities[0];
          console.log(`\n2️⃣ Testing Ward Data for ${firstMun.MunicipalityName} (ID: ${firstMun.MunicipalityID})`);
          console.log('=' .repeat(50));
          
          try {
            const wards = await tester.fetchWardsFromIEC(1091, 1, firstMun.MunicipalityID);
            
            if (wards && wards.length > 0) {
              console.log(`\n📋 Wards for ${firstMun.MunicipalityName} (${wards.length} total):`);
              console.log('-'.repeat(80));
              
              wards.slice(0, 10).forEach((ward, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. Ward ID: ${ward.WardID} | Number: ${ward.WardNumber} | Name: ${ward.WardName}`);
              });
              
              if (wards.length > 10) {
                console.log(`... and ${wards.length - 10} more wards`);
              }
            } else {
              console.log('❌ No ward data returned from API');
            }
          } catch (wardError) {
            console.error('❌ Failed to fetch ward data:', wardError.message);
          }
        }

      } else {
        console.log('❌ No municipality data returned from API');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch Eastern Cape municipalities:', error.message);
    }

    // Test 2: Verify other provinces work
    console.log('\n3️⃣ Testing Other Provinces (Sample)');
    console.log('=' .repeat(50));
    
    const provinceTests = [
      { id: 2, name: 'Free State' },
      { id: 3, name: 'Gauteng' },
      { id: 9, name: 'Western Cape' }
    ];

    for (const province of provinceTests) {
      try {
        console.log(`\n🌍 Testing ${province.name} (Province ID = ${province.id})...`);
        const municipalities = await tester.fetchMunicipalitiesFromIEC(1091, province.id);
        console.log(`✅ ${province.name}: ${municipalities?.length || 0} municipalities found`);
        
        if (municipalities && municipalities.length > 0) {
          console.log(`   Sample: ${municipalities[0].MunicipalityName} (ID: ${municipalities[0].MunicipalityID})`);
        }
      } catch (error) {
        console.error(`❌ ${province.name} failed:`, error.message);
      }
    }

    console.log('\n✅ Direct IEC API Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDirectIECAPICalls();
