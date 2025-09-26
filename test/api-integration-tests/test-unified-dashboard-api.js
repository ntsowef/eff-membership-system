/**
 * Unified Financial Dashboard API Integration Tests
 * Tests all unified dashboard endpoints including metrics, trends,
 * alerts, performance data, and real-time updates
 */

const axios = require('axios');

class UnifiedDashboardApiTest {
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

  async testGetDashboardMetrics() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/metrics`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const metrics = response.data.data.metrics;
    const requiredMetrics = [
      'total_applications', 'total_renewals', 'total_revenue', 'pending_reviews',
      'completion_rate', 'average_processing_time'
    ];

    for (const metric of requiredMetrics) {
      if (!(metric in metrics)) {
        throw new Error(`Metrics missing required field: ${metric}`);
      }
      if (typeof metrics[metric] !== 'number') {
        throw new Error(`Metrics field ${metric} is not a number`);
      }
    }
  }

  async testGetDashboardMetricsWithDateFilter() {
    const dateFrom = '2024-01-01';
    const dateTo = '2024-12-31';

    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/metrics?date_from=${dateFrom}&date_to=${dateTo}`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify that date filters are applied
    const metrics = response.data.data.metrics;
    if (!metrics) {
      throw new Error('No metrics data returned with date filters');
    }
  }

  async testGetFinancialTrends() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/trends?period=daily&limit=30`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.trends)) {
      throw new Error('Trends data is not an array');
    }

    // Validate trend data structure
    if (response.data.data.trends.length > 0) {
      const trend = response.data.data.trends[0];
      const requiredFields = ['date', 'applications_count', 'renewals_count', 'total_revenue'];
      
      for (const field of requiredFields) {
        if (!(field in trend)) {
          throw new Error(`Trend data missing required field: ${field}`);
        }
      }
    }
  }

  async testGetWeeklyTrends() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/trends?period=weekly&limit=12`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.trends)) {
      throw new Error('Weekly trends data is not an array');
    }
  }

  async testGetMonthlyTrends() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/trends?period=monthly&limit=12`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.trends)) {
      throw new Error('Monthly trends data is not an array');
    }
  }

  async testGetDashboardAlerts() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/alerts`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.alerts)) {
      throw new Error('Alerts data is not an array');
    }

    // Validate alert structure
    if (response.data.data.alerts.length > 0) {
      const alert = response.data.data.alerts[0];
      const requiredFields = ['alert_type', 'alert_category', 'message', 'severity'];
      
      for (const field of requiredFields) {
        if (!(field in alert)) {
          throw new Error(`Alert missing required field: ${field}`);
        }
      }

      // Validate severity levels
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(alert.severity)) {
        throw new Error(`Invalid alert severity: ${alert.severity}`);
      }
    }
  }

  async testGetPerformanceMetrics() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/performance`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const performance = response.data.data.performance;
    const requiredFields = [
      'average_review_time', 'review_completion_rate', 'reviewer_efficiency',
      'workflow_bottlenecks', 'processing_speed'
    ];

    for (const field of requiredFields) {
      if (!(field in performance)) {
        throw new Error(`Performance metrics missing required field: ${field}`);
      }
    }
  }

  async testGetRevenueAnalytics() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/revenue-analytics`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const analytics = response.data.data.analytics;
    const requiredFields = [
      'total_revenue', 'application_revenue', 'renewal_revenue',
      'revenue_growth', 'monthly_breakdown'
    ];

    for (const field of requiredFields) {
      if (!(field in analytics)) {
        throw new Error(`Revenue analytics missing required field: ${field}`);
      }
    }

    // Validate monthly breakdown structure
    if (!Array.isArray(analytics.monthly_breakdown)) {
      throw new Error('Monthly breakdown is not an array');
    }
  }

  async testGetGeographicBreakdown() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/geographic-breakdown`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.breakdown)) {
      throw new Error('Geographic breakdown data is not an array');
    }

    // Validate geographic data structure
    if (response.data.data.breakdown.length > 0) {
      const geo = response.data.data.breakdown[0];
      const requiredFields = ['province', 'transaction_count', 'total_amount'];
      
      for (const field of requiredFields) {
        if (!(field in geo)) {
          throw new Error(`Geographic data missing required field: ${field}`);
        }
      }
    }
  }

  async testGetPaymentMethodAnalysis() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/payment-methods`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.payment_methods)) {
      throw new Error('Payment methods data is not an array');
    }

    // Validate payment method data structure
    if (response.data.data.payment_methods.length > 0) {
      const method = response.data.data.payment_methods[0];
      const requiredFields = ['payment_method', 'transaction_count', 'total_amount', 'success_rate'];
      
      for (const field of requiredFields) {
        if (!(field in method)) {
          throw new Error(`Payment method data missing required field: ${field}`);
        }
      }
    }
  }

  async testGetHealthStatus() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/health`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    const health = response.data.data.health;
    const requiredFields = ['status', 'database_connection', 'cache_status', 'last_updated'];

    for (const field of requiredFields) {
      if (!(field in health)) {
        throw new Error(`Health status missing required field: ${field}`);
      }
    }

    // Validate status values
    const validStatuses = ['healthy', 'warning', 'error'];
    if (!validStatuses.includes(health.status)) {
      throw new Error(`Invalid health status: ${health.status}`);
    }
  }

  async testInvalidDateFormat() {
    try {
      await axios.get(
        `${this.baseURL}/financial-dashboard/metrics?date_from=invalid-date`,
        { headers: this.auth.headers }
      );
      throw new Error('Expected validation error for invalid date format, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected validation error
        return;
      }
      throw error;
    }
  }

  async testInvalidTrendsPeriod() {
    try {
      await axios.get(
        `${this.baseURL}/financial-dashboard/trends?period=invalid`,
        { headers: this.auth.headers }
      );
      throw new Error('Expected validation error for invalid period, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected validation error
        return;
      }
      throw error;
    }
  }

  async testAuthenticationRequired() {
    // Test without authentication header
    try {
      await axios.get(`${this.baseURL}/financial-dashboard/metrics`);
      throw new Error('Expected authentication error, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected authentication error
        return;
      }
      throw error;
    }
  }

  async testCacheHeaders() {
    const response = await axios.get(
      `${this.baseURL}/financial-dashboard/metrics`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    // Check for cache-related headers (optional, depends on implementation)
    if (response.headers['cache-control'] || response.headers['etag']) {
      console.log('   ✅ Cache headers present for performance optimization');
    }
  }

  async runAllTests() {
    console.log('🧪 **UNIFIED FINANCIAL DASHBOARD API INTEGRATION TESTS**\n');

    try {
      await this.runTest('Get Dashboard Metrics', () => this.testGetDashboardMetrics());
      await this.runTest('Get Dashboard Metrics with Date Filter', () => this.testGetDashboardMetricsWithDateFilter());
      await this.runTest('Get Financial Trends (Daily)', () => this.testGetFinancialTrends());
      await this.runTest('Get Weekly Trends', () => this.testGetWeeklyTrends());
      await this.runTest('Get Monthly Trends', () => this.testGetMonthlyTrends());
      await this.runTest('Get Dashboard Alerts', () => this.testGetDashboardAlerts());
      await this.runTest('Get Performance Metrics', () => this.testGetPerformanceMetrics());
      await this.runTest('Get Revenue Analytics', () => this.testGetRevenueAnalytics());
      await this.runTest('Get Geographic Breakdown', () => this.testGetGeographicBreakdown());
      await this.runTest('Get Payment Method Analysis', () => this.testGetPaymentMethodAnalysis());
      await this.runTest('Get Health Status', () => this.testGetHealthStatus());
      await this.runTest('Invalid Date Format Handling', () => this.testInvalidDateFormat());
      await this.runTest('Invalid Trends Period Handling', () => this.testInvalidTrendsPeriod());
      await this.runTest('Authentication Required', () => this.testAuthenticationRequired());
      await this.runTest('Cache Headers', () => this.testCacheHeaders());

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
        console.log('✅ Unified Financial Dashboard API is working correctly');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Execution', error: error.message });
    }

    return this.testResults.failed === 0;
  }
}

module.exports = UnifiedDashboardApiTest;
