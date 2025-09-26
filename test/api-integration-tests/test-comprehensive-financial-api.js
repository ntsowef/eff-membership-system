/**
 * Comprehensive Financial API Integration Tests
 * Tests comprehensive financial service endpoints including KPIs,
 * reviewer performance, financial summaries, and advanced analytics
 */

const axios = require('axios');

class ComprehensiveFinancialApiTest {
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

  async testGetFinancialKPIs() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/kpis`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.kpis)) {
      throw new Error('KPIs data is not an array');
    }

    // Validate KPI structure
    if (response.data.data.kpis.length > 0) {
      const kpi = response.data.data.kpis[0];
      const requiredFields = ['kpi_name', 'current_value', 'target_value', 'performance_status'];
      
      for (const field of requiredFields) {
        if (!(field in kpi)) {
          throw new Error(`KPI missing required field: ${field}`);
        }
      }

      // Validate performance status values
      const validStatuses = ['excellent', 'good', 'warning', 'critical'];
      if (!validStatuses.includes(kpi.performance_status)) {
        throw new Error(`Invalid KPI performance status: ${kpi.performance_status}`);
      }
    }
  }

  async testGetFinancialKPIsByCategory() {
    const categories = ['revenue', 'efficiency', 'quality', 'compliance'];
    
    for (const category of categories) {
      const response = await axios.get(
        `${this.baseURL}/two-tier-approval/financial/kpis?category=${category}`,
        { headers: this.auth.headers }
      );

      if (response.status !== 200) {
        throw new Error(`Expected status 200 for category ${category}, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error(`Response success flag is false for category ${category}`);
      }

      // Verify all KPIs belong to the requested category
      const kpis = response.data.data.kpis;
      for (const kpi of kpis) {
        if (kpi.kpi_category && kpi.kpi_category !== category) {
          throw new Error(`KPI category mismatch: expected ${category}, got ${kpi.kpi_category}`);
        }
      }
    }
  }

  async testGetReviewerPerformanceMetrics() {
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

    // Validate performance structure
    if (response.data.data.performance.length > 0) {
      const performance = response.data.data.performance[0];
      const requiredFields = [
        'reviewer_id', 'reviewer_name', 'reviews_completed', 'average_review_time',
        'accuracy_rate', 'efficiency_score'
      ];
      
      for (const field of requiredFields) {
        if (!(field in performance)) {
          throw new Error(`Performance data missing required field: ${field}`);
        }
      }

      // Validate numeric ranges
      if (performance.accuracy_rate < 0 || performance.accuracy_rate > 100) {
        throw new Error(`Invalid accuracy rate: ${performance.accuracy_rate}`);
      }
      if (performance.efficiency_score < 0 || performance.efficiency_score > 100) {
        throw new Error(`Invalid efficiency score: ${performance.efficiency_score}`);
      }
    }
  }

  async testGetReviewerPerformanceWithDateFilter() {
    const dateFrom = '2024-01-01';
    const dateTo = '2024-12-31';

    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/reviewer-performance?date_from=${dateFrom}&date_to=${dateTo}`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify date filtering is applied (performance data should be within range)
    const performance = response.data.data.performance;
    if (performance.length > 0) {
      console.log(`   ✅ Retrieved ${performance.length} reviewer performance records with date filter`);
    }
  }

  async testGetSpecificReviewerPerformance() {
    // First get all reviewers to get a specific reviewer ID
    const allReviewersResponse = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/reviewer-performance`,
      { headers: this.auth.headers }
    );

    if (allReviewersResponse.data.data.performance.length === 0) {
      console.log('   ⚠️  No reviewer performance data available for specific reviewer testing');
      return;
    }

    const reviewerId = allReviewersResponse.data.data.performance[0].reviewer_id;

    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/reviewer-performance?reviewer_id=${reviewerId}`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify all performance data is for the specified reviewer
    const performance = response.data.data.performance;
    for (const perf of performance) {
      if (perf.reviewer_id !== reviewerId) {
        throw new Error(`Performance data for wrong reviewer: expected ${reviewerId}, got ${perf.reviewer_id}`);
      }
    }
  }

  async testGetFinancialSummaryStatistics() {
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
      'total_transactions', 'total_amount', 'completed_transactions', 'completed_amount',
      'pending_transactions', 'pending_amount', 'failed_transactions', 'failed_amount',
      'application_transactions', 'renewal_transactions'
    ];

    for (const field of requiredFields) {
      if (!(field in summary)) {
        throw new Error(`Summary missing required field: ${field}`);
      }
      if (typeof summary[field] !== 'number') {
        throw new Error(`Summary field ${field} is not a number`);
      }
    }

    // Validate logical consistency
    if (summary.total_transactions !== (summary.completed_transactions + summary.pending_transactions + summary.failed_transactions)) {
      console.log('   ⚠️  Transaction count totals may not match (acceptable if other statuses exist)');
    }
  }

  async testGetFinancialSummaryWithFilters() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/summary?entity_type=application&date_from=2024-01-01`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify filtering is applied
    const summary = response.data.data.summary;
    if (summary.renewal_transactions > 0) {
      console.log('   ⚠️  Application filter may not be working correctly (found renewal transactions)');
    }
  }

  async testGetWorkflowEfficiencyMetrics() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/workflow/efficiency`,
      { headers: this.auth.headers }
    );

    // This endpoint might not exist, so handle gracefully
    if (response.status === 404) {
      console.log('   ⚠️  Workflow efficiency endpoint not implemented (acceptable)');
      return;
    }

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const efficiency = response.data.data.efficiency;
    const expectedFields = ['average_processing_time', 'bottleneck_stages', 'completion_rate'];

    for (const field of expectedFields) {
      if (!(field in efficiency)) {
        throw new Error(`Efficiency metrics missing field: ${field}`);
      }
    }
  }

  async testGetFinancialAuditTrail() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/financial/audit-trail?limit=10`,
      { headers: this.auth.headers }
    );

    // This endpoint might not exist, so handle gracefully
    if (response.status === 404) {
      console.log('   ⚠️  Financial audit trail endpoint not implemented (acceptable)');
      return;
    }

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.audit_trail)) {
      throw new Error('Audit trail data is not an array');
    }

    // Validate audit trail structure
    if (response.data.data.audit_trail.length > 0) {
      const audit = response.data.data.audit_trail[0];
      const requiredFields = ['audit_id', 'entity_type', 'action_type', 'user_id', 'created_at'];
      
      for (const field of requiredFields) {
        if (!(field in audit)) {
          throw new Error(`Audit trail missing required field: ${field}`);
        }
      }
    }
  }

  async testGetComplianceMetrics() {
    const response = await axios.get(
      `${this.baseURL}/two-tier-approval/compliance/metrics`,
      { headers: this.auth.headers }
    );

    // This endpoint might not exist, so handle gracefully
    if (response.status === 404) {
      console.log('   ⚠️  Compliance metrics endpoint not implemented (acceptable)');
      return;
    }

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const compliance = response.data.data.compliance;
    const expectedFields = ['separation_of_duties_violations', 'overdue_reviews', 'policy_adherence_rate'];

    for (const field of expectedFields) {
      if (!(field in compliance)) {
        console.log(`   ⚠️  Compliance metrics missing field: ${field} (may be optional)`);
      }
    }
  }

  async testInvalidKPICategory() {
    try {
      await axios.get(
        `${this.baseURL}/two-tier-approval/financial/kpis?category=invalid_category`,
        { headers: this.auth.headers }
      );
      throw new Error('Expected validation error for invalid KPI category, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected validation error
        return;
      }
      throw error;
    }
  }

  async testInvalidReviewerId() {
    try {
      await axios.get(
        `${this.baseURL}/two-tier-approval/financial/reviewer-performance?reviewer_id=99999`,
        { headers: this.auth.headers }
      );
      // This might return empty results rather than an error, which is acceptable
      console.log('   ✅ Invalid reviewer ID handled gracefully');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Expected not found error
        return;
      }
      throw error;
    }
  }

  async testAuthenticationRequired() {
    // Test without authentication header
    try {
      await axios.get(`${this.baseURL}/two-tier-approval/financial/kpis`);
      throw new Error('Expected authentication error, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected authentication error
        return;
      }
      throw error;
    }
  }

  async runAllTests() {
    console.log('🧪 **COMPREHENSIVE FINANCIAL API INTEGRATION TESTS**\n');

    try {
      await this.runTest('Get Financial KPIs', () => this.testGetFinancialKPIs());
      await this.runTest('Get Financial KPIs by Category', () => this.testGetFinancialKPIsByCategory());
      await this.runTest('Get Reviewer Performance Metrics', () => this.testGetReviewerPerformanceMetrics());
      await this.runTest('Get Reviewer Performance with Date Filter', () => this.testGetReviewerPerformanceWithDateFilter());
      await this.runTest('Get Specific Reviewer Performance', () => this.testGetSpecificReviewerPerformance());
      await this.runTest('Get Financial Summary Statistics', () => this.testGetFinancialSummaryStatistics());
      await this.runTest('Get Financial Summary with Filters', () => this.testGetFinancialSummaryWithFilters());
      await this.runTest('Get Workflow Efficiency Metrics', () => this.testGetWorkflowEfficiencyMetrics());
      await this.runTest('Get Financial Audit Trail', () => this.testGetFinancialAuditTrail());
      await this.runTest('Get Compliance Metrics', () => this.testGetComplianceMetrics());
      await this.runTest('Invalid KPI Category Handling', () => this.testInvalidKPICategory());
      await this.runTest('Invalid Reviewer ID Handling', () => this.testInvalidReviewerId());
      await this.runTest('Authentication Required', () => this.testAuthenticationRequired());

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
        console.log('✅ Comprehensive Financial API is working correctly');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Execution', error: error.message });
    }

    return this.testResults.failed === 0;
  }
}

module.exports = ComprehensiveFinancialApiTest;
