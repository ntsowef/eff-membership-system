import { Router, Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/documentService';
import { DocumentModel } from '../models/documents';
import { authenticate, requirePermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import multer from 'multer';
import Joi from 'joi';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`File type ${file.mimetype} is not allowed`));
    }
  }
});

// Validation schemas
const uploadDocumentSchema = Joi.object({
  document_name: Joi.string().min(1).max(255).required(),
  category_id: Joi.number().integer().positive().required(),
  member_id: Joi.number().integer().positive().optional(),
  entity_type: Joi.string().valid('member', 'application', 'meeting', 'renewal', 'system', 'user').optional(),
  entity_id: Joi.number().integer().positive().optional(),
  description: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  is_public: Joi.boolean().optional(),
  is_sensitive: Joi.boolean().optional(),
  access_level: Joi.string().valid('public', 'members', 'admins', 'restricted').optional(),
  allowed_roles: Joi.array().items(Joi.string()).optional(),
  allowed_users: Joi.array().items(Joi.number().integer().positive()).optional()
});

const updateDocumentSchema = Joi.object({
  document_name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  is_public: Joi.boolean().optional(),
  is_sensitive: Joi.boolean().optional(),
  access_level: Joi.string().valid('public', 'members', 'admins', 'restricted').optional(),
  allowed_roles: Joi.array().items(Joi.string()).optional(),
  allowed_users: Joi.array().items(Joi.number().integer().positive()).optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'archived').optional(),
  rejection_reason: Joi.string().max(500).optional()
});

// Initialize upload directory on startup
DocumentService.initializeUploadDirectory().catch(console.error);

// Get document categories
router.get('/categories', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await DocumentService.getCategories();

    res.json({
      success: true,
      message: 'Document categories retrieved successfully',
      data: {
        categories
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Upload document
router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Validate request body
    const { error, value } = uploadDocumentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Parse JSON fields if they're strings
    if (typeof value.tags === 'string') {
      try {
        value.tags = JSON.parse(value.tags);
      } catch (e) {
        throw new ValidationError('Invalid tags format');
      }
    }

    if (typeof value.allowed_roles === 'string') {
      try {
        value.allowed_roles = JSON.parse(value.allowed_roles);
      } catch (e) {
        throw new ValidationError('Invalid allowed_roles format');
      }
    }

    if (typeof value.allowed_users === 'string') {
      try {
        value.allowed_users = JSON.parse(value.allowed_users);
      } catch (e) {
        throw new ValidationError('Invalid allowed_users format');
      }
    }

    const uploadRequest = {
      file: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size
      },
      uploaded_by: req.user!.id,
      ...value
    };

    const documentId = await DocumentService.uploadDocument(uploadRequest);

    // Log the upload
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      documentId,
      undefined,
      {
        action: 'document_upload',
        document_name: value.document_name,
        file_size: req.file.size,
        file_type: req.file.mimetype
      },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document_id: documentId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Clean up uploaded file if there's an error
    if (req.file) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete uploaded file after error:', unlinkError);
      }
    }
    next(error);
  }
});

// Get all documents (admin only)
router.get('/', authenticate, requirePermission('documents.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: any = {};

    if (req.query.category_id) filters.category_id = parseInt(req.query.category_id as string);
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    if (req.query.entity_type) filters.entity_type = req.query.entity_type as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.is_public !== undefined) filters.is_public = req.query.is_public === 'true';
    if (req.query.is_sensitive !== undefined) filters.is_sensitive = req.query.is_sensitive === 'true';
    if (req.query.access_level) filters.access_level = req.query.access_level as string;
    if (req.query.file_type) filters.file_type = req.query.file_type as string;
    if (req.query.created_from) filters.created_from = req.query.created_from as string;
    if (req.query.created_to) filters.created_to = req.query.created_to as string;
    if (req.query.search) filters.search = req.query.search as string;
    if (req.query.tags) {
      try {
        filters.tags = JSON.parse(req.query.tags as string);
      } catch (e) {
        // Ignore invalid tags
      }
    }

    const result = await DocumentService.getDocuments(limit, offset, filters, req.user!.id);

    res.json({
      success: true,
      message: 'Documents retrieved successfully',
      data: {
        documents: result.documents,
        pagination: {
          current_page: result.currentPage,
          total_pages: result.totalPages,
          total_count: result.totalCount,
          limit,
          has_next: result.hasNext,
          has_prev: result.hasPrev
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get document by ID
router.get('/:id', authenticate, requirePermission('documents.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID');
    }

    const document = await DocumentModel.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    res.json({
      success: true,
      message: 'Document retrieved successfully',
      data: {
        document
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Download document
router.get('/:id/download', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID');
    }

    const { filePath, document } = await DocumentService.getDocumentFile(documentId, req.user!.id);

    // Log the download
    await logAudit(
      req.user!.id,
      AuditAction.READ,
      EntityType.SYSTEM,
      documentId,
      undefined,
      {
        action: 'document_download',
        document_name: document.document_name
      },
      req
    );

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Length', document.file_size_bytes);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Update document
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID');
    }

    const { error, value } = updateDocumentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Add approval info if status is being changed to approved
    if (value.status === 'approved') {
      value.approved_by = req.user!.id;
    }

    const updated = await DocumentService.updateDocument(documentId, value, req.user!.id);
    if (!updated) {
      throw new NotFoundError('Document not found or no changes made');
    }

    // Log the update
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      documentId,
      undefined,
      {
        action: 'document_update',
        changes: value
      },
      req
    );

    res.json({
      success: true,
      message: 'Document updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete document
router.delete('/:id', authenticate, requirePermission('documents.delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID');
    }

    const deleted = await DocumentService.deleteDocument(documentId, req.user!.id);
    if (!deleted) {
      throw new NotFoundError('Document not found');
    }

    // Log the deletion
    await logAudit(
      req.user!.id,
      AuditAction.DELETE,
      EntityType.SYSTEM,
      documentId,
      undefined,
      {
        action: 'document_delete'
      },
      req
    );

    res.json({
      success: true,
      message: 'Document deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
