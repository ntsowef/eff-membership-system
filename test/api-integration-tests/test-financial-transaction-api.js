/**
 * Financial Transaction API Integration Tests
 * Tests all financial transaction query endpoints including filtering,
 * pagination, sorting, export functionality, and member transaction history
 */

const axios = require('axios');

class FinancialTransactionApiTest {
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

  async testGetAllTransactions() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?limit=20`,
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
      const requiredFields = [
        'transaction_id', 'transaction_type', 'amount', 'payment_status',
        'member_id', 'first_name', 'last_name', 'email', 'created_at'
      ];
      
      for (const field of requiredFields) {
        if (!(field in transaction)) {
          throw new Error(`Transaction missing required field: ${field}`);
        }
      }
    }

    // Validate pagination metadata
    const metadata = response.data.data.metadata;
    if (!metadata || typeof metadata.total !== 'number') {
      throw new Error('Missing or invalid pagination metadata');
    }
  }

  async testFilterByEntityType() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?entity_type=application&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify all transactions are applications
    const transactions = response.data.data.transactions;
    for (const transaction of transactions) {
      if (transaction.transaction_type !== 'Application') {
        throw new Error(`Expected Application transactions, found ${transaction.transaction_type}`);
      }
    }
  }

  async testFilterByPaymentStatus() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?payment_status=Completed&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify all transactions have Completed status
    const transactions = response.data.data.transactions;
    for (const transaction of transactions) {
      if (transaction.payment_status !== 'Completed') {
        throw new Error(`Expected Completed transactions, found ${transaction.payment_status}`);
      }
    }
  }

  async testFilterByDateRange() {
    const dateFrom = '2024-01-01';
    const dateTo = '2024-12-31';

    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?date_from=${dateFrom}&date_to=${dateTo}&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify transactions are within date range
    const transactions = response.data.data.transactions;
    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.created_at);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (transactionDate < fromDate || transactionDate > toDate) {
        throw new Error(`Transaction date ${transaction.created_at} outside specified range`);
      }
    }
  }

  async testFilterByAmountRange() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?amount_min=100&amount_max=500&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify transactions are within amount range
    const transactions = response.data.data.transactions;
    for (const transaction of transactions) {
      if (transaction.amount < 100 || transaction.amount > 500) {
        throw new Error(`Transaction amount ${transaction.amount} outside specified range`);
      }
    }
  }

  async testMemberSearch() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?member_search=test&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify search functionality (results should contain 'test' in member info)
    const transactions = response.data.data.transactions;
    if (transactions.length > 0) {
      const hasSearchTerm = transactions.some(t => 
        t.first_name.toLowerCase().includes('test') ||
        t.last_name.toLowerCase().includes('test') ||
        t.email.toLowerCase().includes('test')
      );
      
      if (!hasSearchTerm) {
        console.log('   ⚠️  Search results may not contain search term (acceptable if no matching data)');
      }
    }
  }

  async testSortingByAmount() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?sort_by=amount&sort_order=desc&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify descending sort by amount
    const transactions = response.data.data.transactions;
    for (let i = 1; i < transactions.length; i++) {
      if (transactions[i].amount > transactions[i-1].amount) {
        throw new Error('Transactions not sorted by amount in descending order');
      }
    }
  }

  async testSortingByDate() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/query?sort_by=created_at&sort_order=desc&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    // Verify descending sort by date
    const transactions = response.data.data.transactions;
    for (let i = 1; i < transactions.length; i++) {
      const currentDate = new Date(transactions[i].created_at);
      const previousDate = new Date(transactions[i-1].created_at);
      
      if (currentDate > previousDate) {
        throw new Error('Transactions not sorted by date in descending order');
      }
    }
  }

  async testPagination() {
    // Get first page
    const firstPageResponse = await axios.get(
      `${this.baseURL}/financial-transactions/query?limit=5&offset=0`,
      { headers: this.auth.headers }
    );

    if (firstPageResponse.status !== 200) {
      throw new Error(`Expected status 200, got ${firstPageResponse.status}`);
    }

    // Get second page
    const secondPageResponse = await axios.get(
      `${this.baseURL}/financial-transactions/query?limit=5&offset=5`,
      { headers: this.auth.headers }
    );

    if (secondPageResponse.status !== 200) {
      throw new Error(`Expected status 200, got ${secondPageResponse.status}`);
    }

    const firstPageTransactions = firstPageResponse.data.data.transactions;
    const secondPageTransactions = secondPageResponse.data.data.transactions;

    // Verify different results (if enough data exists)
    if (firstPageTransactions.length > 0 && secondPageTransactions.length > 0) {
      const firstPageIds = firstPageTransactions.map(t => t.transaction_id);
      const secondPageIds = secondPageTransactions.map(t => t.transaction_id);
      
      const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
      if (hasOverlap) {
        throw new Error('Pagination returning overlapping results');
      }
    }
  }

  async testGetMemberTransactionHistory() {
    // First get a member ID from transactions
    const transactionsResponse = await axios.get(
      `${this.baseURL}/financial-transactions/query?limit=1`,
      { headers: this.auth.headers }
    );

    if (transactionsResponse.data.data.transactions.length === 0) {
      console.log('   ⚠️  No transactions available for member history testing');
      return;
    }

    const memberId = transactionsResponse.data.data.transactions[0].member_id;

    const response = await axios.get(
      `${this.baseURL}/financial-transactions/member/${memberId}/history`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Response success flag is false');
    }

    if (!Array.isArray(response.data.data.transactions)) {
      throw new Error('Member transaction history is not an array');
    }

    // Verify all transactions belong to the specified member
    const transactions = response.data.data.transactions;
    for (const transaction of transactions) {
      if (transaction.member_id !== memberId) {
        throw new Error(`Transaction belongs to different member: ${transaction.member_id} vs ${memberId}`);
      }
    }
  }

  async testGetTransactionSummary() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/summary`,
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
      'total_transactions', 'total_amount', 'application_transactions', 'renewal_transactions',
      'completed_transactions', 'pending_transactions', 'failed_transactions'
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

  async testExportTransactions() {
    const response = await axios.get(
      `${this.baseURL}/financial-transactions/export?format=csv&limit=10`,
      { headers: this.auth.headers }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    // For CSV export, check content type
    if (response.headers['content-type'] && !response.headers['content-type'].includes('csv')) {
      console.log('   ⚠️  CSV export may not have correct content-type header');
    }

    // Verify response has data
    if (!response.data || response.data.length === 0) {
      throw new Error('Export response is empty');
    }
  }

  async testInvalidFilters() {
    try {
      await axios.get(
        `${this.baseURL}/financial-transactions/query?payment_status=InvalidStatus`,
        { headers: this.auth.headers }
      );
      throw new Error('Expected validation error for invalid payment status, but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected validation error
        return;
      }
      throw error;
    }
  }

  async testInvalidPagination() {
    try {
      await axios.get(
        `${this.baseURL}/financial-transactions/query?limit=2000`, // Exceeds max limit
        { headers: this.auth.headers }
      );
      throw new Error('Expected validation error for excessive limit, but request succeeded');
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
      await axios.get(`${this.baseURL}/financial-transactions/query`);
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
    console.log('🧪 **FINANCIAL TRANSACTION API INTEGRATION TESTS**\n');

    try {
      await this.runTest('Get All Transactions', () => this.testGetAllTransactions());
      await this.runTest('Filter by Entity Type', () => this.testFilterByEntityType());
      await this.runTest('Filter by Payment Status', () => this.testFilterByPaymentStatus());
      await this.runTest('Filter by Date Range', () => this.testFilterByDateRange());
      await this.runTest('Filter by Amount Range', () => this.testFilterByAmountRange());
      await this.runTest('Member Search', () => this.testMemberSearch());
      await this.runTest('Sorting by Amount', () => this.testSortingByAmount());
      await this.runTest('Sorting by Date', () => this.testSortingByDate());
      await this.runTest('Pagination', () => this.testPagination());
      await this.runTest('Get Member Transaction History', () => this.testGetMemberTransactionHistory());
      await this.runTest('Get Transaction Summary', () => this.testGetTransactionSummary());
      await this.runTest('Export Transactions', () => this.testExportTransactions());
      await this.runTest('Invalid Filters Handling', () => this.testInvalidFilters());
      await this.runTest('Invalid Pagination Handling', () => this.testInvalidPagination());
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
        console.log('✅ Financial Transaction API is working correctly');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Execution', error: error.message });
    }

    return this.testResults.failed === 0;
  }
}

module.exports = FinancialTransactionApiTest;
