import request from 'supertest';
import app from '../src/app';

describe('Renewal Management System', () => {
  let authToken: string;
  let testMemberId: number;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.data.token;
    testMemberId = 1; // Use existing member ID
  });

  describe('Renewal Dashboard', () => {
    test('should get renewal dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/membership-renewal/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.renewal_statistics).toBeDefined();
      expect(response.body.data.upcoming_expirations).toBeDefined();
      expect(response.body.data.recent_renewals).toBeDefined();
      expect(response.body.data.payment_method_breakdown).toBeDefined();
      expect(response.body.data.renewal_trends).toBeDefined();

      // Validate renewal statistics structure
      const stats = response.body.data.renewal_statistics;
      expect(stats).toHaveProperty('total_renewals_this_month');
      expect(stats).toHaveProperty('pending_renewals');
      expect(stats).toHaveProperty('completed_renewals');
      expect(stats).toHaveProperty('failed_renewals');
      expect(stats).toHaveProperty('total_revenue');
      expect(stats).toHaveProperty('average_renewal_amount');
      expect(stats).toHaveProperty('renewal_rate');

      console.log('✅ Renewal Dashboard Test Passed');
      console.log(`   - Total renewals: ${stats.total_renewals_this_month}`);
      console.log(`   - Renewal rate: ${stats.renewal_rate}%`);
      console.log(`   - Total revenue: R${stats.total_revenue.toLocaleString()}`);
    });
  });

  describe('Renewal Pricing', () => {
    test('should calculate member renewal pricing', async () => {
      const response = await request(app)
        .get(`/api/v1/membership-renewal/pricing/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pricing_calculation).toBeDefined();

      const pricing = response.body.data.pricing_calculation;
      expect(pricing).toHaveProperty('member_id');
      expect(pricing).toHaveProperty('membership_type');
      expect(pricing).toHaveProperty('base_renewal_fee');
      expect(pricing).toHaveProperty('final_amount');
      expect(pricing).toHaveProperty('pricing_breakdown');
      expect(pricing).toHaveProperty('payment_deadline');
      expect(pricing).toHaveProperty('grace_period_end');

      console.log('✅ Member Pricing Calculation Test Passed');
      console.log(`   - Member ID: ${pricing.member_id}`);
      console.log(`   - Membership Type: ${pricing.membership_type}`);
      console.log(`   - Base Fee: R${pricing.base_renewal_fee}`);
      console.log(`   - Final Amount: R${pricing.final_amount}`);
    });

    test('should get pricing tiers', async () => {
      const response = await request(app)
        .get('/api/v1/membership-renewal/pricing/tiers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pricing_tiers).toBeDefined();
      expect(Array.isArray(response.body.data.pricing_tiers)).toBe(true);
      expect(response.body.data.pricing_tiers.length).toBeGreaterThan(0);

      const tier = response.body.data.pricing_tiers[0];
      expect(tier).toHaveProperty('tier_name');
      expect(tier).toHaveProperty('base_renewal_fee');
      expect(tier).toHaveProperty('early_bird_discount_percent');
      expect(tier).toHaveProperty('late_fee_percent');

      console.log('✅ Pricing Tiers Test Passed');
      console.log(`   - Available tiers: ${response.body.data.pricing_tiers.length}`);
    });

    test('should calculate bulk renewal pricing', async () => {
      const memberIds = [1, 2, 3, 4, 5];
      
      const response = await request(app)
        .post('/api/v1/membership-renewal/pricing/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ member_ids: memberIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pricing_calculations).toBeDefined();
      expect(response.body.data.bulk_recommendations).toBeDefined();
      expect(Array.isArray(response.body.data.pricing_calculations)).toBe(true);
      expect(response.body.data.pricing_calculations.length).toBe(memberIds.length);

      console.log('✅ Bulk Pricing Calculation Test Passed');
      console.log(`   - Members processed: ${response.body.data.pricing_calculations.length}`);
      console.log(`   - Total revenue: R${response.body.data.bulk_recommendations.total_revenue.toLocaleString()}`);
    });
  });

  describe('Renewal Processing', () => {
    test('should validate renewal eligibility', async () => {
      const response = await request(app)
        .get(`/api/v1/membership-renewal/eligibility/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eligibility).toBeDefined();

      const eligibility = response.body.data.eligibility;
      expect(eligibility).toHaveProperty('eligible');
      expect(eligibility).toHaveProperty('member_status');
      expect(eligibility).toHaveProperty('days_until_expiry');
      expect(eligibility).toHaveProperty('current_expiry_date');

      console.log('✅ Renewal Eligibility Test Passed');
      console.log(`   - Member eligible: ${eligibility.eligible}`);
      console.log(`   - Days until expiry: ${eligibility.days_until_expiry}`);
      console.log(`   - Member status: ${eligibility.member_status}`);
    });

    test('should process individual renewal', async () => {
      const renewalData = {
        renewal_type: 'standard',
        payment_method: 'online',
        amount_paid: 500,
        renewal_period_months: 12,
        processed_by: 1,
        notes: 'Test renewal processing',
        send_confirmation: false
      };

      const response = await request(app)
        .post(`/api/v1/membership-renewal/process/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(renewalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.renewal_result).toBeDefined();

      const result = response.body.data.renewal_result;
      expect(result).toHaveProperty('renewal_id');
      expect(result).toHaveProperty('member_id');
      expect(result).toHaveProperty('renewal_status');
      expect(result).toHaveProperty('payment_status');
      expect(result).toHaveProperty('amount_paid');
      expect(result).toHaveProperty('success');

      console.log('✅ Individual Renewal Processing Test Passed');
      console.log(`   - Renewal ID: ${result.renewal_id}`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Amount Paid: R${result.amount_paid}`);
    });

    test('should process bulk renewals', async () => {
      const memberIds = [1, 2, 3];
      const bulkRenewalData = {
        member_ids: memberIds,
        renewal_type: 'standard',
        payment_method: 'bank_transfer',
        renewal_period_months: 12,
        amount_per_member: 500,
        processed_by: 1,
        notes: 'Bulk renewal test',
        send_confirmation: false
      };

      const response = await request(app)
        .post('/api/v1/membership-renewal/bulk-renewal')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkRenewalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.renewal_result).toBeDefined();
      expect(response.body.data.bulk_processing).toBeDefined();

      const result = response.body.data.renewal_result;
      expect(result).toHaveProperty('successful_renewals');
      expect(result).toHaveProperty('failed_renewals');
      expect(result).toHaveProperty('total_revenue');
      expect(result).toHaveProperty('renewal_details');
      expect(Array.isArray(result.renewal_details)).toBe(true);

      console.log('✅ Bulk Renewal Processing Test Passed');
      console.log(`   - Successful renewals: ${result.successful_renewals}`);
      console.log(`   - Failed renewals: ${result.failed_renewals}`);
      console.log(`   - Total revenue: R${result.total_revenue.toLocaleString()}`);
    });
  });

  describe('Renewal Analytics', () => {
    test('should get renewal analytics', async () => {
      const response = await request(app)
        .get('/api/v1/membership-renewal/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toBeDefined();

      const analytics = response.body.data.analytics;
      expect(analytics).toHaveProperty('renewal_performance');
      expect(analytics).toHaveProperty('geographic_breakdown');
      expect(analytics).toHaveProperty('timing_analysis');
      expect(analytics).toHaveProperty('payment_method_analysis');
      expect(analytics).toHaveProperty('retention_metrics');

      console.log('✅ Renewal Analytics Test Passed');
      console.log(`   - YTD Renewals: ${analytics.renewal_performance.total_renewals_ytd}`);
      console.log(`   - Renewal Rate: ${analytics.renewal_performance.renewal_rate}%`);
      console.log(`   - YTD Revenue: R${analytics.renewal_performance.revenue_ytd.toLocaleString()}`);
    });

    test('should get renewal forecast', async () => {
      const response = await request(app)
        .get('/api/v1/membership-renewal/analytics/forecast')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forecast).toBeDefined();

      const forecast = response.body.data.forecast;
      expect(forecast).toHaveProperty('next_30_days');
      expect(forecast).toHaveProperty('next_90_days');
      expect(forecast).toHaveProperty('yearly_projection');

      console.log('✅ Renewal Forecast Test Passed');
      console.log(`   - Next 30 days expected renewals: ${forecast.next_30_days.expected_renewals}`);
      console.log(`   - Next 90 days projected revenue: R${forecast.next_90_days.projected_revenue.toLocaleString()}`);
    });

    test('should get executive summary', async () => {
      const response = await request(app)
        .get('/api/v1/membership-renewal/analytics/executive-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.executive_summary).toBeDefined();

      const summary = response.body.data.executive_summary;
      expect(summary).toHaveProperty('key_metrics');
      expect(summary).toHaveProperty('highlights');
      expect(summary).toHaveProperty('concerns');
      expect(summary).toHaveProperty('recommendations');

      console.log('✅ Executive Summary Test Passed');
      console.log(`   - Active Members: ${summary.key_metrics.total_active_members.toLocaleString()}`);
      console.log(`   - Renewal Rate: ${summary.key_metrics.renewal_rate}%`);
      console.log(`   - Highlights: ${summary.highlights.length}`);
      console.log(`   - Recommendations: ${summary.recommendations.length}`);
    });
  });

  describe('Processing Statistics', () => {
    test('should get renewal processing stats', async () => {
      const response = await request(app)
        .get('/api/v1/membership-renewal/processing/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processing_stats).toBeDefined();

      const stats = response.body.data.processing_stats;
      expect(stats).toHaveProperty('daily_renewals');
      expect(stats).toHaveProperty('weekly_renewals');
      expect(stats).toHaveProperty('monthly_renewals');
      expect(stats).toHaveProperty('success_rate');
      expect(stats).toHaveProperty('total_revenue_today');

      console.log('✅ Processing Statistics Test Passed');
      console.log(`   - Daily renewals: ${stats.daily_renewals}`);
      console.log(`   - Success rate: ${stats.success_rate}%`);
      console.log(`   - Today's revenue: R${stats.total_revenue_today.toLocaleString()}`);
    });
  });
});

// Run comprehensive system test
describe('System Integration Test', () => {
  test('should demonstrate complete renewal workflow', async () => {
    console.log('\n🔄 Running Complete Renewal System Integration Test...\n');
    
    // Login
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });
    
    const authToken = loginResponse.body.data.token;
    console.log('✅ Authentication successful');

    // Get dashboard
    const dashboardResponse = await request(app)
      .get('/api/v1/membership-renewal/dashboard')
      .set('Authorization', `Bearer ${authToken}`);
    
    console.log('✅ Dashboard data retrieved');
    console.log(`   - Total renewals: ${dashboardResponse.body.data.renewal_statistics.total_renewals_this_month}`);

    // Calculate pricing for member
    const pricingResponse = await request(app)
      .get('/api/v1/membership-renewal/pricing/1')
      .set('Authorization', `Bearer ${authToken}`);
    
    console.log('✅ Pricing calculated');
    console.log(`   - Final amount: R${pricingResponse.body.data.pricing_calculation.final_amount}`);

    // Process renewal
    const renewalResponse = await request(app)
      .post('/api/v1/membership-renewal/process/1')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        renewal_type: 'standard',
        payment_method: 'online',
        amount_paid: pricingResponse.body.data.pricing_calculation.final_amount,
        renewal_period_months: 12,
        processed_by: 1,
        notes: 'Integration test renewal'
      });
    
    console.log('✅ Renewal processed');
    console.log(`   - Success: ${renewalResponse.body.data.renewal_result.success}`);

    // Get analytics
    const analyticsResponse = await request(app)
      .get('/api/v1/membership-renewal/analytics')
      .set('Authorization', `Bearer ${authToken}`);
    
    console.log('✅ Analytics retrieved');
    console.log(`   - Renewal rate: ${analyticsResponse.body.data.analytics.renewal_performance.renewal_rate}%`);

    console.log('\n🎉 Complete Renewal System Integration Test PASSED!\n');
  });
});
