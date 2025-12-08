import { Router, Request, Response } from 'express';
import { SelfDataManagementModel } from '../models/selfDataManagement';
import { authenticate, requirePermission } from '../middleware/auth';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { addBulkUploadJob } from '../services/bulk-upload/bulkUploadQueueService';

const router = Router();

// Helper to determine if a user has national admin privileges
const isNationalAdminUser = (user: any): boolean => {
  if (!user) return false;
  return user.role_name === 'national_admin' || user.admin_level === 'national_admin';
};

// Configure multer for file uploads
// Use repository root, not backend directory
// Backend runs from backend/ folder, so go up one level to reach repository root
const repoRoot = path.join(__dirname, '..', '..', '..');
const uploadDir = path.join(repoRoot, '_upload_file_directory');

console.log('📂 Upload directory configured:', uploadDir);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created upload directory:', uploadDir);
} else {
  console.log('✅ Upload directory exists:', uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `upload-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Validation schemas
const searchMembersSchema = Joi.object({
  id_number: Joi.string().min(1).max(13).required(),
  limit: Joi.number().integer().min(1).max(500).optional().default(100)
});

const bulkUpdateStatusSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(1000).required(),
  new_status_id: Joi.number().integer().positive().required(),
  reason: Joi.string().max(500).optional()
});

const bulkDeleteSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(1000).required(),
  confirmation: Joi.string().valid('DELETE', 'CONFIRM').required()
});

// =====================================================
// Bulk File Upload Routes
// =====================================================

/**
 * POST /api/v1/self-data-management/bulk-upload
 * Upload Excel file for bulk member amendments
 */
router.post('/bulk-upload',
  authenticate,
  requirePermission('self_data_management.write'),
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    let uploadedFile;
    let jobQueued = false;

    try {
      // Register file in database
      uploadedFile = await SelfDataManagementModel.registerUploadedFile({
        filename: req.file.filename,
        original_filename: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by_user_id: req.user.id
      });

      console.log(`✅ File registered in database with file_id: ${uploadedFile.file_id}`);

      // Log audit
      await logAudit(
        req.user.id,
        'file_upload',
        'uploaded_file',
        uploadedFile.file_id,
        undefined,
        { filename: req.file.originalname, file_size: req.file.size },
        req
      );

      // Generate a unique job ID for tracking
      const jobId = uuidv4();

      // Add job to Bull Queue for async processing (NEW Node.js processor)
      await addBulkUploadJob({
        jobId,
        filePath: req.file.path,
        fileName: req.file.originalname,
        uploadedBy: req.user.email || `user_${req.user.id}`,
        userId: req.user.id.toString(),
        userRole: req.user.role_name,
        fileId: uploadedFile.file_id // Pass file_id for status sync with uploaded_files table
      });

      console.log(`✅ File uploaded and queued for processing`);
      console.log(`📂 File saved to: ${req.file.path}`);
      console.log(`📥 Job added to Bull Queue: ${jobId}`);

      // Mark that job was queued successfully
      jobQueued = true;

      /* DISABLED: Direct Python process spawning (using bulk_upload_processor.py instead)
      // Trigger Python processing script in background
      const pythonScript = path.join(repoRoot, 'backend', 'python', 'process_self_data_management_file.py');

      // Verify Python script exists
      if (!fs.existsSync(pythonScript)) {
        throw new Error(`Python script not found: ${pythonScript}`);
      }

      // Create log file for this processing job
      const logDir = path.join(repoRoot, 'backend', 'python', 'data', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `process_${uploadedFile.file_id}_${Date.now()}.log`);
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      // Spawn Python process
      const pythonProcess = spawn('python', [
        pythonScript,
        uploadedFile.file_id.toString(),
        req.file.path
      ], {
        cwd: repoRoot, // Set working directory to repository root so Python can find flexible_membership_ingestionV2.py
        detached: true,
        stdio: ['ignore', logStream, logStream] // Log stdout and stderr to file
      });

      // Handle process spawn errors
      pythonProcess.on('error', async (error) => {
        console.error(`❌ Failed to start Python process for file_id ${uploadedFile.file_id}:`, error);
        // Update file status to failed
        await SelfDataManagementModel.updateFileStatus(
          uploadedFile.file_id,
          'failed',
          0, // progress_percentage
          0, // rows_processed
          0, // rows_success
          0, // rows_failed
          `Failed to start processing: ${error.message}`
        );
      });

      // Mark that process started successfully
      pythonProcessStarted = true;

      // Don't wait for the process to complete
      pythonProcess.unref();
      if ('unref' in logStream && typeof logStream.unref === 'function') {
        logStream.unref();
      }

      console.log(`🔄 Started background processing for file_id: ${uploadedFile.file_id}`);
      console.log(`📝 Logs will be written to: ${logFile}`);
      */

      // Send immediate WebSocket notification that upload is complete and processing is starting
      const io = req.app.get('io');
      if (io) {
        const notification = {
          file_id: uploadedFile.file_id,
          status: 'queued',
          progress: 0,
          message: 'File uploaded and queued for processing via Bull Queue',
          timestamp: new Date().toISOString()
        };

        // Broadcast to both specific file room and general room
        io.to(`bulk_upload:${uploadedFile.file_id}`).emit('upload_progress', notification);
        io.to('bulk_upload').emit('upload_progress', notification);

        console.log(`📡 Sent WebSocket notification for file_id: ${uploadedFile.file_id}`);
      }

      sendSuccess(res, uploadedFile, 'File uploaded successfully and queued for processing.');

    } catch (error: any) {
      console.error('❌ Error during file upload:', error);

      // If we created a database entry but failed to queue, clean it up
      if (uploadedFile && !jobQueued) {
        console.log(`🗑️ Cleaning up failed upload entry for file_id: ${uploadedFile.file_id}`);
        try {
          await SelfDataManagementModel.deleteUploadHistory(uploadedFile.file_id);
          console.log(`✅ Cleaned up database entry for file_id: ${uploadedFile.file_id}`);
        } catch (cleanupError) {
          console.error(`❌ Failed to clean up database entry:`, cleanupError);
        }

        // Also delete the uploaded file from disk
        if (req.file && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
            console.log(`✅ Deleted uploaded file: ${req.file.path}`);
          } catch (fileError) {
            console.error(`❌ Failed to delete uploaded file:`, fileError);
          }
        }
      }

      // Re-throw the error to be handled by asyncHandler
      throw error;
    }
  })
);

/**
 * GET /api/v1/self-data-management/bulk-upload/status/:file_id
 * Get file processing status
 */
router.get('/bulk-upload/status/:file_id',
  authenticate,
  requirePermission('self_data_management.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const file_id = parseInt(req.params.file_id);
    
    if (isNaN(file_id)) {
      throw new ValidationError('Invalid file ID');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const file = await SelfDataManagementModel.getFileById(file_id);
    
    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Enforce multi-tenancy: non-national admins can only access their own files
    if (!isNationalAdminUser(req.user) && file.uploaded_by_user_id !== req.user.id) {
      // Hide existence details from unauthorized users
      throw new NotFoundError('File not found');
    }

    sendSuccess(res, file, 'File status retrieved successfully');
  })
);

/**
 * GET /api/v1/self-data-management/bulk-upload/history
 * Get upload history
 */
router.get('/bulk-upload/history',
  authenticate,
  requirePermission('self_data_management.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const isNationalAdmin = isNationalAdminUser(req.user);

    // For national admins: allow system-wide view (optionally filtered by user_id)
    // For all other users: always restrict to their own uploads, ignoring any user_id query param
    let userIdForQuery: number | undefined;
    if (isNationalAdmin) {
      userIdForQuery = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
    } else {
      userIdForQuery = req.user.id;
    }

    const result = await SelfDataManagementModel.getUploadHistory(userIdForQuery, limit, offset);

    sendSuccess(res, result, 'Upload history retrieved successfully');
  })
);

/**
 * DELETE /api/v1/self-data-management/bulk-upload/history/:file_id
 * Delete upload history record
 */
router.delete('/bulk-upload/history/:file_id',
  authenticate,
  requirePermission('self_data_management.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const file_id = parseInt(req.params.file_id);

    if (isNaN(file_id)) {
      throw new ValidationError('Invalid file ID');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Verify ownership for non-national admins before deleting
    const file = await SelfDataManagementModel.getFileById(file_id);

    if (!file) {
      throw new NotFoundError('File not found');
    }

    if (!isNationalAdminUser(req.user) && file.uploaded_by_user_id !== req.user.id) {
      throw new NotFoundError('File not found');
    }

    await SelfDataManagementModel.deleteUploadHistory(file_id);

    // Log audit
    await logAudit(
      req.user.id,
      'delete_upload_history',
      'uploaded_file',
      file_id,
      undefined,
      { file_id },
      req
    );

    sendSuccess(res, { file_id }, 'Upload history deleted successfully');
  })
);

/**
 * GET /api/v1/self-data-management/bulk-upload/download-report/:file_id
 * Download Excel report for a specific upload
 */
router.get('/bulk-upload/download-report/:file_id',
  authenticate,
  requirePermission('self_data_management.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const file_id = parseInt(req.params.file_id);

    if (isNaN(file_id)) {
      throw new ValidationError('Invalid file ID');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get file record
    const file = await SelfDataManagementModel.getFileById(file_id);

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Enforce multi-tenancy: non-national admins can only download reports for their own uploads
    if (!isNationalAdminUser(req.user) && file.uploaded_by_user_id !== req.user.id) {
      throw new NotFoundError('File not found');
    }

    if (!file.report_file_path) {
      throw new NotFoundError('Report not available for this file');
    }

    // Resolve report file path relative to repository root
    const absoluteReportPath = path.isAbsolute(file.report_file_path)
      ? file.report_file_path
      : path.join(repoRoot, file.report_file_path);

    // Check if report file exists
    if (!fs.existsSync(absoluteReportPath)) {
      console.error(`Report file not found: ${absoluteReportPath}`);
      throw new NotFoundError('Report file not found on disk');
    }

    // Log audit
    if (req.user) {
      await logAudit(
        req.user.id,
        'file_download',
        'uploaded_file',
        file_id,
        undefined,
        { report_filename: path.basename(file.report_file_path) },
        req
      );
    }

    // Send file
    res.download(absoluteReportPath, path.basename(file.report_file_path), (err) => {
      if (err) {
        console.error('Error downloading report:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download report' });
        }
      }
    });
  })
);

// =====================================================
// Bulk Members Manipulation Routes
// =====================================================

/**
 * POST /api/v1/self-data-management/bulk-manipulation/search
 * Search members by ID number
 */
router.post('/bulk-manipulation/search',
  authenticate,
  requirePermission('self_data_management.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = searchMembersSchema.validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const members = await SelfDataManagementModel.searchMembersByIdNumber(
      value.id_number,
      value.limit
    );

    sendSuccess(res, members, `Found ${members.length} members`);
  })
);

/**
 * PUT /api/v1/self-data-management/bulk-manipulation/update-status
 * Bulk update member status
 */
router.put('/bulk-manipulation/update-status',
  authenticate,
  requirePermission('self_data_management.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = bulkUpdateStatusSchema.validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const operation = await SelfDataManagementModel.bulkUpdateMemberStatus(
      value.member_ids,
      value.new_status_id,
      req.user.id,
      value.reason
    );

    // Log audit
    await logAudit(
      req.user.id,
      'bulk_status_update',
      'member',
      undefined,
      undefined,
      {
        member_count: value.member_ids.length,
        new_status_id: value.new_status_id,
        reason: value.reason
      },
      req
    );

    sendSuccess(res, operation, `Successfully updated ${value.member_ids.length} members`);
  })
);

/**
 * DELETE /api/v1/self-data-management/bulk-manipulation/delete
 * Bulk delete members
 */
router.delete('/bulk-manipulation/delete',
  authenticate,
  requirePermission('self_data_management.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = bulkDeleteSchema.validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const operation = await SelfDataManagementModel.bulkDeleteMembers(
      value.member_ids,
      req.user.id
    );

    // Log audit
    await logAudit(
      req.user.id,
      'bulk_delete',
      'member',
      undefined,
      undefined,
      {
        member_count: value.member_ids.length,
        member_ids: value.member_ids
      },
      req
    );

    sendSuccess(res, operation, `Successfully deleted ${value.member_ids.length} members`);
  })
);

export default router;

