import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { MembershipRenewalModel } from '../models/membershipRenewal';
import { RenewalPricingService } from '../services/renewalPricingService';
import { RenewalProcessingService } from '../services/renewalProcessingService';
import { RenewalAnalyticsService } from '../services/renewalAnalyticsService';
import { SMSService } from '../services/smsService';
import { PDFExportService } from '../services/pdfExportService';
import { CacheInvalidationHooks } from '../services/cacheInvalidationService';

const router = Router();

// Get Renewal Dashboard Data
router.get('/dashboard',
  asyncHandler(async (req, res) => {
    const dashboardData = await MembershipRenewalModel.getRenewalDashboard();
    
    sendSuccess(res, {
      renewal_dashboard: dashboardData,
      summary: {
        total_renewals: dashboardData.renewal_statistics.total_renewals_this_month,
        pending_renewals: dashboardData.renewal_statistics.pending_renewals,
        total_revenue: dashboardData.renewal_statistics.total_revenue,
        renewal_rate: dashboardData.renewal_statistics.renewal_rate
      }
    }, 'Renewal dashboard data retrieved successfully');
  })
);

// Process Bulk Renewal
router.post('/bulk-renewal',
  validate({
    body: Joi.object({
      member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(1000).required(),
      renewal_type: Joi.string().valid('standard', 'discounted', 'complimentary', 'upgrade').required(),
      payment_method: Joi.string().valid('online', 'bank_transfer', 'cash', 'cheque', 'eft').required(),
      renewal_period_months: Joi.number().integer().min(1).max(60).required(),
      amount_per_member: Joi.number().min(0).required(),
      processed_by: Joi.number().integer().positive().required(),
      notes: Joi.string().max(500).optional(),
      send_confirmation_sms: Joi.boolean().optional(),
      generate_receipts: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      member_ids,
      renewal_type,
      payment_method,
      renewal_period_months,
      amount_per_member,
      processed_by,
      notes,
      send_confirmation_sms = false,
      generate_receipts = false
    } = req.body;
    
    const renewalResult = await RenewalProcessingService.processBulkRenewals(member_ids, {
      renewal_type,
      payment_method,
      renewal_period_months,
      amount_paid: amount_per_member,
      processed_by,
      notes,
      send_confirmation: send_confirmation_sms
    });

    // Send SMS confirmations if requested
    let smsResult: any = null;
    if (send_confirmation_sms && renewalResult.successful_renewals > 0) {
      const successfulMemberIds = renewalResult.renewal_details
        .filter(r => r.success)
        .map(r => r.member_id.toString());

      try {
        smsResult = await SMSService.sendExpirationNotifications({
          notification_type: 'renewal_confirmation',
          member_ids: successfulMemberIds,
          custom_message: `Thank you for renewing your membership! Your new expiry date is {newExpiryDate}. Reference: {transactionId}`,
          send_immediately: true
        });
      } catch (error) {
        console.error('Failed to send SMS confirmations:', error);
        smsResult = { successful_sends: 0, failed_sends: successfulMemberIds.length };
      }
    }

    // Invalidate caches for all successfully renewed members
    if (renewalResult.successful_renewals > 0) {
      console.log(`🔄 Invalidating caches for ${renewalResult.successful_renewals} renewed members...`);
      try {
        // Invalidate cache for each successfully renewed member
        const cacheInvalidationPromises = renewalResult.renewal_details
          .filter(r => r.success)
          .map(r => CacheInvalidationHooks.onMemberChange('update', r.member_id));

        await Promise.all(cacheInvalidationPromises);
        console.log(`✅ Cache invalidation completed for bulk renewal`);
      } catch (cacheError) {
        console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
      }
    }

    sendSuccess(res, {
      renewal_result: renewalResult,
      sms_result: smsResult,
      summary: {
        total_processed: member_ids.length,
        successful_renewals: renewalResult.successful_renewals,
        failed_renewals: renewalResult.failed_renewals,
        total_revenue: renewalResult.total_revenue,
        sms_sent: smsResult?.successful_sends || 0
      }
    }, 'Bulk renewal processing completed');
  })
);

// Process Individual Renewal
router.post('/process/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
      renewal_type: Joi.string().valid('standard', 'discounted', 'complimentary', 'upgrade').required(),
      payment_method: Joi.string().valid('online', 'bank_transfer', 'cash', 'cheque', 'eft').required(),
      payment_reference: Joi.string().max(100).optional(),
      amount_paid: Joi.number().min(0).required(),
      renewal_period_months: Joi.number().integer().min(1).max(60).default(12),
      processed_by: Joi.number().integer().positive().required(),
      notes: Joi.string().max(500).optional(),
      send_confirmation: Joi.boolean().default(true)
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const renewalOptions = req.body;

    const renewalResult = await RenewalProcessingService.processIndividualRenewal({
      member_id: parseInt(memberId),
      ...renewalOptions
    });

    // Invalidate caches if renewal was successful
    if (renewalResult.success) {
      console.log(`🔄 Invalidating caches for member ${memberId} after renewal...`);
      try {
        await CacheInvalidationHooks.onMemberChange('update', parseInt(memberId));
        console.log(`✅ Cache invalidation completed for member ${memberId}`);
      } catch (cacheError) {
        console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
      }
    }

    sendSuccess(res, {
      renewal_result: renewalResult,
      member_id: memberId,
      processed_at: new Date().toISOString()
    }, renewalResult.success ? 'Member renewal processed successfully' : 'Member renewal processing failed');
  })
);

// Validate Renewal Eligibility
router.get('/eligibility/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.number().integer().positive().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const eligibility = await RenewalProcessingService.validateRenewalEligibility(parseInt(memberId));

    sendSuccess(res, {
      eligibility: eligibility,
      member_id: memberId,
      checked_at: new Date().toISOString()
    }, 'Renewal eligibility checked successfully');
  })
);

// Get Renewal Processing Statistics
router.get('/processing/stats',
  asyncHandler(async (req, res) => {
    const stats = await RenewalProcessingService.getRenewalProcessingStats();

    sendSuccess(res, {
      processing_stats: stats,
      generated_at: new Date().toISOString()
    }, 'Renewal processing statistics retrieved successfully');
  })
);

// Get Member Renewal Workflow
router.get('/workflow/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    
    const workflowData = await MembershipRenewalModel.getRenewalWorkflow(memberId);
    
    sendSuccess(res, {
      renewal_workflow: workflowData,
      member_id: memberId
    }, 'Renewal workflow retrieved successfully');
  })
);

// Process Individual Renewal
router.post('/process-renewal',
  validate({
    body: Joi.object({
      member_id: Joi.string().required(),
      renewal_type: Joi.string().valid('standard', 'discounted', 'complimentary', 'upgrade').required(),
      payment_method: Joi.string().valid('online', 'bank_transfer', 'cash', 'cheque', 'eft').required(),
      payment_reference: Joi.string().optional(),
      amount_paid: Joi.number().min(0).required(),
      renewal_period_months: Joi.number().integer().min(1).max(60).required(),
      processed_by: Joi.string().required(),
      notes: Joi.string().max(500).optional(),
      send_confirmation: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const renewalData = req.body;
    
    // Process single renewal (using bulk renewal with one member)
    const renewalResult = await MembershipRenewalModel.processBulkRenewal({
      member_ids: [renewalData.member_id],
      renewal_type: renewalData.renewal_type,
      payment_method: renewalData.payment_method,
      renewal_period_months: renewalData.renewal_period_months,
      amount_per_member: renewalData.amount_paid,
      processed_by: renewalData.processed_by,
      notes: renewalData.notes
    });

    const renewal = renewalResult.renewal_details[0];
    
    // Send confirmation if requested
    let confirmationSent = false;
    if (renewalData.send_confirmation && renewal.success) {
      try {
        await SMSService.sendExpirationNotifications({
          notification_type: 'renewal_confirmation',
          member_ids: [renewalData.member_id],
          send_immediately: true
        });
        confirmationSent = true;
      } catch (error) {
        console.error('Failed to send renewal confirmation:', error);
      }
    }
    
    sendSuccess(res, {
      renewal: renewal,
      confirmation_sent: confirmationSent,
      success: renewal.success
    }, renewal.success ? 'Renewal processed successfully' : 'Renewal processing failed');
  })
);

// This route was duplicate - removed to prevent conflicts

// Generate Renewal Report PDF
router.get('/report/pdf',
  validate({
    query: Joi.object({
      report_type: Joi.string().valid('dashboard', 'analytics', 'member_renewals').optional(),
      period: Joi.string().valid('last_30_days', 'last_90_days', 'last_12_months').optional(),
      title: Joi.string().max(100).optional(),
      include_charts: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      report_type = 'dashboard',
      period = 'last_30_days',
      title,
      include_charts = true
    } = req.query;
    
    let reportData;
    let reportTitle = title as string;
    
    switch (report_type) {
      case 'analytics':
        reportData = await MembershipRenewalModel.getRenewalAnalytics(period as string);
        reportTitle = reportTitle || `Renewal Analytics Report - ${period}`;
        break;
      case 'member_renewals':
        reportData = await MembershipRenewalModel.getRenewalDashboard();
        reportTitle = reportTitle || 'Member Renewals Report';
        break;
      default:
        reportData = await MembershipRenewalModel.getRenewalDashboard();
        reportTitle = reportTitle || 'Renewal Dashboard Report';
    }
    
    const pdfBuffer = await PDFExportService.exportRenewalReportToPDF(reportData, {
      title: reportTitle,
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      includeCharts: include_charts as boolean,
      reportType: report_type as string,
      period: period as string
    });

    const filename = `renewal-report-${report_type}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  })
);

// Send Renewal Reminders
router.post('/send-reminders',
  validate({
    body: Joi.object({
      reminder_type: Joi.string().valid('60_day', '30_day', '7_day', 'expiry_day', 'grace_period').required(),
      member_ids: Joi.array().items(Joi.string()).optional(),
      custom_message: Joi.string().max(160).optional(),
      include_payment_link: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      reminder_type,
      member_ids,
      custom_message,
      include_payment_link = true
    } = req.body;
    
    // Map reminder types to SMS notification types
    const smsTypeMap: { [key: string]: string } = {
      '60_day': '60_day_reminder',
      '30_day': '30_day_reminder',
      '7_day': '7_day_urgent',
      'expiry_day': 'expired_today',
      'grace_period': '7_day_grace'
    };
    
    const smsResult = await SMSService.sendExpirationNotifications({
      notification_type: smsTypeMap[reminder_type],
      member_ids,
      custom_message,
      send_immediately: true
    });
    
    sendSuccess(res, {
      reminder_result: smsResult,
      reminder_type: reminder_type,
      summary: {
        total_sent: smsResult.successful_sends,
        failed_sends: smsResult.failed_sends,
        total_cost: smsResult.total_cost
      }
    }, 'Renewal reminders sent successfully');
  })
);

// Update Renewal Status
router.patch('/update-status',
  validate({
    body: Joi.object({
      renewal_id: Joi.string().required(),
      renewal_status: Joi.string().valid('pending', 'approved', 'rejected', 'completed', 'expired').required(),
      payment_status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'refunded').optional(),
      notes: Joi.string().max(500).optional(),
      updated_by: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { renewal_id, renewal_status, payment_status, notes, updated_by } = req.body;
    
    // Mock status update (in real implementation, would update database)
    const updateResult = {
      renewal_id: renewal_id,
      old_status: 'pending',
      new_status: renewal_status,
      payment_status: payment_status,
      updated_by: updated_by,
      updated_at: new Date().toISOString(),
      notes: notes,
      success: true
    };
    
    sendSuccess(res, {
      update_result: updateResult,
      renewal_id: renewal_id
    }, 'Renewal status updated successfully');
  })
);

// Get Renewal Pricing for Member
router.get('/pricing/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.number().integer().positive().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;

    const pricingCalculation = await RenewalPricingService.calculateMemberRenewalPricing(parseInt(memberId));

    sendSuccess(res, {
      pricing_calculation: pricingCalculation,
      member_id: memberId,
      calculated_at: new Date().toISOString()
    }, 'Member renewal pricing calculated successfully');
  })
);

// Get Bulk Renewal Pricing
router.post('/pricing/bulk',
  validate({
    body: Joi.object({
      member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(1000).required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_ids } = req.body;

    const pricingCalculations = await RenewalPricingService.calculateBulkRenewalPricing(member_ids);
    const recommendations = await RenewalPricingService.getBulkRenewalPricingRecommendations(member_ids);

    sendSuccess(res, {
      pricing_calculations: pricingCalculations,
      bulk_recommendations: recommendations,
      total_members: member_ids.length,
      calculated_at: new Date().toISOString()
    }, 'Bulk renewal pricing calculated successfully');
  })
);

// Get Pricing Tiers
router.get('/pricing/tiers',
  asyncHandler(async (req, res) => {
    const pricingTiers = await RenewalPricingService.getRenewalPricingTiers();

    sendSuccess(res, {
      pricing_tiers: pricingTiers,
      total_tiers: pricingTiers.length
    }, 'Renewal pricing tiers retrieved successfully');
  })
);

// Get Pricing Summary
router.get('/pricing/summary',
  asyncHandler(async (req, res) => {
    const pricingSummary = await RenewalPricingService.getRenewalPricingSummary();

    sendSuccess(res, {
      pricing_summary: pricingSummary,
      generated_at: new Date().toISOString()
    }, 'Renewal pricing summary generated successfully');
  })
);

// Apply Pricing Override
router.post('/pricing/override',
  validate({
    body: Joi.object({
      member_id: Joi.number().integer().positive().required(),
      override_amount: Joi.number().min(0).max(10000).required(),
      reason: Joi.string().min(10).max(500).required(),
      requested_by: Joi.number().integer().positive().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_id, override_amount, reason, requested_by } = req.body;

    const overrideResult = await RenewalPricingService.applyPricingOverride(
      member_id,
      override_amount,
      reason,
      requested_by
    );

    sendSuccess(res, {
      override_result: overrideResult,
      applied_at: new Date().toISOString()
    }, 'Pricing override applied successfully');
  })
);

// Get Renewal Analytics
router.get('/analytics',
  asyncHandler(async (req, res) => {
    const analytics = await RenewalAnalyticsService.getRenewalAnalytics();

    sendSuccess(res, {
      analytics: analytics,
      generated_at: new Date().toISOString()
    }, 'Renewal analytics retrieved successfully');
  })
);

// Get Renewal Forecast
router.get('/analytics/forecast',
  asyncHandler(async (req, res) => {
    const forecast = await RenewalAnalyticsService.generateRenewalForecast();

    sendSuccess(res, {
      forecast: forecast,
      generated_at: new Date().toISOString()
    }, 'Renewal forecast generated successfully');
  })
);

// Get Performance by Period
router.get('/analytics/performance/:period',
  validate({
    params: Joi.object({
      period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { period } = req.params;

    const performance = await RenewalAnalyticsService.getRenewalPerformanceByPeriod(period as any);

    sendSuccess(res, {
      performance: performance,
      period: period,
      generated_at: new Date().toISOString()
    }, `Renewal performance by ${period} retrieved successfully`);
  })
);

// Get Top Performing Regions
router.get('/analytics/regions',
  validate({
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  }),
  asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const regions = await RenewalAnalyticsService.getTopPerformingRegions(Number(limit));

    sendSuccess(res, {
      regions: regions,
      total_regions: regions.length,
      generated_at: new Date().toISOString()
    }, 'Top performing regions retrieved successfully');
  })
);

// Get Executive Summary
router.get('/analytics/executive-summary',
  asyncHandler(async (req, res) => {
    const summary = await RenewalAnalyticsService.generateExecutiveSummary();

    sendSuccess(res, {
      executive_summary: summary,
      generated_at: new Date().toISOString()
    }, 'Executive summary generated successfully');
  })
);

export default router;
