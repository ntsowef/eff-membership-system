import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { MembershipApplicationModel } from '../models/membershipApplications';

export interface ApprovalResult {
  success: boolean;
  member_id?: number;
  membership_id?: number;
  membership_number?: string;
  message: string;
}

export interface MemberCreationData {
  id_number: string;
  firstname: string;
  surname: string;
  date_of_birth: string;
  gender_id: number;
  ward_code: string;
  cell_number?: string;
  email?: string;
  residential_address?: string;
  postal_address?: string;
  membership_type?: string;
  application_id: number;
}

export interface MembershipCreationData {
  member_id: number;
  date_joined: string;
  last_payment_date?: string;
  subscription_type_id: number;
  membership_amount: number;
  status_id: number;
  payment_method?: string;
}

export class MembershipApprovalService {
  
  /**
   * Approve a membership application and create member + membership records
   */
  static async approveApplication(
    applicationId: number, 
    approvedBy: number,
    adminNotes?: string
  ): Promise<ApprovalResult> {
    try {
      // Get the application details
      const application = await MembershipApplicationModel.getApplicationById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'Submitted' && application.status !== 'Under Review') {
        throw new Error(`Cannot approve application with status: ${application.status}`);
      }

      // Check if member already exists with this ID number
      const existingMember = await this.checkExistingMember(application.id_number);
      if (existingMember) {
        throw new Error('A member with this ID number already exists');
      }

      // Start transaction
      await executeQuery('START TRANSACTION');

      try {
        // 1. Create member record
        const memberId = await this.createMemberFromApplication(application);

        // 2. Create membership record
        const membershipId = await this.createMembershipFromApplication(application, memberId);

        // 3. Generate membership number
        const membershipNumber = await this.generateMembershipNumber(memberId);
        await this.updateMembershipNumber(memberId, membershipNumber);

        // 4. Update application status
        await this.updateApplicationStatus(applicationId, 'Approved', approvedBy, adminNotes);

        // 5. Create approval history record
        await this.createApprovalHistory(applicationId, memberId, approvedBy, 'approved', adminNotes);

        // Commit transaction
        await executeQuery('COMMIT');

        return {
          success: true,
          member_id: memberId,
          membership_id: membershipId,
          membership_number: membershipNumber,
          message: 'Application approved successfully and member created'
        };

      } catch (error) {
        // Rollback transaction
        await executeQuery('ROLLBACK');
        throw error;
      }

    } catch (error) {
      throw createDatabaseError('Failed to approve membership application', error);
    }
  }

  /**
   * Check if a member already exists with the given ID number
   */
  private static async checkExistingMember(idNumber: string): Promise<boolean> {
    const query = 'SELECT member_id FROM members WHERE id_number = ?';
    const result = await executeQuerySingle(query, [idNumber]);
    return !!result;
  }

  /**
   * Create a member record from approved application
   */
  private static async createMemberFromApplication(application: any): Promise<number> {
    // Map gender to gender_id (assuming: 1=Male, 2=Female, 3=Other)
    const genderMap: { [key: string]: number } = {
      'Male': 1,
      'Female': 2,
      'Other': 3,
      'Prefer not to say': 3
    };

    const memberData: MemberCreationData = {
      id_number: application.id_number,
      firstname: application.first_name,
      surname: application.last_name,
      date_of_birth: application.date_of_birth,
      gender_id: genderMap[application.gender] || 3,
      ward_code: application.ward_code,
      cell_number: application.cell_number,
      email: application.email,
      residential_address: application.residential_address,
      postal_address: application.postal_address,
      membership_type: application.membership_type || 'Regular',
      application_id: application.id
    };

    const query = `
      INSERT INTO members (
        id_number, firstname, surname, date_of_birth, gender_id,
        ward_code, cell_number, email, residential_address, postal_address,
        membership_type, application_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      memberData.id_number,
      memberData.firstname,
      memberData.surname,
      memberData.date_of_birth,
      memberData.gender_id,
      memberData.ward_code,
      memberData.cell_number,
      memberData.email,
      memberData.residential_address,
      memberData.postal_address,
      memberData.membership_type,
      memberData.application_id
    ];

    const result = await executeQuery(query, params);
    return result.insertId;
  }

  /**
   * Create a membership record from approved application
   */
  private static async createMembershipFromApplication(application: any, memberId: number): Promise<number> {
    // Use payment information from application if available
    const membershipData: MembershipCreationData = {
      member_id: memberId,
      date_joined: new Date().toISOString().split('T')[0], // Today's date
      subscription_type_id: 1, // Default subscription type
      membership_amount: application.payment_amount || 10.00, // Use application amount or default
      status_id: 1, // Active status
      payment_method: application.payment_method || 'Pending' // Use application method or default
    };

    // If payment information is provided, use the payment date as last_payment_date
    if (application.last_payment_date) {
      membershipData.last_payment_date = application.last_payment_date;
    }

    const query = `
      INSERT INTO memberships (
        member_id, date_joined, last_payment_date, subscription_type_id,
        membership_amount, status_id, payment_method, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      membershipData.member_id,
      membershipData.date_joined,
      membershipData.last_payment_date || null,
      membershipData.subscription_type_id,
      membershipData.membership_amount,
      membershipData.status_id,
      membershipData.payment_method
    ];

    const result = await executeQuery(query, params);
    return result.insertId;
  }

  /**
   * Generate a unique membership number
   */
  private static async generateMembershipNumber(memberId: number): Promise<string> {
    const year = new Date().getFullYear();
    const membershipNumber = `EFF${year}${memberId.toString().padStart(6, '0')}`;
    return membershipNumber;
  }

  /**
   * Update member record with membership number
   */
  private static async updateMembershipNumber(memberId: number, membershipNumber: string): Promise<void> {
    // Note: The members table doesn't have a membership_number field in the current schema
    // This would need to be added to the members table if required
    // For now, we'll skip this step
    console.log(`Generated membership number ${membershipNumber} for member ${memberId}`);
  }

  /**
   * Update application status
   */
  private static async updateApplicationStatus(
    applicationId: number,
    status: string,
    reviewedBy: number,
    adminNotes?: string
  ): Promise<void> {
    const query = `
      UPDATE membership_applications 
      SET status = ?, reviewed_by = ?, reviewed_at = NOW(), admin_notes = ?
      WHERE id = ?
    `;

    await executeQuery(query, [status, reviewedBy, adminNotes, applicationId]);
  }

  /**
   * Create approval history record
   */
  private static async createApprovalHistory(
    applicationId: number,
    memberId: number | null,
    approvedBy: number,
    action: string,
    notes?: string
  ): Promise<void> {
    // Create a simple approval history table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS application_approval_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        member_id INT NULL,
        action ENUM('approved', 'rejected', 'under_review') NOT NULL,
        performed_by INT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL,
        INDEX idx_application_history_application (application_id),
        INDEX idx_application_history_member (member_id)
      )
    `;

    await executeQuery(createTableQuery);

    const insertQuery = `
      INSERT INTO application_approval_history (
        application_id, member_id, action, performed_by, notes
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await executeQuery(insertQuery, [applicationId, memberId, action, approvedBy, notes]);
  }

  /**
   * Reject a membership application
   */
  static async rejectApplication(
    applicationId: number,
    rejectedBy: number,
    rejectionReason: string,
    adminNotes?: string
  ): Promise<ApprovalResult> {
    try {
      // Get the application details
      const application = await MembershipApplicationModel.getApplicationById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'Submitted' && application.status !== 'Under Review') {
        throw new Error(`Cannot reject application with status: ${application.status}`);
      }

      // Update application status
      const query = `
        UPDATE membership_applications 
        SET status = 'Rejected', reviewed_by = ?, reviewed_at = NOW(), 
            rejection_reason = ?, admin_notes = ?
        WHERE id = ?
      `;

      await executeQuery(query, [rejectedBy, rejectionReason, adminNotes, applicationId]);

      // Create rejection history record
      await this.createApprovalHistory(applicationId, null, rejectedBy, 'rejected', `${rejectionReason}. ${adminNotes || ''}`);

      return {
        success: true,
        message: 'Application rejected successfully'
      };

    } catch (error) {
      throw createDatabaseError('Failed to reject membership application', error);
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStatistics(): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_applications,
          SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as pending_approval,
          SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) as under_review,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft
        FROM membership_applications
      `;

      const stats = await executeQuerySingle(query);
      return stats;

    } catch (error) {
      throw createDatabaseError('Failed to get approval statistics', error);
    }
  }
}
