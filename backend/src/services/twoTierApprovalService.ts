import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Interfaces for two-tier approval system
export interface WorkflowAction {
  applicationId?: number;
  renewalId?: number;
  userId: number;
  userRole: string;
  actionType: 'financial_review_start' | 'financial_approve' | 'financial_reject' | 'final_review_start' | 'final_approve' | 'final_reject' | 'status_change' |
             'renewal_financial_review_start' | 'renewal_financial_approve' | 'renewal_financial_reject' | 'renewal_payment_verify';
  notes?: string;
  metadata?: any;
}

export interface FinancialReviewData {
  financial_status: 'Approved' | 'Rejected';
  financial_rejection_reason?: string;
  financial_admin_notes?: string;
}

export interface RenewalFinancialReviewData {
  financial_status: 'Approved' | 'Rejected' | 'Pending';
  financial_rejection_reason?: string;
  financial_admin_notes?: string;
  payment_verified?: boolean;
  payment_amount?: number;
  payment_reference?: string;
}

export interface FinalReviewData {
  status: 'Approved' | 'Rejected';
  rejection_reason?: string;
  admin_notes?: string;
}

export interface WorkflowNotification {
  applicationId?: number;
  renewalId?: number;
  fromUserId: number;
  toRole: string;
  notificationType: 'financial_review_complete' | 'ready_for_final_review' | 'application_approved' | 'application_rejected' |
                   'renewal_financial_review_complete' | 'renewal_ready_for_processing' | 'renewal_approved' | 'renewal_rejected';
  title: string;
  message: string;
}

export class TwoTierApprovalService {
  
  // Start financial review process
  static async startFinancialReview(applicationId: number, userId: number): Promise<void> {
    try {
      // Update application workflow stage
      await executeQuery(`
        UPDATE membership_applications 
        SET workflow_stage = 'Financial Review',
            financial_status = 'Under Review'
        WHERE id = ? AND workflow_stage = 'Submitted'
      `, [applicationId]);

      // Log audit trail
      await this.logWorkflowAction({
        applicationId,
        userId,
        userRole: 'financial_reviewer',
        actionType: 'financial_review_start',
        notes: 'Financial review started'
      });

    } catch (error) {
      throw createDatabaseError('Failed to start financial review', error);
    }
  }

  // Complete financial review (approve/reject payment)
  static async completeFinancialReview(
    applicationId: number, 
    userId: number, 
    reviewData: FinancialReviewData
  ): Promise<void> {
    try {
      const isApproved = reviewData.financial_status === 'Approved';
      const newWorkflowStage = isApproved ? 'Payment Approved' : 'Rejected';
      const newStatus = isApproved ? 'Under Review' : 'Rejected';

      // Update application
      await executeQuery(`
        UPDATE membership_applications 
        SET financial_status = ?,
            financial_reviewed_at = NOW(),
            financial_reviewed_by = ?,
            financial_rejection_reason = ?,
            financial_admin_notes = ?,
            workflow_stage = ?,
            status = ?
        WHERE id = ? AND workflow_stage IN ('Financial Review', 'Submitted')
      `, [
        reviewData.financial_status,
        userId,
        reviewData.financial_rejection_reason || null,
        reviewData.financial_admin_notes || null,
        newWorkflowStage,
        newStatus,
        applicationId
      ]);

      // Log audit trail
      await this.logWorkflowAction({
        applicationId,
        userId,
        userRole: 'financial_reviewer',
        actionType: isApproved ? 'financial_approve' : 'financial_reject',
        notes: reviewData.financial_admin_notes || `Financial review ${reviewData.financial_status.toLowerCase()}`
      });

      // Send notification to membership approvers if approved
      if (isApproved) {
        await this.sendWorkflowNotification({
          applicationId,
          fromUserId: userId,
          toRole: 'membership_approver',
          notificationType: 'ready_for_final_review',
          title: 'Application Ready for Final Review',
          message: `Application #${applicationId} has been financially approved and is ready for final membership review.`
        });
      }

    } catch (error) {
      throw createDatabaseError('Failed to complete financial review', error);
    }
  }

  // Start final review process
  static async startFinalReview(applicationId: number, userId: number): Promise<void> {
    try {
      // Verify application is in correct stage
      const application = await executeQuerySingle(`
        SELECT id, workflow_stage, financial_status, financial_reviewed_by 
        FROM membership_applications 
        WHERE id = ?
      `, [applicationId]);

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.workflow_stage !== 'Payment Approved') {
        throw new Error('Application is not ready for final review');
      }

      if (application.financial_reviewed_by === userId) {
        throw new Error('Cannot perform final review on application you financially reviewed (separation of duties)');
      }

      // Update application workflow stage
      await executeQuery(`
        UPDATE membership_applications 
        SET workflow_stage = 'Final Review'
        WHERE id = ? AND workflow_stage = 'Payment Approved'
      `, [applicationId]);

      // Log audit trail
      await this.logWorkflowAction({
        applicationId,
        userId,
        userRole: 'membership_approver',
        actionType: 'final_review_start',
        notes: 'Final review started'
      });

    } catch (error) {
      throw createDatabaseError('Failed to start final review', error);
    }
  }

  // Complete final review (approve/reject membership)
  static async completeFinalReview(
    applicationId: number, 
    userId: number, 
    reviewData: FinalReviewData
  ): Promise<void> {
    try {
      // Verify separation of duties
      const application = await executeQuerySingle(`
        SELECT id, financial_reviewed_by 
        FROM membership_applications 
        WHERE id = ?
      `, [applicationId]);

      if (application?.financial_reviewed_by === userId) {
        throw new Error('Cannot perform final review on application you financially reviewed (separation of duties)');
      }

      const isApproved = reviewData.status === 'Approved';
      const newWorkflowStage = isApproved ? 'Approved' : 'Rejected';

      // Update application
      await executeQuery(`
        UPDATE membership_applications 
        SET status = ?,
            reviewed_at = NOW(),
            reviewed_by = ?,
            final_reviewed_at = NOW(),
            final_reviewed_by = ?,
            rejection_reason = ?,
            admin_notes = ?,
            workflow_stage = ?
        WHERE id = ? AND workflow_stage IN ('Final Review', 'Payment Approved')
      `, [
        reviewData.status,
        userId,
        userId,
        reviewData.rejection_reason || null,
        reviewData.admin_notes || null,
        newWorkflowStage,
        applicationId
      ]);

      // Log audit trail
      await this.logWorkflowAction({
        applicationId,
        userId,
        userRole: 'membership_approver',
        actionType: isApproved ? 'final_approve' : 'final_reject',
        notes: reviewData.admin_notes || `Final review ${reviewData.status.toLowerCase()}`
      });

      // Send notification
      await this.sendWorkflowNotification({
        applicationId,
        fromUserId: userId,
        toRole: 'system',
        notificationType: isApproved ? 'application_approved' : 'application_rejected',
        title: `Application ${reviewData.status}`,
        message: `Application #${applicationId} has been ${reviewData.status.toLowerCase()} by final reviewer.`
      });

      // If approved, create membership record
      if (isApproved) {
        await this.createMembershipFromApplication(applicationId);
      }

    } catch (error) {
      throw createDatabaseError('Failed to complete final review', error);
    }
  }

  // Get applications for financial review
  static async getApplicationsForFinancialReview(userId: number): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT 
          ma.*,
          w.ward_name,
          m.municipality_name,
          d.district_name,
          p.province_name
        FROM membership_applications ma
        LEFT JOIN wards w ON ma.ward_code = w.ward_code
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE ma.workflow_stage IN ('Submitted', 'Financial Review')
        ORDER BY ma.submitted_at ASC
      `);
    } catch (error) {
      throw createDatabaseError('Failed to get applications for financial review', error);
    }
  }

  // Get applications for final review
  static async getApplicationsForFinalReview(userId: number): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT 
          ma.*,
          w.ward_name,
          m.municipality_name,
          d.district_name,
          p.province_name,
          fr.name as financial_reviewer_name
        FROM membership_applications ma
        LEFT JOIN wards w ON ma.ward_code = w.ward_code
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        LEFT JOIN users fr ON ma.financial_reviewed_by = fr.id
        WHERE ma.workflow_stage IN ('Payment Approved', 'Final Review')
        AND (ma.financial_reviewed_by != ? OR ma.financial_reviewed_by IS NULL)
        ORDER BY ma.financial_reviewed_at ASC
      `, [userId]);
    } catch (error) {
      throw createDatabaseError('Failed to get applications for final review', error);
    }
  }

  // Log workflow action to audit trail
  private static async logWorkflowAction(action: WorkflowAction): Promise<void> {
    try {
      await executeQuery(`
        INSERT INTO approval_audit_trail (
          application_id, renewal_id, user_id, user_role, action_type, entity_type, notes, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        action.applicationId || null,
        action.renewalId || null,
        action.userId,
        action.userRole,
        action.actionType,
        action.renewalId ? 'renewal' : 'application',
        action.notes || null,
        action.metadata ? JSON.stringify(action.metadata) : null
      ]);
    } catch (error) {
      console.error('Failed to log workflow action:', error);
      // Don't throw error to avoid breaking main workflow
    }
  }

  // Send workflow notification
  private static async sendWorkflowNotification(notification: WorkflowNotification): Promise<void> {
    try {
      await executeQuery(`
        INSERT INTO workflow_notifications (
          application_id, renewal_id, from_user_id, to_role, notification_type, title, message
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        notification.applicationId || null,
        notification.renewalId || null,
        notification.fromUserId,
        notification.toRole,
        notification.notificationType,
        notification.title,
        notification.message
      ]);
    } catch (error) {
      console.error('Failed to send workflow notification:', error);
      // Don't throw error to avoid breaking main workflow
    }
  }

  // Log renewal financial audit trail
  private static async logRenewalFinancialAudit(auditData: {
    renewalId: number;
    userId: number;
    action: string;
    workflowStageBefore?: string;
    workflowStageAfter?: string;
    financialStatusBefore?: string;
    financialStatusAfter?: string;
    amountReviewed?: number;
    paymentMethod?: string;
    paymentReference?: string;
    approvalStatus?: string;
    rejectionReason?: string;
    notes?: string;
  }): Promise<void> {
    try {
      // Get member_id for the renewal
      const renewal = await executeQuerySingle(`
        SELECT member_id FROM membership_renewals WHERE renewal_id = ?
      `, [auditData.renewalId]);

      if (!renewal) {
        throw new Error('Renewal not found for audit logging');
      }

      await executeQuery(`
        INSERT INTO renewal_financial_audit_trail (
          renewal_id, member_id, workflow_stage_before, workflow_stage_after,
          financial_status_before, financial_status_after, reviewed_by, reviewer_role,
          review_action, amount_reviewed, payment_method, payment_reference,
          approval_status, rejection_reason, reviewer_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        auditData.renewalId,
        renewal.member_id,
        auditData.workflowStageBefore || null,
        auditData.workflowStageAfter || null,
        auditData.financialStatusBefore || null,
        auditData.financialStatusAfter || null,
        auditData.userId,
        'financial_reviewer',
        auditData.action,
        auditData.amountReviewed || null,
        auditData.paymentMethod || null,
        auditData.paymentReference || null,
        auditData.approvalStatus || null,
        auditData.rejectionReason || null,
        auditData.notes || null
      ]);
    } catch (error) {
      console.error('Failed to log renewal financial audit:', error);
      // Don't throw error to avoid breaking main workflow
    }
  }

  // Log financial operations audit
  private static async logFinancialOperation(operationData: {
    operationId: string;
    operationType: string;
    applicationId?: number;
    renewalId?: number;
    memberId?: number;
    transactionReference?: string;
    amountBefore?: number;
    amountAfter?: number;
    performedBy: number;
    performedByRole: string;
    operationStatus: string;
    operationNotes?: string;
    systemNotes?: string;
  }): Promise<void> {
    try {
      await executeQuery(`
        INSERT INTO financial_operations_audit (
          operation_id, operation_type, application_id, renewal_id, member_id,
          transaction_reference, amount_before, amount_after, performed_by,
          performed_by_role, operation_status, operation_notes, system_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        operationData.operationId,
        operationData.operationType,
        operationData.applicationId || null,
        operationData.renewalId || null,
        operationData.memberId || null,
        operationData.transactionReference || null,
        operationData.amountBefore || null,
        operationData.amountAfter || null,
        operationData.performedBy,
        operationData.performedByRole,
        operationData.operationStatus,
        operationData.operationNotes || null,
        operationData.systemNotes || null
      ]);
    } catch (error) {
      console.error('Failed to log financial operation:', error);
      // Don't throw error to avoid breaking main workflow
    }
  }

  // Create membership from approved application
  private static async createMembershipFromApplication(applicationId: number): Promise<void> {
    try {
      // This would integrate with the existing membership creation service
      // For now, just log that membership should be created
      console.log(`Creating membership for approved application ${applicationId}`);
      
      // TODO: Integrate with existing MembershipApprovalService.approveApplication
      // This would create the member record and membership record
      
    } catch (error) {
      console.error('Failed to create membership from application:', error);
      // Don't throw error to avoid breaking approval workflow
    }
  }

  // =====================================================
  // RENEWAL FINANCIAL REVIEW METHODS
  // =====================================================

  // Get renewals pending financial review
  static async getRenewalsForFinancialReview(userId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT
          mr.*,
          m.firstname,
          m.surname,
          m.email,
          m.phone,
          m.member_number,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          fr.name as financial_reviewer_name,
          -- Payment information from unified view
          uft.amount as payment_amount,
          uft.payment_method,
          uft.payment_reference,
          uft.payment_status,
          uft.payment_date
        FROM membership_renewals mr
        LEFT JOIN members m ON mr.member_id = m.member_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        LEFT JOIN users fr ON mr.financial_reviewed_by = fr.id
        LEFT JOIN unified_financial_transactions uft ON (
          uft.entity_id = mr.renewal_id AND
          uft.transaction_type = 'Renewal'
        )
        WHERE mr.workflow_stage IN ('Submitted', 'Payment Verification')
          AND (mr.financial_status IS NULL OR mr.financial_status = 'Pending')
        ORDER BY mr.created_at ASC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
    } catch (error) {
      throw createDatabaseError('Failed to get renewals for financial review', error);
    }
  }

  // Start renewal financial review process
  static async startRenewalFinancialReview(renewalId: number, userId: number): Promise<void> {
    try {
      // Verify renewal exists and is in correct stage
      const renewal = await executeQuerySingle(`
        SELECT renewal_id, workflow_stage, financial_status, financial_reviewed_by
        FROM membership_renewals
        WHERE renewal_id = ?
      `, [renewalId]);

      if (!renewal) {
        throw new Error('Renewal not found');
      }

      if (!['Submitted', 'Payment Verification'].includes(renewal.workflow_stage)) {
        throw new Error('Renewal is not ready for financial review');
      }

      if (renewal.financial_reviewed_by && renewal.financial_reviewed_by !== userId) {
        throw new Error('Renewal is already being reviewed by another financial reviewer');
      }

      // Update renewal workflow stage and assign reviewer
      await executeQuery(`
        UPDATE membership_renewals
        SET workflow_stage = 'Financial Review',
            financial_status = 'Under Review',
            financial_reviewed_by = ?
        WHERE renewal_id = ? AND workflow_stage IN ('Submitted', 'Payment Verification')
      `, [userId, renewalId]);

      // Log audit trail
      await this.logWorkflowAction({
        renewalId,
        userId,
        userRole: 'financial_reviewer',
        actionType: 'renewal_financial_review_start',
        notes: 'Renewal financial review started'
      });

      // Log to renewal financial audit trail
      await this.logRenewalFinancialAudit({
        renewalId,
        userId,
        action: 'review_started',
        workflowStageBefore: renewal.workflow_stage,
        workflowStageAfter: 'Financial Review',
        financialStatusBefore: renewal.financial_status || 'Pending',
        financialStatusAfter: 'Under Review',
        notes: 'Financial review process initiated'
      });

    } catch (error) {
      throw createDatabaseError('Failed to start renewal financial review', error);
    }
  }

  // Complete renewal financial review (approve/reject payment)
  static async completeRenewalFinancialReview(
    renewalId: number,
    userId: number,
    reviewData: RenewalFinancialReviewData
  ): Promise<void> {
    try {
      // Verify renewal is in correct stage and assigned to this reviewer
      const renewal = await executeQuerySingle(`
        SELECT renewal_id, workflow_stage, financial_status, financial_reviewed_by, member_id
        FROM membership_renewals
        WHERE renewal_id = ?
      `, [renewalId]);

      if (!renewal) {
        throw new Error('Renewal not found');
      }

      if (renewal.workflow_stage !== 'Financial Review') {
        throw new Error('Renewal is not in financial review stage');
      }

      if (renewal.financial_reviewed_by !== userId) {
        throw new Error('You are not assigned to review this renewal');
      }

      const isApproved = reviewData.financial_status === 'Approved';
      const newWorkflowStage = isApproved ? 'Payment Approved' : 'Payment Rejected';

      // Update renewal with review results
      await executeQuery(`
        UPDATE membership_renewals
        SET financial_status = ?,
            financial_reviewed_at = NOW(),
            financial_rejection_reason = ?,
            financial_admin_notes = ?,
            workflow_stage = ?
        WHERE renewal_id = ? AND workflow_stage = 'Financial Review'
      `, [
        reviewData.financial_status,
        reviewData.financial_rejection_reason || null,
        reviewData.financial_admin_notes || null,
        newWorkflowStage,
        renewalId
      ]);

      // Log audit trail
      await this.logWorkflowAction({
        renewalId,
        userId,
        userRole: 'financial_reviewer',
        actionType: isApproved ? 'renewal_financial_approve' : 'renewal_financial_reject',
        notes: reviewData.financial_admin_notes || `Renewal financial review ${reviewData.financial_status.toLowerCase()}`
      });

      // Log to renewal financial audit trail
      await this.logRenewalFinancialAudit({
        renewalId,
        userId,
        action: isApproved ? 'payment_approved' : 'payment_rejected',
        workflowStageBefore: 'Financial Review',
        workflowStageAfter: newWorkflowStage,
        financialStatusBefore: 'Under Review',
        financialStatusAfter: reviewData.financial_status,
        amountReviewed: reviewData.payment_amount,
        paymentReference: reviewData.payment_reference,
        approvalStatus: isApproved ? 'approved' : 'rejected',
        rejectionReason: reviewData.financial_rejection_reason,
        notes: reviewData.financial_admin_notes
      });

      // Log to financial operations audit
      await this.logFinancialOperation({
        operationId: `renewal_review_${renewalId}_${Date.now()}`,
        operationType: isApproved ? 'payment_approved' : 'payment_rejected',
        renewalId,
        memberId: renewal.member_id,
        performedBy: userId,
        performedByRole: 'financial_reviewer',
        operationStatus: 'completed',
        operationNotes: reviewData.financial_admin_notes,
        amountAfter: reviewData.payment_amount
      });

      // Send notification if approved (ready for membership processing)
      if (isApproved) {
        await this.sendWorkflowNotification({
          renewalId,
          fromUserId: userId,
          toRole: 'membership_approver',
          notificationType: 'renewal_ready_for_processing',
          title: 'Renewal Ready for Processing',
          message: `Renewal #${renewalId} has been financially approved and is ready for membership processing.`
        });
      }

    } catch (error) {
      throw createDatabaseError('Failed to complete renewal financial review', error);
    }
  }

  // Get workflow audit trail for application
  static async getWorkflowAuditTrail(applicationId: number): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT
          aat.*,
          u.name as user_name,
          u.email as user_email
        FROM approval_audit_trail aat
        LEFT JOIN users u ON aat.user_id = u.id
        WHERE aat.application_id = ?
        ORDER BY aat.created_at ASC
      `, [applicationId]);
    } catch (error) {
      throw createDatabaseError('Failed to get workflow audit trail', error);
    }
  }

  // Get workflow audit trail for renewal
  static async getRenewalWorkflowAuditTrail(renewalId: number): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT
          aat.*,
          u.name as user_name,
          u.email as user_email
        FROM approval_audit_trail aat
        LEFT JOIN users u ON aat.user_id = u.id
        WHERE aat.renewal_id = ?
        ORDER BY aat.created_at ASC
      `, [renewalId]);
    } catch (error) {
      throw createDatabaseError('Failed to get renewal workflow audit trail', error);
    }
  }

  // Get comprehensive audit trail for renewal (includes financial audit)
  static async getRenewalComprehensiveAuditTrail(renewalId: number): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT
          audit_source,
          audit_id,
          operation_type,
          user_name,
          performed_by_role,
          operation_notes,
          metadata,
          created_at,
          entity_description
        FROM comprehensive_audit_trail
        WHERE renewal_id = ?
        ORDER BY created_at ASC
      `, [renewalId]);
    } catch (error) {
      throw createDatabaseError('Failed to get renewal comprehensive audit trail', error);
    }
  }

  // Get renewal details with role-based access control
  static async getRenewalWithRoleAccess(renewalId: number, userId: number, userRole: string): Promise<any> {
    try {
      const renewal = await executeQuerySingle(`
        SELECT
          mr.*,
          m.firstname,
          m.surname,
          m.email,
          m.phone,
          m.member_number,
          m.id_number,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          fr.name as financial_reviewer_name,
          -- Payment information from unified view
          uft.amount as payment_amount,
          uft.payment_method,
          uft.payment_reference,
          uft.payment_status,
          uft.payment_date,
          uft.transaction_id
        FROM membership_renewals mr
        LEFT JOIN members m ON mr.member_id = m.member_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        LEFT JOIN users fr ON mr.financial_reviewed_by = fr.id
        LEFT JOIN unified_financial_transactions uft ON (
          uft.entity_id = mr.renewal_id AND
          uft.transaction_type = 'Renewal'
        )
        WHERE mr.renewal_id = ?
      `, [renewalId]);

      if (!renewal) {
        return null;
      }

      // Apply role-based access control
      if (userRole === 'financial_reviewer') {
        // Financial reviewers can only see renewals in appropriate stages
        if (!['Submitted', 'Payment Verification', 'Financial Review', 'Payment Approved', 'Payment Rejected'].includes(renewal.workflow_stage)) {
          return null;
        }
      } else if (userRole === 'membership_approver') {
        // Membership approvers can only see financially approved renewals
        if (!['Payment Approved', 'Processing', 'Approved', 'Rejected'].includes(renewal.workflow_stage)) {
          return null;
        }
        // Cannot see renewals they financially reviewed (separation of duties)
        if (renewal.financial_reviewed_by === userId) {
          return null;
        }
      }

      return renewal;
    } catch (error) {
      throw createDatabaseError('Failed to get renewal with role access', error);
    }
  }

  // Get workflow notifications for role
  static async getWorkflowNotifications(role: string, isRead?: boolean): Promise<any[]> {
    try {
      let query = `
        SELECT
          wn.*,
          ma.application_number,
          ma.first_name,
          ma.last_name,
          u.name as from_user_name
        FROM workflow_notifications wn
        LEFT JOIN membership_applications ma ON wn.application_id = ma.id
        LEFT JOIN users u ON wn.from_user_id = u.id
        WHERE wn.to_role = ?
      `;

      const params: any[] = [role];

      if (isRead !== undefined) {
        query += ' AND wn.is_read = ?';
        params.push(isRead);
      }

      query += ' ORDER BY wn.created_at DESC';

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get workflow notifications', error);
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      await executeQuery(`
        UPDATE workflow_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ?
      `, [notificationId]);
    } catch (error) {
      throw createDatabaseError('Failed to mark notification as read', error);
    }
  }

  // Get workflow statistics
  static async getWorkflowStatistics(userRole: string): Promise<any> {
    try {
      if (userRole === 'financial_reviewer') {
        const [stats] = await executeQuery(`
          SELECT
            COUNT(CASE WHEN workflow_stage = 'Submitted' THEN 1 END) as pending_financial_review,
            COUNT(CASE WHEN workflow_stage = 'Financial Review' THEN 1 END) as under_financial_review,
            COUNT(CASE WHEN financial_status = 'Approved' THEN 1 END) as financially_approved,
            COUNT(CASE WHEN financial_status = 'Rejected' THEN 1 END) as financially_rejected
          FROM membership_applications
          WHERE workflow_stage IN ('Submitted', 'Financial Review') OR financial_status IS NOT NULL
        `);
        return stats;
      } else if (userRole === 'membership_approver') {
        const [stats] = await executeQuery(`
          SELECT
            COUNT(CASE WHEN workflow_stage = 'Payment Approved' THEN 1 END) as pending_final_review,
            COUNT(CASE WHEN workflow_stage = 'Final Review' THEN 1 END) as under_final_review,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected
          FROM membership_applications
          WHERE workflow_stage IN ('Payment Approved', 'Final Review', 'Approved', 'Rejected')
        `);
        return stats;
      } else {
        // Super admin gets all statistics
        const [stats] = await executeQuery(`
          SELECT
            COUNT(CASE WHEN workflow_stage = 'Submitted' THEN 1 END) as pending_financial_review,
            COUNT(CASE WHEN workflow_stage = 'Financial Review' THEN 1 END) as under_financial_review,
            COUNT(CASE WHEN workflow_stage = 'Payment Approved' THEN 1 END) as pending_final_review,
            COUNT(CASE WHEN workflow_stage = 'Final Review' THEN 1 END) as under_final_review,
            COUNT(CASE WHEN workflow_stage = 'Approved' THEN 1 END) as approved,
            COUNT(CASE WHEN workflow_stage = 'Rejected' THEN 1 END) as rejected
          FROM membership_applications
        `);
        return stats;
      }
    } catch (error) {
      throw createDatabaseError('Failed to get workflow statistics', error);
    }
  }

  // Get application with role-based access
  static async getApplicationWithRoleAccess(applicationId: number, userId: number, userRole: string): Promise<any> {
    try {
      // Simplified query to avoid join issues - get basic application data
      const application = await executeQuerySingle(`
        SELECT
          ma.*,
          NULL as ward_name,
          NULL as municipality_name,
          NULL as district_name,
          NULL as province_name,
          NULL as financial_reviewer_name,
          NULL as final_reviewer_name,
          NULL as language_name,
          NULL as occupation_name,
          NULL as qualification_name
        FROM membership_applications ma
        WHERE ma.id = ?
      `, [applicationId]);

      if (!application) {
        return null;
      }

      // Apply role-based access control
      if (userRole === 'financial_reviewer') {
        // Financial reviewers can only see applications in appropriate stages
        if (!['Submitted', 'Financial Review', 'Payment Approved', 'Rejected'].includes(application.workflow_stage)) {
          return null;
        }
      } else if (userRole === 'membership_approver') {
        // Membership approvers can only see financially approved applications
        if (!['Payment Approved', 'Final Review', 'Approved', 'Rejected'].includes(application.workflow_stage)) {
          return null;
        }
        // Cannot see applications they financially reviewed (separation of duties)
        if (application.financial_reviewed_by === userId) {
          return null;
        }
      }

      return application;
    } catch (error) {
      throw createDatabaseError('Failed to get application with role access', error);
    }
  }
}
