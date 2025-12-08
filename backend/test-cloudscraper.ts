/**
 * Test CloudScraper Integration with IEC API
 * 
 * This script tests that CloudScraper can successfully bypass Cloudflare
 * and authenticate with the IEC API.
 */

import cloudscraper from 'cloudscraper';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface IECTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface IECVoterResponse {
  Id: string;
  VoterStatus: string;
  VoterStatusID: number;
  bRegistered: boolean;
  VotingStation?: any;
  VoterId: number;
}

class CloudScraperTest {
  private scraper: any;
  private accessToken: string | null = null;

  constructor() {
    // Use cloudscraper directly (it's already configured)
    this.scraper = cloudscraper;
    console.log('✅ CloudScraper initialized (Chrome/Windows profile)');
  }

  /**
   * Test 1: Get OAuth2 Token (Matching Python Implementation)
   */
  async testGetToken(): Promise<boolean> {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Get OAuth2 Token (Bypass Cloudflare)');
    console.log('='.repeat(80));

    try {
      const username = process.env.IEC_USERNAME || 'IECWebAPIPartyEFF';
      const password = process.env.IEC_PASSWORD || '85316416dc5b498586ed519e670931e9';

      console.log('🔑 Authenticating with IEC API...');
      console.log(`   Username: ${username}`);

      const startTime = Date.now();

      // Matching Python: scraper.post(token_url, data=token_data, timeout=60)
      const response = await this.scraper.post({
        uri: 'https://api.elections.org.za/token',
        form: {
          grant_type: 'password',
          username: username,
          password: password
        },
        json: true,
        timeout: 60000, // 60 seconds (matching Python timeout=60)
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        cloudflareTimeout: 60000,
        cloudflareMaxTimeout: 60000
      }) as IECTokenResponse;

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.accessToken = response.access_token;

      console.log('✅ Token obtained successfully!');
      console.log(`   Token Type: ${response.token_type}`);
      console.log(`   Expires In: ${response.expires_in} seconds`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Token (first 50 chars): ${this.accessToken.substring(0, 50)}...`);

      return true;
    } catch (error: any) {
      console.error('❌ Failed to get token:', error.message);
      if (error.statusCode) {
        console.error(`   Status Code: ${error.statusCode}`);
      }
      if (error.error) {
        console.error('   Error Details:', error.error);
      }
      return false;
    }
  }

  /**
   * Test 2: Verify Voter (Matching Python Implementation)
   */
  async testVerifyVoter(idNumber: string): Promise<boolean> {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Verify Voter (Bypass Cloudflare)');
    console.log('='.repeat(80));

    if (!this.accessToken) {
      console.error('❌ No access token available. Run testGetToken() first.');
      return false;
    }

    try {
      console.log(`🔍 Checking voter registration for ID: ${idNumber}`);

      const startTime = Date.now();

      // Matching Python: response = scraper.get(voter_url, headers=headers, timeout=60)
      // Python URL: f"https://api.elections.org.za/api/Voters/IDNumber/{id_number}"
      const response = await this.scraper.get({
        uri: `https://api.elections.org.za/api/Voters/IDNumber/${idNumber}`,
        json: true,
        timeout: 60000, // 60 seconds (matching Python timeout=60)
        headers: {
          'Authorization': `Bearer ${this.accessToken}`, // Capital 'B' (matching Python)
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        cloudflareTimeout: 60000,
        cloudflareMaxTimeout: 60000
      }) as IECVoterResponse;

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('✅ Voter verification successful!');
      console.log(`   ID Number: ${response.Id}`);
      console.log(`   Registered: ${response.bRegistered ? 'Yes' : 'No'}`);
      console.log(`   Voter Status: ${response.VoterStatus}`);
      console.log(`   Duration: ${duration}ms`);

      if (response.bRegistered && response.VotingStation) {
        console.log(`   Voting Station: ${response.VotingStation.Name}`);
        console.log(`   Province: ${response.VotingStation.Delimitation.Province}`);
        console.log(`   Municipality: ${response.VotingStation.Delimitation.Municipality}`);
        console.log(`   Ward ID: ${response.VotingStation.Delimitation.WardID}`);
        console.log(`   VD Number: ${response.VotingStation.Delimitation.VDNumber}`);
      }

      return true;
    } catch (error: any) {
      console.error('❌ Failed to verify voter:', error.message);
      if (error.statusCode === 404) {
        console.log('ℹ️  Voter not found in IEC database (this is normal for invalid IDs)');
        return true; // Not an error, just not found
      }
      if (error.statusCode) {
        console.error(`   Status Code: ${error.statusCode}`);
      }
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 CLOUDSCRAPER INTEGRATION TESTS');
    console.log('='.repeat(80));

    const results: { test: string; passed: boolean }[] = [];

    // Test 1: Get Token
    const test1 = await this.testGetToken();
    results.push({ test: 'Get OAuth2 Token', passed: test1 });

    if (test1) {
      // Test 2: Verify Single Voter
      const test2 = await this.testVerifyVoter('9001010000000'); // Example ID
      results.push({ test: 'Verify Single Voter', passed: test2 });
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
    });

    const allPassed = results.every(r => r.passed);
    console.log('\n' + '='.repeat(80));
    console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
  }
}

// Run tests
const test = new CloudScraperTest();
test.runAllTests()
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });

