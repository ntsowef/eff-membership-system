import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Renewal interfaces
export interface MembershipRenewal {
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
  renewal_notes?: string;
  auto_renewal: boolean;
  reminder_sent_count: number;
  last_reminder_sent?: string;
  created_at: string;
  updated_at: string;
}

export interface RenewalDetails extends MembershipRenewal {
  member_name: string;
  member_id_number: string;
  member_email?: string;
  member_phone?: string;
  processor_name?: string;
  ward_name?: string;
  municipality_name?: string;
  district_name?: string;
  province_name?: string;
  renewal_urgency: string;
  days_overdue: number;
}

export interface CreateRenewalData {
  membership_id: number;
  member_id: number;
  renewal_year: number;
  renewal_type?: 'Annual' | 'Partial' | 'Grace' | 'Late';
  renewal_due_date: string;
  renewal_amount?: number;
  late_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  auto_renewal?: boolean;
  renewal_notes?: string;
}

export interface UpdateRenewalData {
  renewal_status?: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Expired';
  payment_status?: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Refunded';
  renewal_amount?: number;
  late_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: string;
  renewal_notes?: string;
  processed_by?: number;
}

export interface RenewalFilters {
  member_id?: number;
  membership_id?: number;
  renewal_year?: number;
  renewal_type?: string;
  renewal_status?: string;
  payment_status?: string;
  processed_by?: number;
  ward_code?: string;
  municipal_code?: string;
  district_code?: string;
  province_code?: string;
  due_date_from?: string;
  due_date_to?: string;
  overdue_only?: boolean;
  grace_period_only?: boolean;
  search?: string;
}

export interface RenewalReminder {
  reminder_id: number;
  renewal_id: number;
  member_id: number;
  reminder_type: 'Email' | 'SMS' | 'Letter' | 'Phone';
  reminder_stage: 'Early' | 'Due' | 'Overdue' | 'Final' | 'Grace';
  scheduled_date: string;
  sent_date?: string;
  delivery_status: 'Scheduled' | 'Sent' | 'Delivered' | 'Failed' | 'Bounced';
  subject?: string;
  message?: string;
  template_used?: string;
  delivery_channel?: string;
  delivery_response?: string;
  delivery_attempts: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderData {
  renewal_id: number;
  member_id: number;
  reminder_type: 'Email' | 'SMS' | 'Letter' | 'Phone';
  reminder_stage: 'Early' | 'Due' | 'Overdue' | 'Final' | 'Grace';
  scheduled_date: string;
  subject?: string;
  message?: string;
  template_used?: string;
  delivery_channel?: string;
  created_by?: number;
}

export interface RenewalPayment {
  payment_id: number;
  renewal_id: number;
  member_id: number;
  payment_amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  payment_status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Refunded';
  external_payment_id?: string;
  gateway_response?: string;
  transaction_fee: number;
  reconciled: boolean;
  reconciled_date?: string;
  reconciled_by?: number;
  processed_by?: number;
  payment_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  renewal_id: number;
  member_id: number;
  payment_amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  external_payment_id?: string;
  gateway_response?: string;
  transaction_fee?: number;
  processed_by?: number;
  payment_notes?: string;
}

// Membership Renewal model class
export class MembershipRenewalModel {
  // Create new renewal
  static async createRenewal(renewalData: CreateRenewalData): Promise<number> {
    try {
      const query = `
        INSERT INTO membership_renewals (
          membership_id, member_id, renewal_year, renewal_type, renewal_due_date,
          renewal_amount, late_fee, discount_amount, payment_method, payment_reference,
          auto_renewal, renewal_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        renewalData.membership_id,
        renewalData.member_id,
        renewalData.renewal_year,
        renewalData.renewal_type || 'Annual',
        renewalData.renewal_due_date,
        renewalData.renewal_amount || 10.00,
        renewalData.late_fee || 0.00,
        renewalData.discount_amount || 0.00,
        renewalData.payment_method || null,
        renewalData.payment_reference || null,
        renewalData.auto_renewal || false,
        renewalData.renewal_notes || null
      ];

      const result = await executeQuery(query, params);
      
      // Log renewal creation in history
      await this.logRenewalActivity(
        result.insertId,
        renewalData.member_id,
        'Created',
        'Renewal record created',
        undefined,
        'Pending'
      );

      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create renewal', error);
    }
  }

  // Get renewal by ID with details
  static async getRenewalById(id: number): Promise<RenewalDetails | null> {
    try {
      const query = `
        SELECT 
          r.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          m.email_address as member_email,
          m.cell_number as member_phone,
          processor.name as processor_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          CASE 
            WHEN r.renewal_due_date > CURDATE() THEN 'Not Due'
            WHEN r.renewal_due_date = CURDATE() THEN 'Due Today'
            WHEN r.renewal_due_date < CURDATE() AND (r.grace_period_end_date IS NULL OR r.grace_period_end_date >= CURDATE()) THEN 'Overdue'
            WHEN r.grace_period_end_date < CURDATE() THEN 'Expired'
            ELSE 'Unknown'
          END as renewal_urgency,
          DATEDIFF(CURDATE(), r.renewal_due_date) as days_overdue
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        LEFT JOIN users processor ON r.processed_by = processor.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE r.renewal_id = ?
      `;

      return await executeQuerySingle<RenewalDetails>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewal', error);
    }
  }

  // Get renewals with filtering and pagination
  static async getRenewals(
    limit: number = 20,
    offset: number = 0,
    filters: RenewalFilters = {}
  ): Promise<RenewalDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.member_id) {
        whereClause += ' AND r.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.membership_id) {
        whereClause += ' AND r.membership_id = ?';
        params.push(filters.membership_id);
      }

      if (filters.renewal_year) {
        whereClause += ' AND r.renewal_year = ?';
        params.push(filters.renewal_year);
      }

      if (filters.renewal_type) {
        whereClause += ' AND r.renewal_type = ?';
        params.push(filters.renewal_type);
      }

      if (filters.renewal_status) {
        whereClause += ' AND r.renewal_status = ?';
        params.push(filters.renewal_status);
      }

      if (filters.payment_status) {
        whereClause += ' AND r.payment_status = ?';
        params.push(filters.payment_status);
      }

      if (filters.processed_by) {
        whereClause += ' AND r.processed_by = ?';
        params.push(filters.processed_by);
      }

      if (filters.ward_code) {
        whereClause += ' AND m.ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipal_code) {
        whereClause += ' AND w.municipality_code = ?';
        params.push(filters.municipal_code);
      }

      if (filters.district_code) {
        whereClause += ' AND w.district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND w.province_code = ?';
        params.push(filters.province_code);
      }

      if (filters.due_date_from) {
        whereClause += ' AND r.renewal_due_date >= ?';
        params.push(filters.due_date_from);
      }

      if (filters.due_date_to) {
        whereClause += ' AND r.renewal_due_date <= ?';
        params.push(filters.due_date_to);
      }

      if (filters.overdue_only) {
        whereClause += ' AND r.renewal_due_date < CURDATE() AND r.renewal_status != "Completed"';
      }

      if (filters.grace_period_only) {
        whereClause += ' AND r.grace_period_end_date IS NOT NULL AND r.grace_period_end_date >= CURDATE()';
      }

      if (filters.search) {
        whereClause += ' AND (m.firstname LIKE ? OR m.surname LIKE ? OR m.id_number LIKE ? OR r.payment_reference LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT 
          r.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          m.email_address as member_email,
          m.cell_number as member_phone,
          processor.name as processor_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          CASE 
            WHEN r.renewal_due_date > CURDATE() THEN 'Not Due'
            WHEN r.renewal_due_date = CURDATE() THEN 'Due Today'
            WHEN r.renewal_due_date < CURDATE() AND (r.grace_period_end_date IS NULL OR r.grace_period_end_date >= CURDATE()) THEN 'Overdue'
            WHEN r.grace_period_end_date < CURDATE() THEN 'Expired'
            ELSE 'Unknown'
          END as renewal_urgency,
          DATEDIFF(CURDATE(), r.renewal_due_date) as days_overdue
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        LEFT JOIN users processor ON r.processed_by = processor.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        ${whereClause}
        ORDER BY r.renewal_due_date ASC, r.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<RenewalDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewals', error);
    }
  }

  // Get renewal count with filters
  static async getRenewalCount(filters: RenewalFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.member_id) {
        whereClause += ' AND r.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.membership_id) {
        whereClause += ' AND r.membership_id = ?';
        params.push(filters.membership_id);
      }

      if (filters.renewal_year) {
        whereClause += ' AND r.renewal_year = ?';
        params.push(filters.renewal_year);
      }

      if (filters.renewal_type) {
        whereClause += ' AND r.renewal_type = ?';
        params.push(filters.renewal_type);
      }

      if (filters.renewal_status) {
        whereClause += ' AND r.renewal_status = ?';
        params.push(filters.renewal_status);
      }

      if (filters.payment_status) {
        whereClause += ' AND r.payment_status = ?';
        params.push(filters.payment_status);
      }

      if (filters.processed_by) {
        whereClause += ' AND r.processed_by = ?';
        params.push(filters.processed_by);
      }

      if (filters.ward_code) {
        whereClause += ' AND m.ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipal_code) {
        whereClause += ' AND w.municipality_code = ?';
        params.push(filters.municipal_code);
      }

      if (filters.district_code) {
        whereClause += ' AND w.district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND w.province_code = ?';
        params.push(filters.province_code);
      }

      if (filters.due_date_from) {
        whereClause += ' AND r.renewal_due_date >= ?';
        params.push(filters.due_date_from);
      }

      if (filters.due_date_to) {
        whereClause += ' AND r.renewal_due_date <= ?';
        params.push(filters.due_date_to);
      }

      if (filters.overdue_only) {
        whereClause += ' AND r.renewal_due_date < CURDATE() AND r.renewal_status != "Completed"';
      }

      if (filters.grace_period_only) {
        whereClause += ' AND r.grace_period_end_date IS NOT NULL AND r.grace_period_end_date >= CURDATE()';
      }

      if (filters.search) {
        whereClause += ' AND (m.firstname LIKE ? OR m.surname LIKE ? OR m.id_number LIKE ? OR r.payment_reference LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        ${whereClause}
      `;

      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get renewal count', error);
    }
  }

  // Update renewal
  static async updateRenewal(id: number, updateData: UpdateRenewalData): Promise<boolean> {
    try {
      // Get current renewal for history logging
      const currentRenewal = await this.getRenewalById(id);
      if (!currentRenewal) {
        return false;
      }

      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.renewal_status !== undefined) {
        fields.push('renewal_status = ?');
        params.push(updateData.renewal_status);
        
        // Set processed date when status changes to Processing
        if (updateData.renewal_status === 'Processing') {
          fields.push('renewal_processed_date = CURRENT_TIMESTAMP');
        }
        
        // Set completed date when status changes to Completed
        if (updateData.renewal_status === 'Completed') {
          fields.push('renewal_completed_date = CURRENT_TIMESTAMP');
        }
      }

      if (updateData.payment_status !== undefined) {
        fields.push('payment_status = ?');
        params.push(updateData.payment_status);
        
        // Set payment date when payment is completed
        if (updateData.payment_status === 'Completed' && !updateData.payment_date) {
          fields.push('payment_date = CURRENT_TIMESTAMP');
        }
      }

      if (updateData.renewal_amount !== undefined) {
        fields.push('renewal_amount = ?');
        params.push(updateData.renewal_amount);
      }

      if (updateData.late_fee !== undefined) {
        fields.push('late_fee = ?');
        params.push(updateData.late_fee);
      }

      if (updateData.discount_amount !== undefined) {
        fields.push('discount_amount = ?');
        params.push(updateData.discount_amount);
      }

      if (updateData.payment_method !== undefined) {
        fields.push('payment_method = ?');
        params.push(updateData.payment_method);
      }

      if (updateData.payment_reference !== undefined) {
        fields.push('payment_reference = ?');
        params.push(updateData.payment_reference);
      }

      if (updateData.payment_date !== undefined) {
        fields.push('payment_date = ?');
        params.push(updateData.payment_date);
      }

      if (updateData.renewal_notes !== undefined) {
        fields.push('renewal_notes = ?');
        params.push(updateData.renewal_notes);
      }

      if (updateData.processed_by !== undefined) {
        fields.push('processed_by = ?');
        params.push(updateData.processed_by);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE membership_renewals SET ${fields.join(', ')} WHERE renewal_id = ?`;
      const result = await executeQuery(query, params);

      if (result.affectedRows > 0) {
        // Log the update in history
        await this.logRenewalActivity(
          id,
          currentRenewal.member_id,
          'Updated',
          'Renewal record updated',
          currentRenewal.renewal_status,
          updateData.renewal_status || currentRenewal.renewal_status,
          updateData.processed_by
        );
      }

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update renewal', error);
    }
  }

  // Log renewal activity in history
  static async logRenewalActivity(
    renewalId: number,
    memberId: number,
    activityType: string,
    description: string,
    oldStatus?: string,
    newStatus?: string,
    performedBy?: number,
    activityData?: any
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO renewal_history (
          renewal_id, member_id, activity_type, activity_description,
          old_status, new_status, activity_data, performed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        renewalId,
        memberId,
        activityType,
        description,
        oldStatus || null,
        newStatus || null,
        activityData ? JSON.stringify(activityData) : null,
        performedBy || null
      ];

      await executeQuery(query, params);
    } catch (error) {
      console.error('Failed to log renewal activity:', error);
      // Don't throw error as this is logging - shouldn't break main functionality
    }
  }

  // Get renewals due for processing
  static async getRenewalsDue(limit: number = 50, daysAhead: number = 30): Promise<RenewalDetails[]> {
    try {
      const query = `
        SELECT
          r.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          m.email_address as member_email,
          m.cell_number as member_phone,
          processor.name as processor_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          CASE
            WHEN r.renewal_due_date > CURDATE() THEN 'Not Due'
            WHEN r.renewal_due_date = CURDATE() THEN 'Due Today'
            WHEN r.renewal_due_date < CURDATE() AND (r.grace_period_end_date IS NULL OR r.grace_period_end_date >= CURDATE()) THEN 'Overdue'
            WHEN r.grace_period_end_date < CURDATE() THEN 'Expired'
            ELSE 'Unknown'
          END as renewal_urgency,
          DATEDIFF(CURDATE(), r.renewal_due_date) as days_overdue
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        LEFT JOIN users processor ON r.processed_by = processor.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE r.renewal_due_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND r.renewal_status IN ('Pending', 'Processing')
        ORDER BY r.renewal_due_date ASC
        LIMIT ?
      `;

      return await executeQuery<RenewalDetails>(query, [daysAhead, limit]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewals due', error);
    }
  }

  // Get overdue renewals
  static async getOverdueRenewals(limit: number = 50): Promise<RenewalDetails[]> {
    try {
      const query = `
        SELECT
          r.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          m.email_address as member_email,
          m.cell_number as member_phone,
          processor.name as processor_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name,
          'Overdue' as renewal_urgency,
          DATEDIFF(CURDATE(), r.renewal_due_date) as days_overdue
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        LEFT JOIN users processor ON r.processed_by = processor.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE r.renewal_due_date < CURDATE()
        AND r.renewal_status IN ('Pending', 'Processing')
        ORDER BY r.renewal_due_date ASC
        LIMIT ?
      `;

      return await executeQuery<RenewalDetails>(query, [limit]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch overdue renewals', error);
    }
  }

  // Get renewal statistics
  static async getRenewalStatistics(filters: { year?: number; ward_code?: string; municipal_code?: string; district_code?: string; province_code?: string } = {}): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.year) {
        whereClause += ' AND r.renewal_year = ?';
        params.push(filters.year);
      }

      if (filters.ward_code) {
        whereClause += ' AND m.ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipal_code) {
        whereClause += ' AND w.municipality_code = ?';
        params.push(filters.municipal_code);
      }

      if (filters.district_code) {
        whereClause += ' AND w.district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND w.province_code = ?';
        params.push(filters.province_code);
      }

      const query = `
        SELECT
          COUNT(*) as total_renewals,
          COUNT(CASE WHEN r.renewal_status = 'Completed' THEN 1 END) as completed_renewals,
          COUNT(CASE WHEN r.renewal_status = 'Pending' THEN 1 END) as pending_renewals,
          COUNT(CASE WHEN r.renewal_status = 'Processing' THEN 1 END) as processing_renewals,
          COUNT(CASE WHEN r.renewal_status = 'Failed' THEN 1 END) as failed_renewals,
          COUNT(CASE WHEN r.renewal_status = 'Expired' THEN 1 END) as expired_renewals,
          COUNT(CASE WHEN r.renewal_due_date < CURDATE() AND r.renewal_status != 'Completed' THEN 1 END) as overdue_renewals,
          COUNT(CASE WHEN r.grace_period_end_date IS NOT NULL AND r.grace_period_end_date >= CURDATE() THEN 1 END) as grace_period_renewals,
          SUM(r.renewal_amount) as total_revenue,
          SUM(CASE WHEN r.payment_status = 'Completed' THEN r.renewal_amount ELSE 0 END) as collected_revenue,
          AVG(r.renewal_amount) as average_renewal_amount,
          COUNT(CASE WHEN r.payment_status = 'Completed' THEN 1 END) as paid_renewals,
          ROUND((COUNT(CASE WHEN r.renewal_status = 'Completed' THEN 1 END) / COUNT(*)) * 100, 2) as completion_rate,
          ROUND((COUNT(CASE WHEN r.payment_status = 'Completed' THEN 1 END) / COUNT(*)) * 100, 2) as payment_rate
        FROM membership_renewals r
        LEFT JOIN members_consolidated m ON r.member_id = m.member_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get renewal statistics', error);
    }
  }

  // Create renewal reminder
  static async createReminder(reminderData: CreateReminderData): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_reminders (
          renewal_id, member_id, reminder_type, reminder_stage, scheduled_date,
          subject, message, template_used, delivery_channel, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        reminderData.renewal_id,
        reminderData.member_id,
        reminderData.reminder_type,
        reminderData.reminder_stage,
        reminderData.scheduled_date,
        reminderData.subject || null,
        reminderData.message || null,
        reminderData.template_used || null,
        reminderData.delivery_channel || null,
        reminderData.created_by || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create renewal reminder', error);
    }
  }

  // Get renewal reminders
  static async getRenewalReminders(renewalId: number): Promise<RenewalReminder[]> {
    try {
      const query = `
        SELECT * FROM renewal_reminders
        WHERE renewal_id = ?
        ORDER BY scheduled_date DESC
      `;

      return await executeQuery<RenewalReminder>(query, [renewalId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewal reminders', error);
    }
  }

  // Create renewal payment
  static async createPayment(paymentData: CreatePaymentData): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_payments (
          renewal_id, member_id, payment_amount, payment_method, payment_reference,
          payment_date, external_payment_id, gateway_response, transaction_fee,
          processed_by, payment_notes, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')
      `;

      const params = [
        paymentData.renewal_id,
        paymentData.member_id,
        paymentData.payment_amount,
        paymentData.payment_method,
        paymentData.payment_reference || null,
        paymentData.payment_date,
        paymentData.external_payment_id || null,
        paymentData.gateway_response || null,
        paymentData.transaction_fee || 0.00,
        paymentData.processed_by || null,
        paymentData.payment_notes || null
      ];

      const result = await executeQuery(query, params);

      // Update renewal payment status
      await this.updateRenewal(paymentData.renewal_id, {
        payment_status: 'Completed',
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference,
        payment_date: paymentData.payment_date,
        processed_by: paymentData.processed_by
      });

      // Log payment in history
      await this.logRenewalActivity(
        paymentData.renewal_id,
        paymentData.member_id,
        'Payment_Received',
        `Payment of ${paymentData.payment_amount} received via ${paymentData.payment_method}`,
        undefined,
        undefined,
        paymentData.processed_by,
        { payment_amount: paymentData.payment_amount, payment_method: paymentData.payment_method }
      );

      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create renewal payment', error);
    }
  }

  // Get renewal payments
  static async getRenewalPayments(renewalId: number): Promise<RenewalPayment[]> {
    try {
      const query = `
        SELECT * FROM renewal_payments
        WHERE renewal_id = ?
        ORDER BY payment_date DESC
      `;

      return await executeQuery<RenewalPayment>(query, [renewalId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewal payments', error);
    }
  }

  // Get renewal history
  static async getRenewalHistory(renewalId: number): Promise<any[]> {
    try {
      const query = `
        SELECT
          rh.*,
          u.name as performed_by_name
        FROM renewal_history rh
        LEFT JOIN users u ON rh.performed_by = u.id
        WHERE rh.renewal_id = ?
        ORDER BY rh.activity_timestamp DESC
      `;

      return await executeQuery(query, [renewalId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch renewal history', error);
    }
  }

  // Delete renewal
  static async deleteRenewal(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM membership_renewals WHERE renewal_id = ?';
      const result = await executeQuery(query, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete renewal', error);
    }
  }

  // Bulk create renewals for a year
  static async bulkCreateRenewalsForYear(year: number, createdBy?: number): Promise<{ successful: number; failed: number; errors: string[] }> {
    try {
      // Get all active memberships that need renewal
      const membershipsQuery = `
        SELECT
          ms.membership_id,
          ms.member_id,
          ms.membership_amount,
          DATE_ADD(ms.expiry_date, INTERVAL 1 YEAR) as new_due_date
        FROM memberships ms
        LEFT JOIN membership_renewals mr ON ms.membership_id = mr.membership_id AND mr.renewal_year = ?
        WHERE ms.status_id = 1 -- Good Standing
        AND mr.renewal_id IS NULL -- No existing renewal for this year
      `;

      const memberships = await executeQuery(membershipsQuery, [year]);

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const membership of memberships) {
        try {
          await this.createRenewal({
            membership_id: membership.membership_id,
            member_id: membership.member_id,
            renewal_year: year,
            renewal_due_date: membership.new_due_date,
            renewal_amount: membership.membership_amount || 10.00
          });
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Member ${membership.member_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { successful, failed, errors };
    } catch (error) {
      throw createDatabaseError('Failed to bulk create renewals', error);
    }
  }
}
