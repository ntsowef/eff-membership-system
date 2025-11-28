import { DocumentModel, CreateDocumentData, UpdateDocumentData, DocumentFilters } from '../models/documents';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadData {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface DocumentUploadRequest {
  file: FileUploadData;
  document_name: string;
  category_id: number;
  uploaded_by: number;
  member_id?: number;
  entity_type: 'member' | 'application' | 'meeting' | 'renewal' | 'system' | 'user';
  entity_id?: number;
  description?: string;
  tags?: string[];
  is_public?: boolean;
  is_sensitive?: boolean;
  access_level: 'public' | 'members' | 'admins' | 'restricted';
  allowed_roles?: string[];
  allowed_users?: number[];
}

export class DocumentService {
  private static readonly UPLOAD_DIR = process.env.DOCUMENT_UPLOAD_DIR || './uploads/documents';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB default max

  // Initialize upload directory
  static async initializeUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      
      // Create subdirectories for organization
      const subdirs = ['identity', 'applications', 'meetings', 'reports', 'photos', 'temp'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(this.UPLOAD_DIR, subdir), { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize upload directory:', error);
      throw error;
    }
  }

  // Upload and create document
  static async uploadDocument(uploadRequest: DocumentUploadRequest): Promise<number> {
    try {
      const { file, ...documentData } = uploadRequest;

      // Validate file
      await this.validateFile(file, documentData.category_id);

      // Generate file hash
      const fileHash = DocumentModel.generateFileHash(file.buffer);

      // Check for duplicate files
      const existingDoc = await this.findDocumentByHash(fileHash);
      if (existingDoc) {
        throw new ValidationError('A document with identical content already exists');
      }

      // Generate unique filename and path
      const fileExtension = DocumentModel.getFileExtension(file.originalname);
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      const categoryCode = await this.getCategoryCode(documentData.category_id);
      const filePath = path.join(this.UPLOAD_DIR, categoryCode, uniqueFilename);

      // Ensure category directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Create document record
      const createData: CreateDocumentData = {
        document_name: documentData.document_name,
        original_filename: file.originalname,
        file_path: filePath,
        file_size_bytes: file.size,
        file_type: fileExtension,
        mime_type: file.mimetype,
        file_hash: fileHash,
        category_id: documentData.category_id,
        uploaded_by: documentData.uploaded_by,
        member_id: documentData.member_id,
        entity_type: documentData.entity_type,
        entity_id: documentData.entity_id,
        description: documentData.description,
        tags: documentData.tags,
        is_public: documentData.is_public,
        is_sensitive: documentData.is_sensitive,
        access_level: documentData.access_level,
        allowed_roles: documentData.allowed_roles,
        allowed_users: documentData.allowed_users
      };

      const documentId = await DocumentModel.createDocument(createData);

      return documentId;
    } catch (error) {
      // Clean up file if document creation failed
      if (uploadRequest.file) {
        try {
          const fileExtension = DocumentModel.getFileExtension(uploadRequest.file.originalname);
          const uniqueFilename = `${uuidv4()}.${fileExtension}`;
          const categoryCode = await this.getCategoryCode(uploadRequest.category_id);
          const filePath = path.join(this.UPLOAD_DIR, categoryCode, uniqueFilename);
          await fs.unlink(filePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up file after document creation error:', cleanupError);
        }
      }
      throw error;
    }
  }

  // Validate file
  private static async validateFile(file: FileUploadData, categoryId: number): Promise<void> {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Get file extension
    const fileExtension = DocumentModel.getFileExtension(file.originalname);
    if (!fileExtension) {
      throw new ValidationError('File must have a valid extension');
    }

    // Validate file type against category
    const isValidType = await DocumentModel.validateFileType(categoryId, fileExtension);
    if (!isValidType) {
      throw new ValidationError(`File type '${fileExtension}' is not allowed for this document category`);
    }

    // Validate file size against category
    const isValidSize = await DocumentModel.validateFileSize(categoryId, file.size);
    if (!isValidSize) {
      throw new ValidationError('File size exceeds the maximum allowed for this document category');
    }

    // Basic file content validation
    await this.validateFileContent(file);
  }

  // Validate file content (basic security checks)
  private static async validateFileContent(file: FileUploadData): Promise<void> {
    const buffer = file.buffer;
    
    // Check for common malicious patterns
    const maliciousPatterns = [
      Buffer.from('<?php', 'utf8'),
      Buffer.from('<script', 'utf8'),
      Buffer.from('javascript:', 'utf8'),
      Buffer.from('vbscript:', 'utf8')
    ];

    for (const pattern of maliciousPatterns) {
      if (buffer.includes(pattern)) {
        throw new ValidationError('File contains potentially malicious content');
      }
    }

    // Validate file signature for common types
    const fileSignatures = {
      'pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
      'jpg': [0xFF, 0xD8, 0xFF],
      'png': [0x89, 0x50, 0x4E, 0x47],
      'gif': [0x47, 0x49, 0x46, 0x38]
    };

    const fileExtension = DocumentModel.getFileExtension(file.originalname);
    const expectedSignature = fileSignatures[fileExtension as keyof typeof fileSignatures];
    
    if (expectedSignature) {
      const actualSignature = Array.from(buffer.slice(0, expectedSignature.length));
      if (!expectedSignature.every((byte, index) => byte === actualSignature[index])) {
        throw new ValidationError('File content does not match its extension');
      }
    }
  }

  // Find document by hash
  private static async findDocumentByHash(hash: string): Promise<any> {
    try {
      // This would need a custom query to find by hash
      // For now, return null to allow uploads
      return null;
    } catch (error) {
      return null;
    }
  }

  // Get category code
  private static async getCategoryCode(categoryId: number): Promise<string> {
    try {
      const categories = await DocumentModel.getCategories();
      const category = categories.find(c => c.category_id === categoryId);
      return category?.category_code || 'general';
    } catch (error) {
      return 'general';
    }
  }

  // Get document file
  static async getDocumentFile(documentId : number, userId: number): Promise<{ filePath: string; document: any }> {
    try {
      const document = await DocumentModel.getDocumentById(documentId);
      if (!document) {
        throw new NotFoundError('Document not found');
      }

      // Check access permissions (simplified for now)
      if (!document.is_public && document.uploaded_by !== userId) {
        // Add more sophisticated permission checking here
        throw new ValidationError('Access denied to this document');
      }

      // Check if file exists
      try {
        await fs.access(document.file_path);
      } catch (error) {
        throw new NotFoundError('Document file not found on disk');
      }

      return {
        filePath: document.file_path,
        document
      };
    } catch (error) {
      throw error;
    }
  }

  // Update document
  static async updateDocument(documentId: number, updateData: UpdateDocumentData, userId: number): Promise<boolean> {
    try {
      const document = await DocumentModel.getDocumentById(documentId);
      if (!document) {
        throw new NotFoundError('Document not found');
      }

      // Check permissions (simplified)
      if (document.uploaded_by !== userId) {
        // Add more sophisticated permission checking here
        throw new ValidationError('Access denied to update this document');
      }

      return await DocumentModel.updateDocument(documentId, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Delete document
  static async deleteDocument(documentId: number, userId: number): Promise<boolean> {
    try {
      const document = await DocumentModel.getDocumentById(documentId);
      if (!document) {
        throw new NotFoundError('Document not found');
      }

      // Check permissions (simplified)
      if (document.uploaded_by !== userId) {
        // Add more sophisticated permission checking here
        throw new ValidationError('Access denied to delete this document');
      }

      return await DocumentModel.deleteDocument(documentId);
    } catch (error) {
      throw error;
    }
  }

  // Get documents with filtering
  static async getDocuments(
    limit: number = 20,
    offset: number = 0,
    filters: DocumentFilters = {},
    userId?: number
  ) {
    try {
      // Add user-based filtering if needed
      if (userId && !filters.uploaded_by) {
        // Could add logic to filter based on user permissions
      }

      const [documents, totalCount] = await Promise.all([
        DocumentModel.getDocuments(limit, offset, filters),
        DocumentModel.getDocumentCount(filters)
      ]);

      return {
        documents,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1,
        hasNext: offset + limit < totalCount,
        hasPrev: offset > 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Get document categories
  static async getCategories() {
    try {
      return await DocumentModel.getCategories();
    } catch (error) {
      throw error;
    }
  }

  // Generate secure download token
  static generateDownloadToken(documentId: number, userId: number): string {
    const payload = `${documentId}:${userId}:${Date.now()}`;
    return crypto.createHash('sha256').update(payload + process.env.JWT_SECRET).digest('hex');
  }

  // Validate download token
  static validateDownloadToken(token: string, documentId: number, userId: number): boolean {
    const expectedToken = this.generateDownloadToken(documentId, userId);
    return token === expectedToken;
  }
}
