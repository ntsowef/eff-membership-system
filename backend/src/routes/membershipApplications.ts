import { Router, Request, Response, NextFunction } from 'express';
import { MembershipApplicationModel, CreateApplicationData, UpdateApplicationData, ApplicationReviewData, ApplicationFilters } from '../models/membershipApplications';
import { NotificationModel } from '../models/notifications';
import { MembershipApprovalService } from '../services/membershipApprovalService';
import { authenticate, requirePermission, requireHierarchicalAccess } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import { executeQuery } from '../config/database';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createApplicationSchema = Joi.object({
  // Personal Information - support both frontend field names and backend field names
  first_name: Joi.string().min(2).max(100).optional(),
  last_name: Joi.string().min(2).max(100).optional(),
  firstname: Joi.string().min(2).max(100).optional(), // Frontend field name
  surname: Joi.string().min(2).max(100).optional(), // Frontend field name
  id_number: Joi.string().length(13).pattern(/^\d+$/).required(),
  date_of_birth: Joi.date().max('now').required(),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').required(),
  // Enhanced Personal Information fields
  language_id: Joi.number().integer().positive().optional(),
  occupation_id: Joi.number().integer().positive().optional(),
  qualification_id: Joi.number().integer().positive().optional(),
  citizenship_status: Joi.string().valid('South African Citizen', 'Foreign National', 'Permanent Resident').optional(),
  // Contact Information - support both frontend and backend field names
  email: Joi.string().email().optional(),
  cell_number: Joi.string().min(10).max(20).optional(),
  phone: Joi.string().min(10).max(20).optional(), // Frontend field name
  alternative_number: Joi.string().min(10).max(20).optional(),
  residential_address: Joi.string().min(10).max(500).optional(),
  address: Joi.string().min(10).max(500).optional(), // Frontend field name
  postal_address: Joi.string().max(500).optional(),
  city: Joi.string().min(2).max(100).optional(), // Frontend field
  ward_code: Joi.string().min(3).max(20).required(),
  application_type: Joi.string().valid('New', 'Renewal', 'Transfer').optional(),
  // Party Declaration fields
  signature_type: Joi.string().valid('typed', 'drawn').optional(),
  signature_data: Joi.string().optional(),
  declaration_accepted: Joi.boolean().optional(),
  constitution_accepted: Joi.boolean().optional(),
  // Membership Details fields
  hierarchy_level: Joi.string().max(50).optional(),
  entity_name: Joi.string().max(200).optional(),
  membership_type: Joi.string().valid('Regular', 'Associate', 'Student', 'Senior').optional(),
  reason_for_joining: Joi.string().max(1000).optional(),
  skills_experience: Joi.string().max(1000).optional(),
  referred_by: Joi.string().max(200).optional(),
  // Payment Information fields
  payment_method: Joi.string().valid('Cash', 'Bank Transfer', 'EFT', 'Credit Card', 'Debit Card', 'Mobile Payment').optional(),
  payment_reference: Joi.string().max(100).optional(),
  last_payment_date: Joi.date().max('now').optional(),
  payment_amount: Joi.number().positive().precision(2).optional(),
  payment_notes: Joi.string().max(1000).optional(),
  // Geographic fields
  province_code: Joi.string().max(10).optional(),
  district_code: Joi.string().max(10).optional(),
  municipal_code: Joi.string().max(10).optional(),
  voting_district_code: Joi.string().max(20).optional()
}).custom((value, helpers) => {
  // Ensure we have either frontend or backend field names for required fields
  if (!value.first_name && !value.firstname) {
    return helpers.error('any.required', { label: 'first_name or firstname' });
  }
  if (!value.last_name && !value.surname) {
    return helpers.error('any.required', { label: 'last_name or surname' });
  }
  if (!value.cell_number && !value.phone) {
    return helpers.error('any.required', { label: 'cell_number or phone' });
  }
  if (!value.residential_address && !value.address) {
    return helpers.error('any.required', { label: 'residential_address or address' });
  }
  return value;
});

const updateApplicationSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  last_name: Joi.string().min(2).max(100).optional(),
  id_number: Joi.string().length(13).pattern(/^\d+$/).optional(),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').optional(),
  email: Joi.string().email().optional(),
  cell_number: Joi.string().min(10).max(20).optional(),
  alternative_number: Joi.string().min(10).max(20).optional(),
  residential_address: Joi.string().min(10).max(500).optional(),
  postal_address: Joi.string().max(500).optional(),
  ward_code: Joi.string().min(3).max(20).optional(),
  application_type: Joi.string().valid('New', 'Renewal', 'Transfer').optional(),
  admin_notes: Joi.string().max(1000).optional()
});

const reviewApplicationSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Rejected').required(),
  rejection_reason: Joi.string().max(500).when('status', {
    is: 'Rejected',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  admin_notes: Joi.string().max(1000).optional(),
  send_notification: Joi.boolean().default(true)
});

const bulkReviewSchema = Joi.object({
  application_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(50).required(),
  status: Joi.string().valid('Approved', 'Rejected').required(),
  rejection_reason: Joi.string().max(500).when('status', {
    is: 'Rejected',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  admin_notes: Joi.string().max(1000).optional(),
  send_notifications: Joi.boolean().default(true)
});

// Create new membership application
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createApplicationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Map frontend field names to backend field names
    const applicationData: CreateApplicationData = {
      first_name: value.first_name || value.firstname,
      last_name: value.last_name || value.surname,
      id_number: value.id_number,
      date_of_birth: value.date_of_birth,
      gender: value.gender,
      email: value.email,
      cell_number: value.cell_number || value.phone,
      alternative_number: value.alternative_number,
      residential_address: value.residential_address || value.address,
      postal_address: value.postal_address,
      ward_code: value.ward_code,
      application_type: value.application_type,
      // Party Declaration fields
      signature_type: value.signature_type,
      signature_data: value.signature_data,
      declaration_accepted: value.declaration_accepted,
      constitution_accepted: value.constitution_accepted,
      // Membership Details fields
      hierarchy_level: value.hierarchy_level,
      entity_name: value.entity_name,
      membership_type: value.membership_type,
      reason_for_joining: value.reason_for_joining,
      skills_experience: value.skills_experience,
      referred_by: value.referred_by,
      // Geographic fields
      province_code: value.province_code,
      district_code: value.district_code,
      municipal_code: value.municipal_code,
      voting_district_code: value.voting_district_code
    };

    const applicationId = await MembershipApplicationModel.createApplication(applicationData);

    const application = await MembershipApplicationModel.getApplicationById(applicationId);

    res.status(201).json({
      success: true,
      message: 'Membership application created successfully',
      data: {
        application
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Check if ID number already exists (for duplicate prevention during application)
router.post('/check-id-number', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id_number } = req.body;

    if (!id_number) {
      throw new ValidationError('ID number is required');
    }

    // Validate ID number format (13 digits)
    if (!/^\d{13}$/.test(id_number)) {
      throw new ValidationError('ID number must be exactly 13 digits');
    }

    // Check in members table - just check existence
    const memberQuery = `
      SELECT member_id
      FROM members
      WHERE id_number = $1
      LIMIT 1
    `;

    // Check in pending applications - using 'Submitted' status (the actual status value)
    const applicationQuery = `
      SELECT application_id
      FROM membership_applications
      WHERE id_number = $1 AND status IN ('Pending', 'Submitted', 'Under Review')
      LIMIT 1
    `;

    const [memberResults, applicationResults] = await Promise.all([
      executeQuery(memberQuery, [id_number]),
      executeQuery(applicationQuery, [id_number])
    ]);

    const existsInMembers = memberResults.length > 0;
    const existsInApplications = applicationResults.length > 0;

    if (existsInMembers || existsInApplications) {
      return res.json({
        success: true,
        data: {
          exists: true,
          exists_in_members: existsInMembers,
          exists_in_applications: existsInApplications
        },
        message: existsInMembers
          ? 'This ID number is already registered as a member'
          : 'This ID number has a pending application'
      });
    }

    return res.json({
      success: true,
      data: {
        exists: false,
        exists_in_members: false,
        exists_in_applications: false
      },
      message: 'ID number is available'
    });

  } catch (error) {
    next(error);
  }
});

// Get all membership applications (admin only)
router.get('/', authenticate, requirePermission('applications.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: ApplicationFilters = {};
    
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.application_type) filters.application_type = req.query.application_type as string;
    if (req.query.ward_code) filters.ward_code = req.query.ward_code as string;
    if (req.query.municipal_code) filters.municipal_code = req.query.municipal_code as string;
    if (req.query.district_code) filters.district_code = req.query.district_code as string;
    if (req.query.province_code) filters.province_code = req.query.province_code as string;
    if (req.query.submitted_after) filters.submitted_after = req.query.submitted_after as string;
    if (req.query.submitted_before) filters.submitted_before = req.query.submitted_before as string;
    if (req.query.search) filters.search = req.query.search as string;

    // No geographic filtering needed - all admins are national level

    const [applications, totalCount] = await Promise.all([
      MembershipApplicationModel.getAllApplications(limit, offset, filters),
      MembershipApplicationModel.getApplicationCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Membership applications retrieved successfully',
      data: {
        applications,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get application by ID
router.get('/:id', authenticate, requirePermission('applications.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const application = await MembershipApplicationModel.getApplicationById(applicationId);
    if (!application) {
      throw new NotFoundError('Membership application not found');
    }

    res.json({
      success: true,
      message: 'Membership application retrieved successfully',
      data: {
        application
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get application by application number
router.get('/number/:applicationNumber', authenticate, requirePermission('applications.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationNumber = req.params.applicationNumber;
    
    const application = await MembershipApplicationModel.getApplicationByNumber(applicationNumber);
    if (!application) {
      throw new NotFoundError('Membership application not found');
    }

    res.json({
      success: true,
      message: 'Membership application retrieved successfully',
      data: {
        application
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update membership application
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const { error, value } = updateApplicationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if application exists
    const existingApplication = await MembershipApplicationModel.getApplicationById(applicationId);
    if (!existingApplication) {
      throw new NotFoundError('Membership application not found');
    }

    // Only allow updates to Draft applications by applicants, or any status by admins
    const isAdmin = req.user?.role_name?.includes('admin') || false;
    if (!isAdmin && existingApplication.status !== 'Draft') {
      throw new ValidationError('Can only update applications in Draft status');
    }

    const updateData: UpdateApplicationData = value;
    const success = await MembershipApplicationModel.updateApplication(applicationId, updateData);

    if (!success) {
      throw new Error('Failed to update membership application');
    }

    const updatedApplication = await MembershipApplicationModel.getApplicationById(applicationId);

    res.json({
      success: true,
      message: 'Membership application updated successfully',
      data: {
        application: updatedApplication
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Submit application (change status from Draft to Submitted)
router.post('/:id/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const success = await MembershipApplicationModel.submitApplication(applicationId);
    if (!success) {
      throw new ValidationError('Application not found or not in Draft status');
    }

    const application = await MembershipApplicationModel.getApplicationById(applicationId);

    res.json({
      success: true,
      message: 'Membership application submitted successfully',
      data: {
        application
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Review application (admin only)
router.post('/:id/review', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const { error, value } = reviewApplicationSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Get application before review for audit logging
    const existingApplication = await MembershipApplicationModel.getApplicationById(applicationId);
    if (!existingApplication) {
      throw new NotFoundError('Application not found');
    }

    const reviewData: ApplicationReviewData = {
      status: value.status,
      rejection_reason: value.rejection_reason,
      admin_notes: value.admin_notes,
      reviewed_by: req.user!.id
    };

    const success = await MembershipApplicationModel.reviewApplication(applicationId, reviewData);
    if (!success) {
      throw new ValidationError('Application not found or not in reviewable status');
    }

    const application = await MembershipApplicationModel.getApplicationById(applicationId);

    // Send notification if requested
    if (value.send_notification && application?.email) {
      try {
        const notificationTitle = `Application ${reviewData.status}`;
        const notificationMessage = reviewData.status === 'Approved'
          ? `Congratulations! Your membership application has been approved.`
          : `Your membership application has been rejected. Reason: ${reviewData.rejection_reason}`;

        await NotificationModel.createNotification({
          recipient_type: 'Member',
          notification_type: 'Application Status',
          delivery_channel: 'Email',
          title: notificationTitle,
          message: notificationMessage,
          template_data: {
            applicant_name: `${application.first_name} ${application.last_name}`,
            application_number: application.application_number,
            status: reviewData.status,
            rejection_reason: reviewData.rejection_reason,
            admin_notes: reviewData.admin_notes
          }
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the review process if notification fails
      }
    }

    // Log the review action
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.APPLICATION,
      applicationId,
      { status: existingApplication.status },
      { status: reviewData.status, reviewed_by: req.user!.id },
      req
    );

    res.json({
      success: true,
      message: `Membership application ${reviewData.status.toLowerCase()} successfully`,
      data: {
        application
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Set application under review (admin only)
router.post('/:id/under-review', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const success = await MembershipApplicationModel.setUnderReview(applicationId, req.user!.id);
    if (!success) {
      throw new ValidationError('Application not found or not in Submitted status');
    }

    const application = await MembershipApplicationModel.getApplicationById(applicationId);

    res.json({
      success: true,
      message: 'Application set under review successfully',
      data: {
        application
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get application statistics (admin only)
router.get('/stats/overview', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    
    // No geographic filtering needed - all admins are national level

    const statistics = await MembershipApplicationModel.getApplicationStatistics(filters);

    res.json({
      success: true,
      message: 'Application statistics retrieved successfully',
      data: {
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete application (admin only)
router.delete('/:id', authenticate, requirePermission('applications.delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const success = await MembershipApplicationModel.deleteApplication(applicationId);
    if (!success) {
      throw new ValidationError('Application not found or cannot be deleted');
    }

    res.json({
      success: true,
      message: 'Membership application deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk review applications (admin only)
router.post('/bulk/review', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = bulkReviewSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { application_ids, status, rejection_reason, admin_notes, send_notifications } = value;
    const reviewData: ApplicationReviewData = {
      status,
      rejection_reason,
      admin_notes,
      reviewed_by: req.user!.id
    };

    const results = {
      successful: [] as number[],
      failed: [] as { id: number; error: string }[]
    };

    // Process each application
    for (const applicationId of application_ids) {
      try {
        // Get application before review for audit logging
        const existingApplication = await MembershipApplicationModel.getApplicationById(applicationId);
        if (!existingApplication) {
          results.failed.push({ id: applicationId, error: 'Application not found' });
          continue;
        }

        const success = await MembershipApplicationModel.reviewApplication(applicationId, reviewData);
        if (!success) {
          results.failed.push({ id: applicationId, error: 'Application not in reviewable status' });
          continue;
        }

        results.successful.push(applicationId);

        // Send notification if requested
        if (send_notifications && existingApplication.email) {
          try {
            const notificationTitle = `Application ${status}`;
            const notificationMessage = status === 'Approved'
              ? `Congratulations! Your membership application has been approved.`
              : `Your membership application has been rejected. Reason: ${rejection_reason}`;

            await NotificationModel.createNotification({
              recipient_type: 'Member',
              notification_type: 'Application Status',
              delivery_channel: 'Email',
              title: notificationTitle,
              message: notificationMessage,
              template_data: {
                applicant_name: `${existingApplication.first_name} ${existingApplication.last_name}`,
                application_number: existingApplication.application_number,
                status,
                rejection_reason,
                admin_notes
              }
            });
          } catch (notificationError) {
            console.error(`Failed to send notification for application ${applicationId}:`, notificationError);
          }
        }

        // Log the review action
        await logAudit(
          req.user!.id,
          AuditAction.UPDATE,
          EntityType.APPLICATION,
          applicationId,
          { status: existingApplication.status },
          { status, reviewed_by: req.user!.id },
          req
        );
      } catch (error) {
        results.failed.push({ id: applicationId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    res.json({
      success: true,
      message: `Bulk review completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      data: {
        results
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get applications pending review (admin only)
router.get('/pending/review', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: ApplicationFilters = {
      status: 'Submitted'
    };

    // No geographic filtering needed - all admins are national level

    const [applications, totalCount] = await Promise.all([
      MembershipApplicationModel.getAllApplications(limit, offset, filters),
      MembershipApplicationModel.getApplicationCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Pending applications retrieved successfully',
      data: {
        applications,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get applications under review (admin only)
router.get('/under-review/list', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: ApplicationFilters = {
      status: 'Under Review'
    };

    // No geographic filtering needed - all admins are national level

    const [applications, totalCount] = await Promise.all([
      MembershipApplicationModel.getAllApplications(limit, offset, filters),
      MembershipApplicationModel.getApplicationCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Applications under review retrieved successfully',
      data: {
        applications,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get review queue summary (admin only)
router.get('/review/queue-summary', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};

    // No geographic filtering needed - all admins are national level

    const [
      pendingCount,
      underReviewCount,
      totalStatistics
    ] = await Promise.all([
      MembershipApplicationModel.getApplicationCount({ ...filters, status: 'Submitted' }),
      MembershipApplicationModel.getApplicationCount({ ...filters, status: 'Under Review' }),
      MembershipApplicationModel.getApplicationStatistics(filters)
    ]);

    res.json({
      success: true,
      message: 'Review queue summary retrieved successfully',
      data: {
        queue_summary: {
          pending_review: pendingCount,
          under_review: underReviewCount,
          total_in_queue: pendingCount + underReviewCount
        },
        overall_statistics: totalStatistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Approve application and create member (admin only)
router.post('/:id/approve', authenticate, requirePermission('applications.approve'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const { admin_notes } = req.body;

    const result = await MembershipApprovalService.approveApplication(
      applicationId,
      req.user!.id,
      admin_notes
    );

    // Log the approval action
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.MEMBER,
      result.member_id!,
      {},
      {
        application_id: applicationId,
        membership_id: result.membership_id,
        membership_number: result.membership_number
      },
      req
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        member_id: result.member_id,
        membership_id: result.membership_id,
        membership_number: result.membership_number
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Reject application (admin only)
router.post('/:id/reject', authenticate, requirePermission('applications.approve'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = parseInt(req.params.id);
    if (isNaN(applicationId)) {
      throw new ValidationError('Invalid application ID');
    }

    const { rejection_reason, admin_notes } = req.body;

    if (!rejection_reason) {
      throw new ValidationError('Rejection reason is required');
    }

    const result = await MembershipApprovalService.rejectApplication(
      applicationId,
      req.user!.id,
      rejection_reason,
      admin_notes
    );

    // Log the rejection action
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.APPLICATION,
      applicationId,
      { status: 'Under Review' },
      { status: 'Rejected', rejection_reason },
      req
    );

    res.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get approval statistics (admin only)
router.get('/approval/statistics', authenticate, requirePermission('applications.review'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statistics = await MembershipApprovalService.getApprovalStatistics();

    res.json({
      success: true,
      message: 'Approval statistics retrieved successfully',
      data: {
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
