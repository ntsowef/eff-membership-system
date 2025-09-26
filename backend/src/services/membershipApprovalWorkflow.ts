import { PaymentService } from './paymentService';
import { MembershipApprovalService } from './membershipApprovalService';
import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface ApprovalWorkflowStatus {
  application_id: number;
  payment_status: 'none' | 'pending' | 'verified' | 'failed';
  document_status: 'none' | 'uploaded' | 'verified' | 'rejected';
  approval_status: 'pending' | 'ready_for_approval' | 'approved' | 'rejected';
  can_approve: boolean;
  blocking_issues: string[];
}

export interface FinancialMonitoringData {
  daily_revenue: number;
  pending_verifications: number;
  failed_transactions: number;
  approval_ready_count: number;
  total_applications_today: number;
}

export class MembershipApprovalWorkflow {
  
  /**
   * Check if application is ready for approval
   */
  static async checkApprovalReadiness(applicationId: number): Promise<ApprovalWorkflowStatus> {
    try {
      const blockingIssues: string[] = [];
      
      // Check payment status
      const payments = await PaymentService.getApplicationPayments(applicationId);
      const completedPayment = payments.find(p => p.status === 'completed');
      const pendingPayment = payments.find(p => p.status === 'verification_required');
      
      let paymentStatus: 'none' | 'pending' | 'verified' | 'failed' = 'none';
      
      if (completedPayment) {
        paymentStatus = 'verified';
      } else if (pendingPayment) {
        paymentStatus = 'pending';
        blockingIssues.push('Payment verification pending');
      } else if (payments.some(p => p.status === 'failed')) {
        paymentStatus = 'failed';
        blockingIssues.push('Payment failed - requires new payment');
      } else {
        blockingIssues.push('No payment recorded');
      }

      // Check application completeness
      const application = await this.getApplicationDetails(applicationId);
      if (!application) {
        blockingIssues.push('Application not found');
      } else {
        // Check required fields
        const requiredFields = [
          'first_name', 'last_name', 'id_number', 'date_of_birth',
          'gender', 'cell_number', 'email', 'residential_address',
          'province_code', 'district_code', 'municipality_code', 'ward_code'
        ];

        requiredFields.forEach(field => {
          if (!application[field]) {
            blockingIssues.push(`Missing required field: ${field}`);
          }
        });

        // Check party declaration
        if (!application.party_declaration_accepted) {
          blockingIssues.push('Party declaration not accepted');
        }

        if (!application.constitution_accepted) {
          blockingIssues.push('Constitution not accepted');
        }

        if (!application.digital_signature) {
          blockingIssues.push('Digital signature missing');
        }
      }

      // Determine overall status
      let approvalStatus: 'pending' | 'ready_for_approval' | 'approved' | 'rejected' = 'pending';
      
      if (application?.status === 'Approved') {
        approvalStatus = 'approved';
      } else if (application?.status === 'Rejected') {
        approvalStatus = 'rejected';
      } else if (blockingIssues.length === 0) {
        approvalStatus = 'ready_for_approval';
      }

      return {
        application_id: applicationId,
        payment_status: paymentStatus,
        document_status: 'none', // Can be extended for document verification
        approval_status: approvalStatus,
        can_approve: blockingIssues.length === 0 && approvalStatus === 'ready_for_approval',
        blocking_issues: blockingIssues
      };

    } catch (error) {
      throw createDatabaseError('Failed to check approval readiness', error);
    }
  }

  /**
   * Get applications ready for approval
   */
  static async getApplicationsReadyForApproval(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          ma.*,
          pt.status as payment_status,
          pt.amount as payment_amount,
          pt.payment_method,
          pt.verified_at as payment_verified_at
        FROM membership_applications ma
        LEFT JOIN payment_transactions pt ON ma.id = pt.application_id 
          AND pt.status = 'completed'
        WHERE ma.status IN ('Submitted', 'Under Review')
        AND ma.party_declaration_accepted = 1
        AND ma.constitution_accepted = 1
        AND ma.digital_signature IS NOT NULL
        AND pt.id IS NOT NULL
        ORDER BY ma.submitted_at ASC
      `;

      const applications = await executeQuery(query);
      
      // Additional validation for each application
      const readyApplications: any[] = [];
      for (const app of applications) {
        const status = await this.checkApprovalReadiness(app.id);
        if (status.can_approve) {
          readyApplications.push({
            ...app,
            workflow_status: status
          });
        }
      }

      return readyApplications;
    } catch (error) {
      throw createDatabaseError('Failed to get applications ready for approval', error);
    }
  }

  /**
   * Process bulk approval for ready applications
   */
  static async processBulkApproval(
    applicationIds: number[],
    approvedBy: number,
    adminNotes?: string
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const applicationId of applicationIds) {
      try {
        // Check if ready for approval
        const status = await this.checkApprovalReadiness(applicationId);
        
        if (!status.can_approve) {
          failed++;
          errors.push(`Application ${applicationId}: ${status.blocking_issues.join(', ')}`);
          continue;
        }

        // Approve the application
        await MembershipApprovalService.approveApplication(applicationId, approvedBy, adminNotes);
        successful++;

      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        errors.push(`Application ${applicationId}: ${errorMessage}`);
      }
    }

    return { successful, failed, errors };
  }

  /**
   * Get financial monitoring dashboard data
   */
  static async getFinancialMonitoringData(date?: string): Promise<FinancialMonitoringData> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Get payment statistics for the day
      const paymentStats = await PaymentService.getPaymentStatistics(targetDate, targetDate);
      
      // Get pending cash verifications
      const pendingCash = await PaymentService.getPendingCashPayments();
      
      // Get applications ready for approval
      const readyForApproval = await this.getApplicationsReadyForApproval();
      
      // Get total applications submitted today
      const todayApplicationsQuery = `
        SELECT COUNT(*) as count 
        FROM membership_applications 
        WHERE DATE(submitted_at) = ?
      `;
      const todayApps = await executeQuerySingle(todayApplicationsQuery, [targetDate]);

      return {
        daily_revenue: paymentStats.total_revenue || 0,
        pending_verifications: pendingCash.length,
        failed_transactions: paymentStats.failed_transactions || 0,
        approval_ready_count: readyForApproval.length,
        total_applications_today: todayApps.count || 0
      };

    } catch (error) {
      throw createDatabaseError('Failed to get financial monitoring data', error);
    }
  }

  /**
   * Generate financial report
   */
  static async generateFinancialReport(dateFrom: string, dateTo: string): Promise<any> {
    try {
      const paymentStats = await PaymentService.getPaymentStatistics(dateFrom, dateTo);
      
      const detailedQuery = `
        SELECT 
          DATE(pt.created_at) as transaction_date,
          pt.payment_method,
          COUNT(*) as transaction_count,
          SUM(pt.amount) as daily_total,
          COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as successful_count,
          COUNT(CASE WHEN pt.status = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN pt.status = 'verification_required' THEN 1 END) as pending_count
        FROM payment_transactions pt
        WHERE DATE(pt.created_at) BETWEEN ? AND ?
        GROUP BY DATE(pt.created_at), pt.payment_method
        ORDER BY transaction_date DESC, pt.payment_method
      `;

      const dailyBreakdown = await executeQuery(detailedQuery, [dateFrom, dateTo]);

      return {
        summary: paymentStats,
        daily_breakdown: dailyBreakdown,
        period: { from: dateFrom, to: dateTo }
      };

    } catch (error) {
      throw createDatabaseError('Failed to generate financial report', error);
    }
  }

  /**
   * Get application details for workflow processing
   */
  private static async getApplicationDetails(applicationId: number): Promise<any> {
    try {
      const query = 'SELECT * FROM membership_applications WHERE id = ?';
      const result = await executeQuerySingle(query, [applicationId]);
      return result;
    } catch (error) {
      throw createDatabaseError('Failed to get application details', error);
    }
  }

  /**
   * Send notification for payment verification
   */
  static async notifyPaymentVerificationRequired(applicationId: number): Promise<void> {
    try {
      // This would integrate with email/SMS service
      // For now, we'll create a notification record
      const query = `
        INSERT INTO admin_notifications (
          type, title, message, application_id, created_at, is_read
        ) VALUES (
          'payment_verification', 
          'Cash Payment Verification Required',
          'A cash payment requires verification for membership application',
          ?, NOW(), 0
        )
      `;
      
      await executeQuery(query, [applicationId]);
    } catch (error) {
      console.error('Failed to send payment verification notification:', error);
    }
  }

  /**
   * Auto-approve applications that meet all criteria
   */
  static async processAutoApprovals(): Promise<{ processed: number; approved: number }> {
    try {
      const readyApplications = await this.getApplicationsReadyForApproval();
      
      // Filter for auto-approval criteria (e.g., card payments, complete applications)
      const autoApprovalCandidates = readyApplications.filter(app => 
        app.payment_method === 'card' && // Only auto-approve card payments
        app.payment_status === 'completed' &&
        !app.blocking_issues?.length
      );

      let approved = 0;
      const systemUserId = 1; // System user for auto-approvals

      for (const app of autoApprovalCandidates) {
        try {
          await MembershipApprovalService.approveApplication(
            app.id, 
            systemUserId, 
            'Auto-approved: All criteria met'
          );
          approved++;
        } catch (error) {
          console.error(`Failed to auto-approve application ${app.id}:`, error);
        }
      }

      return {
        processed: autoApprovalCandidates.length,
        approved
      };

    } catch (error) {
      throw createDatabaseError('Failed to process auto-approvals', error);
    }
  }
}
