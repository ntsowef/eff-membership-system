/**
 * Two-Tier Approval API Integration Tests
 * Tests all two-tier approval workflow endpoints including financial review,
 * final review, renewal review, and audit trail functionality
 */

const axios = require('axios');

class TwoTierApprovalApiTest {
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

  async testGetFinancialReviewApplications() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial-review/applications`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.applications)) {
      throw new Error('Applications data is not an array');
    }

    // Validate application structure
    if (response.data.data.applications.length > 0) {
      const app = response.data.data.applications[0];
      const requiredFields = ['id', 'firstname', 'surname', 'email', 'payment_amount', 'workflow_stage'];
      
      for (const field of requiredFields) {
        if (!(field in app)) {
          throw new Error(`Application missing required field: ${field}`);
        }
      }
    }
  }

  async testStartFinancialReview() {
    // First get an application to review
    const appsResponse = await axios.get(
      `${this.baseURL}/two-tier-approval/financial-review/applications`,
      { headers: this.auth.headers }
    );

    if (appsResponse.data.data.applications.length === 0) {
      console.log('   ⚠️  No applications available for financial review testing');
      return;
    }

    const applicationId = appsResponse.data.data.applications[0].id;

    const response = await axios.post(
      `${this.baseURL}/two-tier-approval/financial-review/${applicationId}/start`,
      {},
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }
  }

  async testCompleteFinancialReview() {
    // Get applications in financial review
    const appsResponse = await axios.get(
      `${this.baseURL}/two-tier-approval/financial-review/applications`,
      { headers: this.auth.headers }
    );

    const reviewApp = appsResponse.data.data.applications.find(
      app => app.workflow_stage === 'Financial Review'
    );

    if (!reviewApp) {
      console.log('   ⚠️  No applications in financial review stage for testing');
      return;
    }

    const reviewData = {
      financial_status: 'Approved',
      financial_admin_notes: 'Test financial review completion'
    };

    const response = await axios.post(
      `${this.baseURL}/two-tier-approval/financial-review/${reviewApp.id}/complete`,
      reviewData,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }
  }

  async testGetRenewalReviewApplications() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/renewal-review/renewals`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.renewals)) {
      throw new Error('Renewals data is not an array');
    }
  }

  async testStartRenewalFinancialReview() {
    // Get renewals for review
    const renewalsResponse = await axios.get(
      `${this.baseURL}/two-tier-approval/renewal-review/renewals`,
      { headers: this.auth.headers }
    );

    if (renewalsResponse.data.data.renewals.length === 0) {
      console.log('   ⚠️  No renewals available for financial review testing');
      return;
    }

    const renewalId = renewalsResponse.data.data.renewals[0].renewal_id;

    const response = await axios.post(
      `${this.baseURL}/two-tier-approval/renewal-review/${renewalId}/start`,
      {},
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }
  }

  async testCompleteRenewalFinancialReview() {
    // Get renewals in review
    const renewalsResponse = await axios.get(
      `${this.baseURL}/two-tier-approval/renewal-review/renewals`,
      { headers: this.auth.headers }
    );

    const reviewRenewal = renewalsResponse.data.data.renewals.find(
      renewal => renewal.workflow_stage === 'Financial Review'
    );

    if (!reviewRenewal) {
      console.log('   ⚠️  No renewals in financial review stage for testing');
      return;
    }

    const reviewData = {
      financial_status: 'Approved',
      financial_rejection_reason: null,
      notes: 'Test renewal financial review completion'
    };

    const response = await axios.post(
      `${this.baseURL}/two-tier-approval/renewal-review/${reviewRenewal.renewal_id}/complete`,
      reviewData,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }
  }

  async testGetFinalReviewApplications() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/final-review/applications`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.applications)) {
      throw new Error('Applications data is not an array');
    }
  }

  async testGetWorkflowStatistics() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/statistics`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const stats = response.data.data.statistics;
    const requiredStats = [
      'total_applications', 'pending_financial_review', 'pending_final_review',
      'approved_applications', 'rejected_applications'
    ];

    for (const stat of requiredStats) {
      if (!(stat in stats)) {
        throw new Error(`Statistics missing required field: ${stat}`);
      }
      if (typeof stats[stat] !== 'number') {
        throw new Error(`Statistics field ${stat} is not a number`);
      }
    }
  }

  async testGetAuditTrail() {
    // Get an application to check audit trail
    const appsResponse = await axios.get(
      `${this.baseURL}/two-tier-approval/financial-review/applications`,
      { headers: this.auth.headers }
    );

    if (appsResponse.data.data.applications.length === 0) {
      console.log('   ⚠️  No applications available for audit trail testing');
      return;
    }

    const applicationId = appsResponse.data.data.applications[0].id;

    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/applications/${applicationId}/audit-trail`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.audit_trail)) {
      throw new Error('Audit trail data is not an array');
    }
  }

  async testFinancialTransactionsEndpoint() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/transactions?limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.transactions)) {
      throw new Error('Transactions data is not an array');
    }

    // Validate transaction structure
    if (response.data.data.transactions.length > 0) {
      const transaction = response.data.data.transactions[0];
      const requiredFields = ['transaction_id', 'transaction_type', 'amount', 'payment_status'];
      
      for (const field of requiredFields) {
        if (!(field in transaction)) {
          throw new Error(`Transaction missing required field: ${field}`);
        }
      }
    }
  }

  async testFinancialSummaryEndpoint() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/summary`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const summary = response.data.data.summary;
    const requiredFields = [
      'total_transactions', 'total_amount', 'completed_transactions', 'pending_transactions'
    ];

    for (const field of requiredFields) {
      if (!(field in summary)) {
        throw new Error(`Summary missing required field: ${field}`);
      }
      if (typeof summary[field] !== 'number') {
        throw new Error(`Summary field ${field} is not a number`);
      }
    }
  }

  async testReviewerPerformanceEndpoint() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/reviewer-performance`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.performance)) {
      throw new Error('Performance data is not an array');
    }
  }

  async testAuthenticationRequired() {
    // Test without authentication header
    try {
      await axios.get(`${this.baseURL}/two-tier-approval/financial-review/applications`);
      throw new Error('Expected authentication error, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected authentication error
        return;
      }
      throw error;
    }
  }

  async testInvalidApplicationId() {
    try {
      await axios.post(
        `${this.baseURL}/two-tier-approval/financial-review/99999/start`,
        {},
        { headers: this.auth.headers }
      );
      throw new Error('Expected error for invalid application ID, but request succeeded');
    } catch (error) {
      if (error.response && (error.response.status === 404 || error.response.status === 400)) {
        // Expected error for invalid ID
        return;
      }
      throw error;
    }
  }

  async runAllTests() {
    console.log('🧪 **TWO-TIER APPROVAL API INTEGRATION TESTS**\n');

    try {
      await this.runTest('Get Financial Review Applications', () => this.testGetFinancialReviewApplications());
      await this.runTest('Start Financial Review', () => this.testStartFinancialReview());
      await this.runTest('Complete Financial Review', () => this.testCompleteFinancialReview());
      await this.runTest('Get Renewal Review Applications', () => this.testGetRenewalReviewApplications());
      await this.runTest('Start Renewal Financial Review', () => this.testStartRenewalFinancialReview());
      await this.runTest('Complete Renewal Financial Review', () => this.testCompleteRenewalFinancialReview());
      await this.runTest('Get Final Review Applications', () => this.testGetFinalReviewApplications());
      await this.runTest('Get Workflow Statistics', () => this.testGetWorkflowStatistics());
      await this.runTest('Get Audit Trail', () => this.testGetAuditTrail());
      await this.runTest('Financial Transactions Endpoint', () => this.testFinancialTransactionsEndpoint());
      await this.runTest('Financial Summary Endpoint', () => this.testFinancialSummaryEndpoint());
      await this.runTest('Reviewer Performance Endpoint', () => this.testReviewerPerformanceEndpoint());
      await this.runTest('Authentication Required', () => this.testAuthenticationRequired());
      await this.runTest('Invalid Application ID Handling', () => this.testInvalidApplicationId());

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
        console.log('✅ Two-Tier Approval API is working correctly');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Execution', error: error.message });
    }

    return this.testResults.failed === 0;
  }
}

module.exports = TwoTierApprovalApiTest;
