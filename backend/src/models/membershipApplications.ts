import { executeQuery, executeQuerySingle } from '../config/database';
import { executeUpdate } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';

// Membership Application interfaces
export interface MembershipApplication {
  id: number;
  application_number: string;
  first_name: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  email?: string;
  cell_number: string;
  alternative_number?: string;
  residential_address: string;
  postal_address?: string;
  ward_code: string;
  application_type: 'New' | 'Renewal' | 'Transfer';
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipApplicationDetails extends MembershipApplication {
  ward_name: string;
  municipality_name: string;
  region_name: string;
  province_name: string;
  reviewer_name?: string;
  documents?: ApplicationDocument[];
}

export interface ApplicationDocument {
  id: number;
  document_type: 'ID Copy' | 'Proof of Address' | 'Profile Photo' | 'Supporting Document';
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'Active' | 'Archived' | 'Deleted';
  uploaded_at: string;
}

export interface CreateApplicationData {
  first_name: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  email?: string;
  cell_number: string;
  alternative_number?: string;
  residential_address: string;
  postal_address?: string;
  ward_code: string;
  application_type?: 'New' | 'Renewal' | 'Transfer';
  // Enhanced Personal Information fields
  language_id?: number;
  occupation_id?: number;
  qualification_id?: number;
  citizenship_status?: 'South African Citizen' | 'Foreign National' | 'Permanent Resident';
  // Party Declaration fields
  signature_type?: 'typed' | 'drawn';
  signature_data?: string;
  declaration_accepted?: boolean;
  constitution_accepted?: boolean;
  // Membership Details fields
  hierarchy_level?: string;
  entity_name?: string;
  membership_type?: 'Regular' | 'Associate' | 'Student' | 'Senior';
  reason_for_joining?: string;
  skills_experience?: string;
  referred_by?: string;
  // Payment Information fields
  payment_method?: string;
  payment_reference?: string;
  last_payment_date?: string;
  payment_amount?: number;
  payment_notes?: string;
  // Geographic fields
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  voting_district_code?: string;
}

export interface UpdateApplicationData {
  first_name?: string;
  last_name?: string;
  id_number?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  email?: string;
  cell_number?: string;
  alternative_number?: string;
  residential_address?: string;
  postal_address?: string;
  ward_code?: string;
  application_type?: 'New' | 'Renewal' | 'Transfer';
  admin_notes?: string;
  // Enhanced Personal Information fields
  language_id?: number;
  occupation_id?: number;
  qualification_id?: number;
  citizenship_status?: 'South African Citizen' | 'Foreign National' | 'Permanent Resident';
  // Party Declaration fields
  signature_type?: 'typed' | 'drawn';
  signature_data?: string;
  declaration_accepted?: boolean;
  constitution_accepted?: boolean;
  // Membership Details fields
  hierarchy_level?: string;
  entity_name?: string;
  membership_type?: 'Regular' | 'Associate' | 'Student' | 'Senior';
  reason_for_joining?: string;
  skills_experience?: string;
  referred_by?: string;
  // Payment Information fields
  payment_method?: string;
  payment_reference?: string;
  last_payment_date?: string;
  payment_amount?: number;
  payment_notes?: string;
  // Geographic fields
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  voting_district_code?: string;
}

export interface ApplicationReviewData {
  status: 'Approved' | 'Rejected';
  rejection_reason?: string;
  admin_notes?: string;
  reviewed_by: number;
}

export interface ApplicationDetails extends MembershipApplication {
  ward_name?: string;
  municipality_name?: string;
  region_name?: string;
  province_name?: string;
  reviewer_name?: string;
}

export interface ApplicationFilters {
  status?: string;
  application_type?: string;
  ward_code?: string;
  municipal_code?: string;
  district_code?: string;
  province_code?: string;
  submitted_after?: string;
  submitted_before?: string;
  search?: string;
}

// Membership Application model class
export class MembershipApplicationModel {
  // Generate unique application number
  static generateApplicationNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `APP${timestamp.slice(-8)}${random}`;
  }

  // Create new membership application
  static async createApplication(applicationData: CreateApplicationData): Promise<number> {
    try {
      // Check for duplicate ID number in existing applications
      const existingApplication = await this.getApplicationByIdNumber(applicationData.id_number);
      if (existingApplication && existingApplication.status !== 'Rejected') {
        throw new Error('An application with this ID number already exists');
      }

      const applicationNumber = this.generateApplicationNumber();

      // Determine payment_status based on whether payment info is provided
      const hasPaymentInfo = applicationData.payment_method &&
                            applicationData.payment_reference &&
                            applicationData.payment_amount;
      const paymentStatus = hasPaymentInfo ? 'Completed' : 'Pending';

      const query = `
        INSERT INTO membership_applications (
          application_number, first_name, last_name, id_number, date_of_birth,
          gender, language_id, occupation_id, qualification_id, citizenship_status,
          email, cell_number, alternative_number, residential_address,
          postal_address, ward_code, application_type, status,
          signature_type, signature_data, declaration_accepted, constitution_accepted,
          hierarchy_level, entity_name, membership_type, reason_for_joining,
          skills_experience, referred_by, payment_method, payment_reference,
          last_payment_date, payment_amount, payment_notes, payment_status, province_code,
          district_code, municipal_code, voting_district_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Draft', $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
        RETURNING application_id
      `;

      const params = [
        applicationNumber,
        applicationData.first_name,
        applicationData.last_name,
        applicationData.id_number,
        applicationData.date_of_birth,
        applicationData.gender,
        // Enhanced Personal Information fields
        applicationData.language_id || null,
        applicationData.occupation_id || null,
        applicationData.qualification_id || null,
        applicationData.citizenship_status || null,
        applicationData.email || null,
        applicationData.cell_number,
        applicationData.alternative_number || null,
        applicationData.residential_address,
        applicationData.postal_address || null,
        applicationData.ward_code,
        applicationData.application_type || 'New',
        // Party Declaration fields
        applicationData.signature_type || null,
        applicationData.signature_data || null,
        applicationData.declaration_accepted || false,
        applicationData.constitution_accepted || false,
        // Membership Details fields
        applicationData.hierarchy_level || null,
        applicationData.entity_name || null,
        applicationData.membership_type || 'Regular',
        applicationData.reason_for_joining || null,
        applicationData.skills_experience || null,
        applicationData.referred_by || null,
        // Payment Information fields
        applicationData.payment_method || null,
        applicationData.payment_reference || null,
        applicationData.last_payment_date || null,
        applicationData.payment_amount || null,
        applicationData.payment_notes || null,
        paymentStatus, // payment_status
        // Geographic fields
        applicationData.province_code || null,
        applicationData.district_code || null,
        applicationData.municipal_code || null,
        applicationData.voting_district_code || null
      ];

      console.log('🔍 DEBUG: Executing INSERT query with RETURNING...');
      const result = await executeQuery<{ application_id: number }>(query, params);
      console.log('🔍 DEBUG: INSERT result:', JSON.stringify(result));

      // PostgreSQL returns the inserted row with RETURNING clause
      if (result && result.length > 0 && result[0].application_id) {
        console.log('✅ DEBUG: Application ID retrieved:', result[0].application_id);
        return result[0].application_id;
      }

      console.error('❌ DEBUG: Failed to get application ID. Result:', result);
      throw new Error('Failed to get application ID after insert');
    } catch (error) {
      throw createDatabaseError('Failed to create membership application', error);
    }
  }

  // Get application by ID with full details
  static async getApplicationById(id: number): Promise<MembershipApplicationDetails | null> {
    try {
      // Query with geographic joins to get location names
      const query = `
        SELECT
          ma.application_id as id,
          ma.application_number,
          ma.first_name,
          ma.last_name,
          ma.id_number,
          ma.date_of_birth,
          ma.gender_id,
          COALESCE(g.gender_name, 'Unknown') as gender,
          ma.language_id,
          ma.occupation_id,
          ma.qualification_id,
          ma.citizenship_status,
          ma.email,
          ma.cell_number,
          ma.alternative_number,
          ma.residential_address,
          ma.postal_address,
          ma.ward_code,
          ma.application_type,
          ma.status,
          ma.signature_type,
          ma.signature_data,
          ma.declaration_accepted,
          ma.constitution_accepted,
          ma.hierarchy_level,
          ma.entity_name,
          ma.membership_type,
          ma.reason_for_joining,
          ma.skills_experience,
          ma.referred_by,
          ma.payment_method,
          ma.payment_reference,
          ma.last_payment_date,
          ma.payment_amount,
          ma.payment_notes,
          ma.province_code,
          ma.district_code,
          ma.municipal_code,
          ma.voting_district_code,
          ma.created_at,
          ma.updated_at,
          ma.reviewed_by,
          ma.reviewed_at,
          ma.admin_notes,
          w.ward_name,
          m.municipality_name,
          d.district_name,
          p.province_name,
          u.name as reviewer_name
        FROM membership_applications ma
        LEFT JOIN wards w ON ma.ward_code = w.ward_code
        LEFT JOIN municipalities m ON ma.municipal_code = m.municipality_code
        LEFT JOIN districts d ON ma.district_code = d.district_code
        LEFT JOIN provinces p ON ma.province_code = p.province_code
        LEFT JOIN genders g ON ma.gender_id = g.gender_id
        LEFT JOIN users u ON ma.reviewed_by = u.user_id
        WHERE ma.application_id = $1
      `;

      const application = await executeQuerySingle<MembershipApplicationDetails>(query, [id]);

      if (application) {
        // Get associated documents
        application.documents = await this.getApplicationDocuments(application.id);
      }

      return application;
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership application', error);
    }
  }

  // Get application by application number
  static async getApplicationByNumber(applicationNumber: string): Promise<MembershipApplicationDetails | null> {
    try {
      // Simplified query without problematic joins
      const query = `
        SELECT
          ma.*,
          NULL as ward_name,
          NULL as municipality_name,
          NULL as district_name,
          NULL as province_name,
          NULL as reviewer_name
        FROM membership_applications ma
        WHERE ma.application_number = $1
      `;

      const application = await executeQuerySingle<MembershipApplicationDetails>(query, [applicationNumber]);

      if (application) {
        application.documents = await this.getApplicationDocuments(application.id);
      }

      return application;
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership application by number', error);
    }
  }

  // Get application by ID number
  static async getApplicationByIdNumber(idNumber: string): Promise<MembershipApplication | null> {
    try {
      const query = `
        SELECT * FROM membership_applications
        WHERE id_number = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      return await executeQuerySingle<MembershipApplication>(query, [idNumber]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership application by ID number', error);
    }
  }

  // Update membership application
  static async updateApplication(id: number, applicationData: UpdateApplicationData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (applicationData.first_name !== undefined) {
        fields.push(`first_name = $${paramIndex++}`);
        params.push(applicationData.first_name);
      }

      if (applicationData.last_name !== undefined) {
        fields.push(`last_name = $${paramIndex++}`);
        params.push(applicationData.last_name);
      }

      if (applicationData.id_number !== undefined) {
        fields.push(`id_number = $${paramIndex++}`);
        params.push(applicationData.id_number);
      }

      if (applicationData.date_of_birth !== undefined) {
        fields.push(`date_of_birth = $${paramIndex++}`);
        params.push(applicationData.date_of_birth);
      }

      if (applicationData.gender !== undefined) {
        fields.push(`gender = $${paramIndex++}`);
        params.push(applicationData.gender);
      }

      if (applicationData.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        params.push(applicationData.email);
      }

      if (applicationData.cell_number !== undefined) {
        fields.push(`cell_number = $${paramIndex++}`);
        params.push(applicationData.cell_number);
      }

      if (applicationData.alternative_number !== undefined) {
        fields.push(`alternative_number = $${paramIndex++}`);
        params.push(applicationData.alternative_number);
      }

      if (applicationData.residential_address !== undefined) {
        fields.push(`residential_address = $${paramIndex++}`);
        params.push(applicationData.residential_address);
      }

      if (applicationData.postal_address !== undefined) {
        fields.push(`postal_address = $${paramIndex++}`);
        params.push(applicationData.postal_address);
      }

      if (applicationData.ward_code !== undefined) {
        fields.push(`ward_code = $${paramIndex++}`);
        params.push(applicationData.ward_code);
      }

      if (applicationData.application_type !== undefined) {
        fields.push(`application_type = $${paramIndex++}`);
        params.push(applicationData.application_type);
      }

      if (applicationData.admin_notes !== undefined) {
        fields.push(`admin_notes = $${paramIndex++}`);
        params.push(applicationData.admin_notes);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE membership_applications SET ${fields.join(', ')} WHERE application_id = $${paramIndex}`;
      const result = await executeUpdate(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update membership application', error);
    }
  }

  // Submit application (change status from Draft to Submitted)
  static async submitApplication(id: number): Promise<boolean> {
    try {
      const query = `
        UPDATE membership_applications
        SET status = 'Submitted', submitted_at = CURRENT_TIMESTAMP
        WHERE application_id = $1 AND status = 'Draft'
      `;

      const result = await executeUpdate(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to submit membership application', error);
    }
  }

  // Review application (approve or reject)
  static async reviewApplication(id: number, reviewData: ApplicationReviewData): Promise<boolean> {
    try {
      const query = `
        UPDATE membership_applications
        SET
          status = $1,
          rejection_reason = $2,
          admin_notes = $3,
          reviewed_by = $4,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE application_id = $5 AND status IN ('Submitted', 'Under Review')
      `;

      const params = [
        reviewData.status,
        reviewData.rejection_reason || null,
        reviewData.admin_notes || null,
        reviewData.reviewed_by,
        id
      ];

      const result = await executeUpdate(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to review membership application', error);
    }
  }

  // Set application status to Under Review
  static async setUnderReview(id: number, reviewedBy: number): Promise<boolean> {
    try {
      const query = `
        UPDATE membership_applications
        SET status = 'Under Review', reviewed_by = $1
        WHERE application_id = $2 AND status = 'Submitted'
      `;

      const result = await executeUpdate(query, [reviewedBy, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to set application under review', error);
    }
  }

  // Get application documents
  static async getApplicationDocuments(applicationId: number): Promise<ApplicationDocument[]> {
    try {
      const query = `
        SELECT
          document_id as id, document_type, original_filename, stored_filename,
          file_path, file_size, mime_type, status, uploaded_at
        FROM documents
        WHERE application_id = $1 AND status = 'Active'
        ORDER BY uploaded_at DESC
      `;

      return await executeQuery<ApplicationDocument>(query, [applicationId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch application documents', error);
    }
  }

  // Delete application (soft delete by changing status to Rejected)
  static async deleteApplication(id: number): Promise<boolean> {
    try {
      // First check if application exists and is not already approved
      const checkQuery = `
        SELECT application_id, status
        FROM membership_applications
        WHERE application_id = $1
      `;

      const application = await executeQuerySingle<{ application_id: number; status: string }>(checkQuery, [id]);

      if (!application) {
        return false; // Application not found
      }

      // Don't allow deletion of approved applications
      if (application.status === 'Approved') {
        return false;
      }

      // If already rejected, consider it as successfully deleted
      if (application.status === 'Rejected') {
        return true;
      }

      // Otherwise, soft delete by changing status to Rejected
      const query = `
        UPDATE membership_applications
        SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP
        WHERE application_id = $1 AND status IN ('Draft', 'Submitted', 'Under Review')
      `;

      const result = await executeUpdate(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete membership application', error);
    }
  }

  // Get all applications with filtering and pagination
  static async getAllApplications(
    limit: number = 20,
    offset: number = 0,
    filters: ApplicationFilters = {}
  ): Promise<ApplicationDetails[]> {
    try {
      // Build WHERE clause based on filters
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.application_type) {
        whereClause += ` AND application_type = $${paramIndex}`;
        queryParams.push(filters.application_type);
        paramIndex++;
      }

      if (filters.ward_code) {
        whereClause += ` AND ward_code = $${paramIndex}`;
        queryParams.push(filters.ward_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        whereClause += ` AND municipal_code = $${paramIndex}`;
        queryParams.push(filters.municipal_code);
        paramIndex++;
      }

      if (filters.district_code) {
        whereClause += ` AND district_code = $${paramIndex}`;
        queryParams.push(filters.district_code);
        paramIndex++;
      }

      if (filters.province_code) {
        whereClause += ` AND province_code = $${paramIndex}`;
        queryParams.push(filters.province_code);
        paramIndex++;
      }

      if (filters.submitted_after) {
        whereClause += ` AND submitted_at >= $${paramIndex}`;
        queryParams.push(filters.submitted_after);
        paramIndex++;
      }

      if (filters.submitted_before) {
        whereClause += ` AND submitted_at <= $${paramIndex}`;
        queryParams.push(filters.submitted_before);
        paramIndex++;
      }

      if (filters.search) {
        whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR id_number ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Add limit and offset
      queryParams.push(limit, offset);

      const query = `
        SELECT
          application_id as id,
          application_number,
          first_name,
          last_name,
          email,
          cell_number,
          id_number,
          status,
          application_type,
          membership_type,
          created_at,
          submitted_at,
          reviewed_at
        FROM membership_applications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const results = await executeQuery<any[]>(query, queryParams);

      // Transform results to match expected interface
      return results.map(row => ({
        ...row,
        ward_name: null,
        municipality_name: null,
        district_name: null,
        province_name: null,
        reviewer_name: null
      }));
    } catch (error) {
      throw createDatabaseError('Failed to fetch applications', error);
    }
  }

  // Get application count with filters
  static async getApplicationCount(filters: ApplicationFilters = {}): Promise<number> {
    try {
      // Build WHERE clause based on filters
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.application_type) {
        whereClause += ` AND application_type = $${paramIndex}`;
        queryParams.push(filters.application_type);
        paramIndex++;
      }

      if (filters.ward_code) {
        whereClause += ` AND ward_code = $${paramIndex}`;
        queryParams.push(filters.ward_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        whereClause += ` AND municipal_code = $${paramIndex}`;
        queryParams.push(filters.municipal_code);
        paramIndex++;
      }

      if (filters.district_code) {
        whereClause += ` AND district_code = $${paramIndex}`;
        queryParams.push(filters.district_code);
        paramIndex++;
      }

      if (filters.province_code) {
        whereClause += ` AND province_code = $${paramIndex}`;
        queryParams.push(filters.province_code);
        paramIndex++;
      }

      if (filters.submitted_after) {
        whereClause += ` AND submitted_at >= $${paramIndex}`;
        queryParams.push(filters.submitted_after);
        paramIndex++;
      }

      if (filters.submitted_before) {
        whereClause += ` AND submitted_at <= $${paramIndex}`;
        queryParams.push(filters.submitted_before);
        paramIndex++;
      }

      if (filters.search) {
        whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR id_number ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      const query = `SELECT COUNT(*) as count FROM membership_applications ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, queryParams);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get application count', error);
    }
  }

  // Get application statistics
  static async getApplicationStatistics(filters: { ward_code?: string; municipality_id?: number; region_id?: number; province_id?: number } = {}): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.ward_code) {
        whereClause += ` AND ma.ward_code = $${paramIndex++}`;
        params.push(filters.ward_code);
      }

      if (filters.municipality_id) {
        whereClause += ` AND w.municipality_id = $${paramIndex++}`;
        params.push(filters.municipality_id);
      }

      if (filters.region_id) {
        whereClause += ` AND m.region_id = $${paramIndex++}`;
        params.push(filters.region_id);
      }

      if (filters.province_id) {
        whereClause += ` AND r.province_id = $${paramIndex++}`;
        params.push(filters.province_id);
      }

      const query = `
        SELECT
          COUNT(*) as total_applications,
          SUM(CASE WHEN ma.status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN ma.status = 'Submitted' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN ma.status = 'Under Review' THEN 1 ELSE 0 END) as under_review_count,
          SUM(CASE WHEN ma.status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN ma.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
          SUM(CASE WHEN ma.application_type = 'New' THEN 1 ELSE 0 END) as new_applications,
          SUM(CASE WHEN ma.application_type = 'Renewal' THEN 1 ELSE 0 END) as renewal_applications,
          SUM(CASE WHEN ma.application_type = 'Transfer' THEN 1 ELSE 0 END) as transfer_applications
        FROM membership_applications ma
        LEFT JOIN wards w ON ma.ward_code = w.ward_code
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get application statistics', error);
    }
  }
}
