import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ImportExportService } from '../services/importExportService';
import { authenticate, requireAdminLevel } from '../middleware/auth';
import { strictRateLimit } from '../middleware/securityMiddleware';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Allowed types: CSV, Excel, JSON'));
    }
  }
});

// Validation schemas
const importOptionsSchema = Joi.object({
  skip_duplicates: Joi.boolean().default(true),
  update_existing: Joi.boolean().default(false),
  validate_references: Joi.boolean().default(true),
  batch_size: Joi.number().min(100).max(5000).default(1000)
});

const exportOptionsSchema = Joi.object({
  format: Joi.string().valid('csv', 'excel', 'json').default('excel'),
  include_headers: Joi.boolean().default(true),
  date_format: Joi.string().default('YYYY-MM-DD'),
  filters: Joi.object().default({})
});

// Import Members
router.post('/members/import', authenticate, requireAdminLevel(2), strictRateLimit, upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const { error, value } = importOptionsSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const filePath = req.file.path;

    const result = await ImportExportService.importMembers(filePath, userId, value);

    // Log import operation
    await logAudit(
      userId,
      AuditAction.CREATE,
      EntityType.MEMBER,
      0,
      undefined,
      {
        operation: 'bulk_import',
        total_records: result.total_records,
        successful_imports: result.successful_imports,
        failed_imports: result.failed_imports,
        import_id: result.import_id
      },
      req
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'Member import completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Export Members
router.post('/members/export', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { error, value } = exportOptionsSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const filePath = await ImportExportService.exportMembers(userId, value, value.filters);

    // Log export operation
    await logAudit(
      userId,
      AuditAction.READ,
      EntityType.MEMBER,
      0,
      undefined,
      {
        operation: 'bulk_export',
        format: value.format,
        filters: value.filters
      },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Member export completed',
      data: {
        file_path: filePath,
        download_url: `/api/v1/import-export/download/${path.basename(filePath)}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Import Meetings
router.post('/meetings/import', authenticate, requireAdminLevel(2), strictRateLimit, upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const { error, value } = importOptionsSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const filePath = req.file.path;

    const result = await ImportExportService.importMeetings(filePath, userId, value);

    // Log import operation
    await logAudit(
      userId,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      0,
      undefined,
      {
        operation: 'bulk_import',
        total_records: result.total_records,
        successful_imports: result.successful_imports,
        failed_imports: result.failed_imports,
        import_id: result.import_id
      },
      req
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'Meeting import completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Export Meetings
router.post('/meetings/export', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { error, value } = exportOptionsSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const filePath = await ImportExportService.exportMeetings(userId, value, value.filters);

    res.status(200).json({
      success: true,
      message: 'Meeting export completed',
      data: {
        file_path: filePath,
        download_url: `/api/v1/import-export/download/${path.basename(filePath)}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export Leadership
router.post('/leadership/export', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { error, value } = exportOptionsSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const filePath = await ImportExportService.exportLeadership(userId, value, value.filters);

    res.status(200).json({
      success: true,
      message: 'Leadership export completed',
      data: {
        file_path: filePath,
        download_url: `/api/v1/import-export/download/${path.basename(filePath)}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export Analytics
router.post('/analytics/export', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const schema = exportOptionsSchema.keys({
      report_type: Joi.string().valid('membership_summary', 'meeting_attendance', 'leadership_tenure', 'election_results').required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const userId = req.user!.id;
    const filePath = await ImportExportService.exportAnalytics(userId, value.report_type, value, value.filters);

    res.status(200).json({
      success: true,
      message: 'Analytics export completed',
      data: {
        file_path: filePath,
        download_url: `/api/v1/import-export/download/${path.basename(filePath)}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Generate Import Template
router.get('/templates/:entityType', authenticate, requireAdminLevel(1), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { entityType } = req.params;
    const format = req.query.format as 'csv' | 'excel' || 'excel';

    if (!['members', 'meetings'].includes(entityType)) {
      throw new ValidationError('Invalid entity type');
    }

    if (!['csv', 'excel'].includes(format)) {
      throw new ValidationError('Invalid format');
    }

    const filePath = await ImportExportService.generateImportTemplate(entityType, format);

    res.status(200).json({
      success: true,
      message: 'Import template generated',
      data: {
        file_path: filePath,
        download_url: `/api/v1/import-export/download/${path.basename(filePath)}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Download File
router.get('/download/:filename', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { filename } = req.params;
    
    // Security check - only allow alphanumeric, dots, dashes, and underscores
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new ValidationError('Invalid filename');
    }

    // Check multiple possible directories
    const possiblePaths = [
      path.join(process.cwd(), 'exports', filename),
      path.join(process.cwd(), 'templates', filename)
    ];

    let filePath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }

    if (!filePath) {
      throw new NotFoundError('File not found');
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.json':
        contentType = 'application/json';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      // Optionally delete the file after download
      // fs.unlinkSync(filePath);
    });

    fileStream.on('error', (error) => {
      next(error);
    });
  } catch (error) {
    next(error);
  }
});

export default router;
