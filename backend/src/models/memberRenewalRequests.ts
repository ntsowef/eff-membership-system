/**
 * Member Renewal Requests Model
 * Handles member-initiated renewal requests and admin approval workflow
 */

import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface MemberRenewalRequest {
  renewal_id: number;
  membership_id: number;
  member_id: number;
  renewal_year: number;
  renewal_type: 'Annual' | 'Partial' | 'Grace' | 'Late';
  renewal_status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Expired';
  renewal_due_date: string;
  renewal_requested_date: string;
  renewal_processed_date?: string;
  renewal_completed_date?: string;
  grace_period_end_date?: string;
  previous_expiry_date?: string;
  new_expiry_date?: string;
  renewal_amount: number;
  late_fee: number;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  payment_status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Refunded';
  processed_by?: number;
  approved_by?: number;
  approved_at?: string;
  rejected_by?: number;
  rejected_at?: string;
  rejection_reason?: string;
  renewal_notes?: string;
  auto_renewal: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberRenewalRequestDetails extends MemberRenewalRequest {
  // Member information
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  email?: string;
  cell_number?: string;
  
  // Membership information
  membership_number?: string;
  current_status_name: string;
  current_expiry_date?: string;
  
  // Geographic information
  ward_code?: string;
  ward_name?: string;
  municipality_name?: string;
  district_name?: string;
  province_name?: string;
  
  // Approval information
  approved_by_name?: string;
  rejected_by_name?: string;
  processed_by_name?: string;
}

export interface CreateRenewalRequestData {
  member_id: number;
  membership_id: number;
  renewal_period_months: number;
  payment_method: string;
  payment_reference?: string;
  payment_amount: number;
  notes?: string;
}

export interface ApproveRenewalData {
  approved_by: number;
  admin_notes?: string;
}

export interface RejectRenewalData {
  rejected_by: number;
  rejection_reason: string;
}

export class MemberRenewalRequestModel {
  /**
   * Create a new renewal request initiated by a member
   */
  static async createRenewalRequest(data: CreateRenewalRequestData): Promise<number> {
    try {
      // Get current membership details
      const membership = await executeQuerySingle<any>(
        `SELECT m.*, ms.expiry_date as current_expiry_date
         FROM memberships m
         WHERE m.membership_id = ? AND m.member_id = ?`,
        [data.membership_id, data.member_id]
      );

      if (!membership) {
        throw new Error('Membership not found');
      }

      // Calculate new expiry date
      const currentExpiry = membership.current_expiry_date 
        ? new Date(membership.current_expiry_date)
        : new Date();
      
      const newExpiryDate = new Date(currentExpiry);
      newExpiryDate.setMonth(newExpiryDate.getMonth() + data.renewal_period_months);

      // Get renewal year
      const renewalYear = new Date().getFullYear();

      // Calculate renewal amount based on subscription type
      const renewalAmount = data.payment_amount;

      // Insert renewal request
      const query = `
        INSERT INTO membership_renewals (
          membership_id,
          member_id,
          renewal_year,
          renewal_type,
          renewal_status,
          renewal_due_date,
          previous_expiry_date,
          new_expiry_date,
          renewal_amount,
          late_fee,
          discount_amount,
          payment_method,
          payment_reference,
          payment_status,
          renewal_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.membership_id,
        data.member_id,
        renewalYear,
        'Annual',
        'Pending', // Renewal status
        new Date().toISOString().split('T')[0], // renewal_due_date
        membership.current_expiry_date,
        newExpiryDate.toISOString().split('T')[0],
        renewalAmount,
        0, // late_fee
        0, // discount_amount
        data.payment_method,
        data.payment_reference || null,
        'Pending', // Payment status
        data.notes || null
      ];

      const result = await executeQuery(query, params) as any;
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create renewal request', error);
    }
  }

  /**
   * Get all pending renewal requests for admin review
   */
  static async getPendingRenewals(filters?: {
    province_code?: string;
    district_code?: string;
    municipality_code?: string;
    ward_code?: string;
    payment_status?: string;
  }): Promise<MemberRenewalRequestDetails[]> {
    try {
      let query = `
        SELECT 
          mr.*,
          m.id_number,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
          m.email,
          m.cell_number,
          m.ward_code,
          ms.membership_number,
          mst.status_name as current_status_name,
          ms.expiry_date as current_expiry_date,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          u_approved.username as approved_by_name,
          u_rejected.username as rejected_by_name,
          u_processed.username as processed_by_name
        FROM membership_renewals mr
        INNER JOIN members_consolidated m ON mr.member_id = m.member_id
        INNER JOIN memberships ms ON mr.membership_id = ms.membership_id
        INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN users u_approved ON mr.approved_by = u_approved.id
        LEFT JOIN users u_rejected ON mr.rejected_by = u_rejected.id
        LEFT JOIN users u_processed ON mr.processed_by = u_processed.id
        WHERE mr.renewal_status = 'Pending'
      `;

      const params: any[] = [];

      if (filters) {
        if (filters.province_code) {
          query += ` AND p.province_code = ?`;
          params.push(filters.province_code);
        }
        if (filters.district_code) {
          query += ` AND d.district_code = ?`;
          params.push(filters.district_code);
        }
        if (filters.municipality_code) {
          query += ` AND mu.municipality_code = ?`;
          params.push(filters.municipality_code);
        }
        if (filters.ward_code) {
          query += ` AND m.ward_code = ?`;
          params.push(filters.ward_code);
        }
        if (filters.payment_status) {
          query += ` AND mr.payment_status = ?`;
          params.push(filters.payment_status);
        }
      }

      query += ` ORDER BY mr.renewal_requested_date ASC`;

      const renewals = await executeQuery(query, params) as MemberRenewalRequestDetails[];
      return renewals;
    } catch (error) {
      throw createDatabaseError('Failed to fetch pending renewals', error);
    }
  }

  /**
   * Get renewal request by ID with full details
   */
  static async getRenewalById(renewalId: number): Promise<MemberRenewalRequestDetails | null> {
    try {
      const query = `
        SELECT 
          mr.*,
          m.id_number,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
          m.email,
          m.cell_number,
          m.ward_code,
          ms.membership_number,
          mst.status_name as current_status_name,
          ms.expiry_date as current_expiry_date,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          u_approved.username as approved_by_name,
          u_rejected.username as rejected_by_name,
          u_processed.username as processed_by_name
        FROM membership_renewals mr
        INNER JOIN members_consolidated m ON mr.member_id = m.member_id
        INNER JOIN memberships ms ON mr.membership_id = ms.membership_id
        INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN users u_approved ON mr.approved_by = u_approved.id
        LEFT JOIN users u_rejected ON mr.rejected_by = u_rejected.id
        LEFT JOIN users u_processed ON mr.processed_by = u_processed.id
        WHERE mr.renewal_id = ?
      `;

      const renewal = await executeQuerySingle<MemberRenewalRequestDetails>(query, [renewalId]);
      return renewal;
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewal details', error);
    }
  }

  /**
   * Approve a renewal request and update membership
   */
  static async approveRenewal(renewalId: number, data: ApproveRenewalData): Promise<boolean> {
    try {
      // Get renewal details
      const renewal = await this.getRenewalById(renewalId);
      if (!renewal) {
        throw new Error('Renewal request not found');
      }

      if (renewal.renewal_status !== 'Pending') {
        throw new Error('Only pending renewals can be approved');
      }

      // Start transaction
      await executeQuery('START TRANSACTION', []);

      try {
        // Update renewal status
        await executeQuery(
          `UPDATE membership_renewals 
           SET renewal_status = 'Completed',
               payment_status = 'Completed',
               approved_by = ?,
               approved_at = NOW(),
               renewal_processed_date = NOW(),
               renewal_completed_date = NOW(),
               renewal_notes = CONCAT(COALESCE(renewal_notes, ''), '\n', COALESCE(?, ''))
           WHERE renewal_id = ?`,
          [data.approved_by, data.admin_notes || '', renewalId]
        );

        // Update membership status and expiry date
        // Get Active status ID (typically 1)
        const activeStatus = await executeQuerySingle<any>(
          `SELECT status_id FROM membership_statuses WHERE status_name = 'Active' LIMIT 1`,
          []
        );

        await executeQuery(
          `UPDATE memberships 
           SET status_id = ?,
               expiry_date = ?,
               last_payment_date = NOW(),
               updated_at = NOW()
           WHERE membership_id = ?`,
          [activeStatus?.status_id || 1, renewal.new_expiry_date, renewal.membership_id]
        );

        // Commit transaction
        await executeQuery('COMMIT', []);
        return true;
      } catch (error) {
        // Rollback on error
        await executeQuery('ROLLBACK', []);
        throw error;
      }
    } catch (error) {
      throw createDatabaseError('Failed to approve renewal', error);
    }
  }

  /**
   * Reject a renewal request
   */
  static async rejectRenewal(renewalId: number, data: RejectRenewalData): Promise<boolean> {
    try {
      const renewal = await this.getRenewalById(renewalId);
      if (!renewal) {
        throw new Error('Renewal request not found');
      }

      if (renewal.renewal_status !== 'Pending') {
        throw new Error('Only pending renewals can be rejected');
      }

      const query = `
        UPDATE membership_renewals 
        SET renewal_status = 'Failed',
            payment_status = 'Failed',
            rejected_by = ?,
            rejected_at = NOW(),
            rejection_reason = ?,
            renewal_processed_date = NOW()
        WHERE renewal_id = ?
      `;

      await executeQuery(query, [data.rejected_by, data.rejection_reason, renewalId]);
      return true;
    } catch (error) {
      throw createDatabaseError('Failed to reject renewal', error);
    }
  }

  /**
   * Get member's renewal history
   */
  static async getMemberRenewalHistory(memberId: number): Promise<MemberRenewalRequest[]> {
    try {
      const query = `
        SELECT * FROM membership_renewals
        WHERE member_id = ?
        ORDER BY renewal_requested_date DESC
      `;

      const renewals = await executeQuery(query, [memberId]) as MemberRenewalRequest[];
      return renewals;
    } catch (error) {
      throw createDatabaseError('Failed to fetch member renewal history', error);
    }
  }
}

