import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import * as crypto from 'crypto';
import * as path from 'path';

// Document interfaces
export interface DocumentCategory {
  category_id: number;
  category_name: string;
  category_code: string;
  description?: string;
  allowed_file_types: string[];
  max_file_size_mb: number;
  requires_approval: boolean;
  retention_days?: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  document_id: number;
  document_name: string;
  original_filename: string;
  file_path: string;
  file_size_bytes: number;
  file_type: string;
  mime_type: string;
  file_hash: string;
  category_id: number;
  uploaded_by: number;
  member_id?: number;
  entity_type?: 'member' | 'application' | 'meeting' | 'renewal' | 'system' | 'user';
  entity_id?: number;
  status: 'pending' | 'approved' | 'rejected' | 'archived' | 'deleted';
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  description?: string;
  tags?: string[];
  is_public: boolean;
  is_sensitive: boolean;
  version_number: number;
  parent_document_id?: number;
  is_current_version: boolean;
  access_level: 'public' | 'members' | 'admins' | 'restricted';
  allowed_roles?: string[];
  allowed_users?: number[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DocumentDetails extends Document {
  category_name: string;
  category_code: string;
  uploaded_by_name: string;
  approved_by_name?: string;
  member_name?: string;
  status_display: string;
}

export interface CreateDocumentData {
  document_name: string;
  original_filename: string;
  file_path: string;
  file_size_bytes: number;
  file_type: string;
  mime_type: string;
  file_hash: string;
  category_id: number;
  uploaded_by: number;
  member_id?: number;
  entity_type?: 'member' | 'application' | 'meeting' | 'renewal' | 'system' | 'user';
  entity_id?: number;
  description?: string;
  tags?: string[];
  is_public?: boolean;
  is_sensitive?: boolean;
  access_level?: 'public' | 'members' | 'admins' | 'restricted';
  allowed_roles?: string[];
  allowed_users?: number[];
}

export interface UpdateDocumentData {
  document_name?: string;
  description?: string;
  tags?: string[];
  is_public?: boolean;
  is_sensitive?: boolean;
  access_level?: 'public' | 'members' | 'admins' | 'restricted';
  allowed_roles?: string[];
  allowed_users?: number[];
  status?: 'pending' | 'approved' | 'rejected' | 'archived';
  approved_by?: number;
  rejection_reason?: string;
}

export interface DocumentFilters {
  category_id?: number;
  uploaded_by?: number;
  member_id?: number;
  entity_type?: string;
  entity_id?: number;
  status?: string;
  is_public?: boolean;
  is_sensitive?: boolean;
  access_level?: string;
  file_type?: string;
  created_from?: string;
  created_to?: string;
  search?: string;
  tags?: string[];
}

// Document Model
export class DocumentModel {
  // Get document categories
  static async getCategories(): Promise<DocumentCategory[]> {
    try {
      const query = `
        SELECT
          category_id,
          category_name,
          category_code,
          description,
          allowed_file_types,
          max_file_size_mb,
          requires_approval,
          retention_days,
          is_active,
          display_order,
          created_at,
          updated_at
        FROM document_categories
        WHERE is_active = TRUE
        ORDER BY display_order ASC, category_name ASC
      `;

      const results = await executeQuery(query);
      return results.map((result: any) => ({
        ...result,
        allowed_file_types: JSON.parse(result.allowed_file_types || '[]'),
        requires_approval: Boolean(result.requires_approval)
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get document categories', error);
    }
  }

  // Create document
  static async createDocument(documentData: CreateDocumentData): Promise<number> {
    try {
      const query = `
        INSERT INTO documents (
          document_name, original_filename, file_path, file_size_bytes, file_type, mime_type, file_hash,
          category_id, uploaded_by, member_id, entity_type, entity_id, description, tags,
          is_public, is_sensitive, access_level, allowed_roles, allowed_users
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        documentData.document_name,
        documentData.original_filename,
        documentData.file_path,
        documentData.file_size_bytes,
        documentData.file_type,
        documentData.mime_type,
        documentData.file_hash,
        documentData.category_id,
        documentData.uploaded_by,
        documentData.member_id || null,
        documentData.entity_type || null,
        documentData.entity_id || null,
        documentData.description || null,
        documentData.tags ? JSON.stringify(documentData.tags) : null,
        documentData.is_public || false,
        documentData.is_sensitive || false,
        documentData.access_level || 'members',
        documentData.allowed_roles ? JSON.stringify(documentData.allowed_roles) : null,
        documentData.allowed_users ? JSON.stringify(documentData.allowed_users) : null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create document', error);
    }
  }

  // Get document by ID
  static async getDocumentById(id: number): Promise<DocumentDetails | null> {
    try {
      const query = `
        SELECT
          d.*,
          dc.category_name,
          dc.category_code,
          uploader.name as uploaded_by_name,
          approver.name as approved_by_name,
          CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')) as member_name,
          CASE
            WHEN d.deleted_at IS NOT NULL THEN 'Deleted'
            WHEN d.status = 'approved' THEN 'Approved'
            WHEN d.status = 'rejected' THEN 'Rejected'
            WHEN d.status = 'pending' THEN 'Pending Approval'
            WHEN d.status = 'archived' THEN 'Archived'
            ELSE 'Unknown'
          END as status_display
        FROM documents d
        LEFT JOIN document_categories dc ON d.category_id = dc.category_id
        LEFT JOIN users uploader ON d.uploaded_by = uploader.id
        LEFT JOIN users approver ON d.approved_by = approver.id
        LEFT JOIN members_consolidated m ON d.member_id = m.member_id
        WHERE d.document_id = ? AND d.deleted_at IS NULL
      `;

      const result = await executeQuerySingle(query, [id]);
      if (result) {
        return {
          ...result,
          tags: result.tags ? JSON.parse(result.tags) : [],
          allowed_roles: result.allowed_roles ? JSON.parse(result.allowed_roles) : [],
          allowed_users: result.allowed_users ? JSON.parse(result.allowed_users) : [],
          is_public: Boolean(result.is_public),
          is_sensitive: Boolean(result.is_sensitive),
          is_current_version: Boolean(result.is_current_version)
        };
      }
      return null;
    } catch (error) {
      throw createDatabaseError('Failed to get document', error);
    }
  }



  // Get documents with filtering
  static async getDocuments(
    limit: number = 20,
    offset: number = 0,
    filters: DocumentFilters = {}
  ): Promise<DocumentDetails[]> {
    try {
      let whereClause = 'WHERE d.deleted_at IS NULL';
      const params: any[] = [];

      if (filters.category_id) {
        whereClause += ' AND d.category_id = ?';
        params.push(filters.category_id);
      }

      if (filters.uploaded_by) {
        whereClause += ' AND d.uploaded_by = ?';
        params.push(filters.uploaded_by);
      }

      if (filters.member_id) {
        whereClause += ' AND d.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.entity_type) {
        whereClause += ' AND d.entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.entity_id) {
        whereClause += ' AND d.entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.status) {
        whereClause += ' AND d.status = ?';
        params.push(filters.status);
      }

      if (filters.is_public !== undefined) {
        whereClause += ' AND d.is_public = ?';
        params.push(filters.is_public);
      }

      if (filters.is_sensitive !== undefined) {
        whereClause += ' AND d.is_sensitive = ?';
        params.push(filters.is_sensitive);
      }

      if (filters.access_level) {
        whereClause += ' AND d.access_level = ?';
        params.push(filters.access_level);
      }

      if (filters.file_type) {
        whereClause += ' AND d.file_type = ?';
        params.push(filters.file_type);
      }

      if (filters.created_from) {
        whereClause += ' AND d.created_at >= ?';
        params.push(filters.created_from);
      }

      if (filters.created_to) {
        whereClause += ' AND d.created_at <= ?';
        params.push(filters.created_to);
      }

      if (filters.search) {
        whereClause += ' AND (d.document_name LIKE ? OR d.original_filename LIKE ? OR d.description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT
          d.*,
          dc.category_name,
          dc.category_code,
          uploader.name as uploaded_by_name,
          approver.name as approved_by_name,
          CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')) as member_name,
          CASE
            WHEN d.deleted_at IS NOT NULL THEN 'Deleted'
            WHEN d.status = 'approved' THEN 'Approved'
            WHEN d.status = 'rejected' THEN 'Rejected'
            WHEN d.status = 'pending' THEN 'Pending Approval'
            WHEN d.status = 'archived' THEN 'Archived'
            ELSE 'Unknown'
          END as status_display
        FROM documents d
        LEFT JOIN document_categories dc ON d.category_id = dc.category_id
        LEFT JOIN users uploader ON d.uploaded_by = uploader.id
        LEFT JOIN users approver ON d.approved_by = approver.id
        LEFT JOIN members_consolidated m ON d.member_id = m.member_id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const results = await executeQuery(query, params);

      return results.map((result: any) => ({
        ...result,
        tags: result.tags ? JSON.parse(result.tags) : [],
        allowed_roles: result.allowed_roles ? JSON.parse(result.allowed_roles) : [],
        allowed_users: result.allowed_users ? JSON.parse(result.allowed_users) : [],
        is_public: Boolean(result.is_public),
        is_sensitive: Boolean(result.is_sensitive),
        is_current_version: Boolean(result.is_current_version)
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get documents', error);
    }
  }

  // Get document count
  static async getDocumentCount(filters: DocumentFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE d.deleted_at IS NULL';
      const params: any[] = [];

      // Apply same filters as getDocuments
      if (filters.category_id) {
        whereClause += ' AND d.category_id = ?';
        params.push(filters.category_id);
      }

      if (filters.uploaded_by) {
        whereClause += ' AND d.uploaded_by = ?';
        params.push(filters.uploaded_by);
      }

      if (filters.member_id) {
        whereClause += ' AND d.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.entity_type) {
        whereClause += ' AND d.entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.entity_id) {
        whereClause += ' AND d.entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.status) {
        whereClause += ' AND d.status = ?';
        params.push(filters.status);
      }

      if (filters.search) {
        whereClause += ' AND (d.document_name LIKE ? OR d.original_filename LIKE ? OR d.description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const query = `SELECT COUNT(*) as count FROM documents d ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get document count', error);
    }
  }

  // Update document
  static async updateDocument(id: number, updateData: UpdateDocumentData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.document_name !== undefined) {
        fields.push('document_name = ?');
        params.push(updateData.document_name);
      }

      if (updateData.description !== undefined) {
        fields.push('description = ?');
        params.push(updateData.description);
      }

      if (updateData.tags !== undefined) {
        fields.push('tags = ?');
        params.push(JSON.stringify(updateData.tags));
      }

      if (updateData.is_public !== undefined) {
        fields.push('is_public = ?');
        params.push(updateData.is_public);
      }

      if (updateData.is_sensitive !== undefined) {
        fields.push('is_sensitive = ?');
        params.push(updateData.is_sensitive);
      }

      if (updateData.access_level !== undefined) {
        fields.push('access_level = ?');
        params.push(updateData.access_level);
      }

      if (updateData.allowed_roles !== undefined) {
        fields.push('allowed_roles = ?');
        params.push(JSON.stringify(updateData.allowed_roles));
      }

      if (updateData.allowed_users !== undefined) {
        fields.push('allowed_users = ?');
        params.push(JSON.stringify(updateData.allowed_users));
      }

      if (updateData.status !== undefined) {
        fields.push('status = ?');
        params.push(updateData.status);

        if (updateData.status === 'approved' && updateData.approved_by) {
          fields.push('approved_by = ?', 'approved_at = CURRENT_TIMESTAMP');
          params.push(updateData.approved_by);
        }
      }

      if (updateData.rejection_reason !== undefined) {
        fields.push('rejection_reason = ?');
        params.push(updateData.rejection_reason);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE documents SET ${fields.join(', ')} WHERE document_id = ? AND deleted_at IS NULL`;
      const result = await executeQuery(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update document', error);
    }
  }

  // Soft delete document
  static async deleteDocument(id: number): Promise<boolean> {
    try {
      const query = 'UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE document_id = ? AND deleted_at IS NULL';
      const result = await executeQuery(query, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete document', error);
    }
  }

  // Generate file hash
  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // Get file extension
  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase().substring(1);
  }

  // Validate file type
  static async validateFileType(categoryId: number, fileType: string): Promise<boolean> {
    try {
      const query = 'SELECT allowed_file_types FROM document_categories WHERE category_id = ? AND is_active = TRUE';
      const result = await executeQuerySingle(query, [categoryId]);

      if (!result) return false;

      const allowedTypes = JSON.parse(result.allowed_file_types || '[]');
      return allowedTypes.includes(fileType.toLowerCase());
    } catch (error) {
      return false;
    }
  }

  // Validate file size
  static async validateFileSize(categoryId: number, fileSizeBytes: number): Promise<boolean> {
    try {
      const query = 'SELECT max_file_size_mb FROM document_categories WHERE category_id = ? AND is_active = TRUE';
      const result = await executeQuerySingle(query, [categoryId]);

      if (!result) return false;

      const maxSizeMB = result.max_file_size_mb;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      return fileSizeBytes <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }

}
