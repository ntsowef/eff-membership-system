import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { MembershipExpirationModel } from '../models/membershipExpiration';
import { SMSService } from '../services/smsService';
import { PDFExportService } from '../services/pdfExportService';
import { authenticate, requirePermission, applyGeographicFilter, logProvinceAccess } from '../middleware/auth';

const router = Router();

// Get Membership Status Overview for Dashboard
router.get('/status-overview',
  asyncHandler(async (req, res) => {
    const statusOverview = await MembershipExpirationModel.getStatusOverview();
    
    sendSuccess(res, {
      membership_status: statusOverview,
      summary: {
        total_active: statusOverview.active_members,
        expiring_soon: statusOverview.expiring_within_30_days.length,
        urgent_renewals: statusOverview.expiring_within_7_days.length,
        recently_expired: statusOverview.recently_expired.length,
        inactive_members: statusOverview.inactive_members.length
      }
    }, 'Membership status overview retrieved successfully');
  })
);

// Get Detailed Expiration Report
router.get('/expiration-report',
  validate({
    query: Joi.object({
      status: Joi.string().valid('expiring_30', 'expiring_7', 'expired', 'inactive', 'all').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      sort_by: Joi.string().valid('expiration_date', 'member_name', 'days_until_expiration').optional(),
      sort_order: Joi.string().valid('asc', 'desc').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      status = 'all',
      page = 1,
      limit = 50,
      sort_by = 'expiration_date',
      sort_order = 'asc'
    } = req.query;
    
    const expirationReport = await MembershipExpirationModel.getExpirationReport({
      status: status as string,
      page: page as number,
      limit: limit as number,
      sort_by: sort_by as string,
      sort_order: sort_order as string
    });
    
    sendSuccess(res, {
      expiration_report: expirationReport,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(expirationReport.total_count / (limit as number)),
        total_records: expirationReport.total_count,
        records_per_page: limit
      }
    }, 'Expiration report retrieved successfully');
  })
);

// Generate Expiration Report PDF
router.get('/expiration-report/pdf',
  validate({
    query: Joi.object({
      status: Joi.string().valid('expiring_30', 'expiring_7', 'expired', 'inactive', 'all').optional(),
      title: Joi.string().max(100).optional(),
      include_contact_details: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      status = 'all',
      title,
      include_contact_details = true
    } = req.query;
    
    const expirationData = await MembershipExpirationModel.getExpirationReport({
      status: status as string,
      page: 1,
      limit: 1000, // Get all records for PDF
      sort_by: 'expiration_date',
      sort_order: 'asc'
    });
    
    const reportTitle = title as string || `Membership Expiration Report - ${new Date().toLocaleDateString()}`;
    
    const pdfBuffer = await PDFExportService.exportExpirationReportToPDF(expirationData, {
      title: reportTitle,
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      includeContactDetails: include_contact_details as boolean,
      status: status as string
    });

    const filename = `membership-expiration-report-${status}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  })
);

// Send Expiration SMS Notifications
router.post('/send-sms-notifications',
  validate({
    body: Joi.object({
      notification_type: Joi.string().valid('30_day_reminder', '7_day_urgent', 'expired_today', '7_day_grace').required(),
      member_ids: Joi.array().items(Joi.string()).optional(),
      custom_message: Joi.string().max(160).optional(),
      send_immediately: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      notification_type,
      member_ids,
      custom_message,
      send_immediately = false
    } = req.body;
    
    const smsResult = await SMSService.sendExpirationNotifications({
      notification_type,
      member_ids,
      custom_message,
      send_immediately
    });
    
    sendSuccess(res, {
      sms_result: smsResult,
      summary: {
        total_sent: smsResult.successful_sends,
        failed_sends: smsResult.failed_sends,
        notification_type: notification_type
      }
    }, 'SMS notifications sent successfully');
  })
);

// Bulk Membership Renewal
router.post('/bulk-renewal',
  validate({
    body: Joi.object({
      member_ids: Joi.array().items(Joi.string()).required(),
      renewal_period_months: Joi.number().integer().min(1).max(60).required(),
      send_confirmation_sms: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      member_ids,
      renewal_period_months,
      send_confirmation_sms = false
    } = req.body;
    
    const renewalResult = await MembershipExpirationModel.bulkRenewal({
      member_ids,
      renewal_period_months,
      send_confirmation_sms
    });
    
    sendSuccess(res, {
      renewal_result: renewalResult,
      summary: {
        total_renewed: renewalResult.successful_renewals,
        failed_renewals: renewalResult.failed_renewals,
        renewal_period: `${renewal_period_months} months`
      }
    }, 'Bulk membership renewal completed');
  })
);

// Get Expiration Trends and Analytics
router.get('/trends-analytics',
  validate({
    query: Joi.object({
      period: Joi.string().valid('last_30_days', 'last_90_days', 'last_year').optional(),
      include_renewal_rates: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      period = 'last_90_days',
      include_renewal_rates = true
    } = req.query;
    
    const trendsData = await MembershipExpirationModel.getTrendsAnalytics({
      period: period as string,
      include_renewal_rates: include_renewal_rates as boolean
    });
    
    sendSuccess(res, {
      trends_analytics: trendsData,
      summary: {
        analysis_period: period,
        total_expirations: trendsData.total_expirations,
        renewal_rate: trendsData.renewal_rate,
        trend_direction: trendsData.trend_direction
      }
    }, 'Expiration trends and analytics retrieved successfully');
  })
);

// Update Member Activity Status
router.post('/update-activity-status',
  validate({
    body: Joi.object({
      member_id: Joi.string().required(),
      activity_type: Joi.string().valid('login', 'profile_update', 'payment', 'engagement').required(),
      activity_date: Joi.date().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { 
      member_id,
      activity_type,
      activity_date = new Date()
    } = req.body;
    
    const updateResult = await MembershipExpirationModel.updateMemberActivity({
      member_id,
      activity_type,
      activity_date
    });
    
    sendSuccess(res, {
      activity_update: updateResult,
      member_id: member_id,
      activity_type: activity_type
    }, 'Member activity status updated successfully');
  })
);

// NEW ROUTES USING DATABASE VIEWS

// Get Enhanced Status Overview using database views
router.get('/enhanced-overview',
  authenticate,
  requirePermission('membership_expiration_read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      // Geographic filtering parameters added by middleware
      province_code: Joi.string().optional(),
      district_code: Joi.string().optional(),
      municipal_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      ward_code: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    // Extract geographic context from middleware
    const { province_code, municipality_code } = req.query;

    const enhancedOverview = await MembershipExpirationModel.getEnhancedStatusOverview({
      province_code: province_code as string,
      municipality_code: municipality_code as string
    });

    sendSuccess(res, {
      enhanced_overview: enhancedOverview,
      summary: {
        total_expiring_soon: enhancedOverview.total_expiring_soon,
        urgent_renewals: enhancedOverview.urgent_renewals,
        total_expired: enhancedOverview.total_expired,
        recently_expired: enhancedOverview.recently_expired
      }
    }, 'Enhanced membership status overview retrieved successfully');
  })
);

// Get Members Expiring Soon using database view
router.get('/expiring-soon',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      priority: Joi.string().valid('Urgent (1 Week)', 'High Priority (2 Weeks)', 'Medium Priority (1 Month)', 'all').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(1000).optional(),
      sort_by: Joi.string().valid('days_until_expiry', 'expiry_date', 'full_name', 'municipality_name').optional(),
      sort_order: Joi.string().valid('asc', 'desc').optional(),
      // Geographic filtering parameters added by middleware
      province_code: Joi.string().optional(),
      district_code: Joi.string().optional(),
      municipal_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      ward_code: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    // Log geographic access for audit
    const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
    await logProvinceAccess(req, 'membership_expiration_expiring_soon_access', geographicContext?.province_code);

    const {
      priority = 'all',
      page = 1,
      limit = 50,
      sort_by = 'days_until_expiry',
      sort_order = 'asc'
    } = req.query;

    // Extract geographic filters from middleware
    const provinceContext = (req as any).provinceContext;
    const municipalityContext = (req as any).municipalityContext;

    const result = await MembershipExpirationModel.getExpiringSoonMembers({
      priority: priority as string,
      page: page as number,
      limit: limit as number,
      sort_by: sort_by as string,
      sort_order: sort_order as string,
      province_code: provinceContext?.province_code || municipalityContext?.province_code,
      municipality_code: municipalityContext?.municipal_code
    });

    sendSuccess(res, {
      members: result.members,
      priority_summary: result.priority_summary,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(result.total_count / (limit as number)),
        total_records: result.total_count,
        records_per_page: limit
      }
    }, 'Members expiring soon retrieved successfully');
  })
);

// Get Expired Members using database view
router.get('/expired',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      category: Joi.string().valid('Recently Expired', 'Expired 1-3 Months', 'Expired 3-12 Months', 'Expired Over 1 Year', 'all').optional(),
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(1000).optional(),
      sort_by: Joi.string().valid('days_expired', 'expiry_date', 'full_name', 'municipality_name').optional(),
      sort_order: Joi.string().valid('asc', 'desc').optional(),
      // Geographic filtering parameters added by middleware
      province_code: Joi.string().optional(),
      district_code: Joi.string().optional(),
      municipal_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      ward_code: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    // Log geographic access for audit
    const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
    await logProvinceAccess(req, 'membership_expiration_expired_access', geographicContext?.province_code);

    const {
      category = 'all',
      page = 1,
      limit = 50,
      sort_by = 'days_expired',
      sort_order = 'asc'
    } = req.query;

    // Extract geographic filters from middleware
    const provinceContext = (req as any).provinceContext;
    const municipalityContext = (req as any).municipalityContext;

    const result = await MembershipExpirationModel.getExpiredMembers({
      category: category as string,
      page: page as number,
      limit: limit as number,
      sort_by: sort_by as string,
      sort_order: sort_order as string,
      province_code: provinceContext?.province_code || municipalityContext?.province_code,
      municipality_code: municipalityContext?.municipal_code
    });

    sendSuccess(res, {
      members: result.members,
      category_summary: result.category_summary,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(result.total_count / (limit as number)),
        total_records: result.total_count,
        records_per_page: limit
      }
    }, 'Expired members retrieved successfully');
  })
);

export default router;
