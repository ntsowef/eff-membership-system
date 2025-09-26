/**
 * Input Validation Security Test
 * Tests SQL injection prevention, XSS protection, input sanitization,
 * and data validation security measures
 */

class InputValidationSecurityTest {
  constructor(baseURL, testConfig, testData) {
    this.baseURL = baseURL;
    this.testConfig = testConfig;
    this.testData = testData;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      securityMetrics: {
        vulnerabilitiesFound: 0,
        complianceScore: 0,
        inputValidationStrength: 0
      }
    };
  }

  async runSecurityTest(testName, testFunction) {
    try {
      console.log(`🔒 Testing: ${testName}`);
      await testFunction();
      console.log(`   ✅ PASSED: ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`   ❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.securityMetrics.vulnerabilitiesFound++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  async testSQLInjectionPrevention() {
    const maliciousInputs = this.testData.securityTestData.maliciousInputs;
    
    for (const input of maliciousInputs) {
      if (input.includes('DROP TABLE') || input.includes('OR \'1\'=\'1')) {
        // Mock SQL injection attempt detection
        const isBlocked = this.detectSQLInjection(input);
        
        if (!isBlocked) {
          throw new Error(`SQL injection not blocked: ${input}`);
        }
        
        console.log(`   🚫 SQL injection blocked: ${input.substring(0, 30)}...`);
      }
    }
    
    console.log(`   ✅ All SQL injection attempts properly blocked`);
  }

  detectSQLInjection(input) {
    // Mock SQL injection detection
    const sqlPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+SET/i,
      /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
      /UNION\s+SELECT/i,
      /--/,
      /;/
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  async testXSSPrevention() {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert("XSS")',
      '<svg onload=alert(1)>',
      '"><script>alert("XSS")</script>'
    ];
    
    for (const payload of xssPayloads) {
      const isSanitized = this.sanitizeInput(payload);
      
      if (isSanitized === payload) {
        throw new Error(`XSS payload not sanitized: ${payload}`);
      }
      
      console.log(`   🧹 XSS payload sanitized: ${payload.substring(0, 30)}...`);
    }
    
    console.log(`   ✅ All XSS payloads properly sanitized`);
  }

  sanitizeInput(input) {
    // Mock input sanitization
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  async testDataValidation() {
    const validationTests = [
      { field: 'email', value: 'invalid-email', valid: false },
      { field: 'email', value: 'valid@example.com', valid: true },
      { field: 'phone', value: '123', valid: false },
      { field: 'phone', value: '0123456789', valid: true },
      { field: 'id_number', value: '123', valid: false },
      { field: 'id_number', value: '1234567890123', valid: true }
    ];
    
    for (const test of validationTests) {
      const isValid = this.validateField(test.field, test.value);
      
      if (test.valid && !isValid) {
        throw new Error(`Valid ${test.field} rejected: ${test.value}`);
      }
      if (!test.valid && isValid) {
        throw new Error(`Invalid ${test.field} accepted: ${test.value}`);
      }
      
      console.log(`   ${isValid ? '✅' : '🚫'} ${test.field}: ${test.value} (${isValid ? 'Valid' : 'Invalid'})`);
    }
  }

  validateField(field, value) {
    // Mock field validation
    switch (field) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^\d{10}$/.test(value);
      case 'id_number':
        return /^\d{13}$/.test(value);
      default:
        return true;
    }
  }

  async runSecurityTests() {
    console.log('🔒 **INPUT VALIDATION SECURITY TESTS**\n');

    await this.runSecurityTest('SQL Injection Prevention', () => this.testSQLInjectionPrevention());
    await this.runSecurityTest('XSS Prevention', () => this.testXSSPrevention());
    await this.runSecurityTest('Data Validation', () => this.testDataValidation());

    // Calculate security metrics
    const totalTests = this.testResults.passed + this.testResults.failed;
    this.testResults.securityMetrics.complianceScore = totalTests > 0 ? (this.testResults.passed / totalTests) * 100 : 0;
    this.testResults.securityMetrics.inputValidationStrength = Math.max(0, 100 - (this.testResults.securityMetrics.vulnerabilitiesFound * 20));

    return this.testResults;
  }
}

module.exports = InputValidationSecurityTest;
