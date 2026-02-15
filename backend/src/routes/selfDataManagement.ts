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
    console.log(`📁 [Multer] Destination callback - saving to: ${uploadDir}`);
    console.log(`📁 [Multer] Original filename: ${file.originalname}`);
    console.log(`📁 [Multer] Mimetype: ${file.mimetype}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `upload-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log(`📁 [Multer] Generated filename: ${filename}`);
    cb(null, filename);
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
  (req, res, next) => {
    console.log('📥 [Pre-Multer] Incoming upload request');
    console.log('📥 [Pre-Multer] Content-Type:', req.headers['content-type']);
    console.log('📥 [Pre-Multer] Content-Length:', req.headers['content-length']);
    next();
  },
  upload.single('file'),
  (req, res, next) => {
    console.log('📤 [Post-Multer] Multer completed');
    console.log('📤 [Post-Multer] req.file exists:', !!req.file);
    if (req.file) {
      console.log('📤 [Post-Multer] File details:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });
    }
    next();
  },
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // CRITICAL: Verify file was actually saved to disk before proceeding
    if (!fs.existsSync(req.file.path)) {
      console.error(`❌ File upload failed - file not saved to disk: ${req.file.path}`);
      throw new ValidationError('File upload failed - file was not saved to disk. Please try again.');
    }

    // Verify file size matches what was reported
    const actualFileStats = fs.statSync(req.file.path);
    if (actualFileStats.size !== req.file.size) {
      console.error(`❌ File size mismatch - expected: ${req.file.size}, actual: ${actualFileStats.size}`);
      // Clean up the partial file
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
      throw new ValidationError('File upload incomplete - please try again.');
    }

    console.log(`✅ File verified on disk: ${req.file.path} (${actualFileStats.size} bytes)`);

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
        userEmail: req.user.email, // Pass user email for completion notification
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

// =====================================================
// Bulk Member Removal Routes (Archive & Delete)
// =====================================================

// Validation schemas for bulk removal
const previewByIdsSchema = Joi.object({
  id_numbers: Joi.array().items(Joi.string().min(1).max(13)).min(1).max(1000).required()
});

const removeByIdsSchema = Joi.object({
  id_numbers: Joi.array().items(Joi.string().min(1).max(13)).min(1).max(1000).required(),
  removal_reason: Joi.string().max(200).default('Termination of Membership'),
  removal_type: Joi.string().valid('expelled', 'suspended', 'terminated', 'deceased', 'data_cleanup').default('terminated'),
  confirmation: Joi.string().valid('CONFIRM').required()
});

const expelledMembersQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).default(50),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().max(100).optional(),
  removal_type: Joi.string().valid('expelled', 'suspended', 'terminated', 'deceased', 'data_cleanup').optional(),
  province: Joi.string().max(50).optional(),
  batch_id: Joi.string().max(50).optional(),
  from_date: Joi.string().isoDate().optional(),
  to_date: Joi.string().isoDate().optional()
});

/**
 * POST /api/v1/self-data-management/bulk-removal/preview-ids
 * Preview members to be removed by ID numbers
 */
router.post('/bulk-removal/preview-ids',
  authenticate,
  requirePermission('self_data_management.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = previewByIdsSchema.validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Clean and dedupe ID numbers
    const cleanedIds: string[] = [...new Set((value.id_numbers as string[]).map((id: string) => id.trim()).filter(Boolean))];

    const members = await SelfDataManagementModel.findMembersByIdNumbers(cleanedIds);

    // Identify which IDs were not found
    const foundIds = new Set(members.map(m => m.id_number));
    const notFound = cleanedIds.filter((id: string) => !foundIds.has(id));

    sendSuccess(res, {
      found: members,
      not_found: notFound,
      total_requested: cleanedIds.length,
      total_found: members.length
    });
  })
);

/**
 * POST /api/v1/self-data-management/bulk-removal/remove-by-ids
 * Remove members by ID numbers (archive to expelled_suspended_members and delete)
 */
router.post('/bulk-removal/remove-by-ids',
  authenticate,
  requirePermission('self_data_management.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🗑️ Remove by ID numbers endpoint called');

    const { error, value } = removeByIdsSchema.validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Clean and dedupe ID numbers
    const cleanedIds: string[] = [...new Set((value.id_numbers as string[]).map((id: string) => id.trim()).filter(Boolean))];
    console.log(`📋 Processing ${cleanedIds.length} unique ID numbers`);

    // Find members by ID numbers
    console.log('🔍 Looking up members by ID numbers...');
    const members = await SelfDataManagementModel.findMembersByIdNumbers(cleanedIds);
    console.log(`✅ Found ${members.length} members`);

    if (members.length === 0) {
      console.log('❌ No members found with the provided ID numbers');
      throw new NotFoundError('No members found with the provided ID numbers');
    }

    // Create batch ID for this operation
    const batchId = uuidv4();
    console.log(`📦 Batch ID: ${batchId}`);

    // Prepare removal requests
    const removalRequests = members.map(m => ({
      member_id: m.member_id,
      id_number: m.id_number,
      search_method: 'id_number',
      match_confidence: 'exact'
    }));

    // Archive and remove
    console.log(`🗑️ Archiving and removing ${removalRequests.length} members...`);
    const result = await SelfDataManagementModel.archiveAndRemoveMembers(
      removalRequests,
      value.removal_reason,
      value.removal_type,
      req.user.id,
      batchId
    );
    console.log(`✅ Removal complete. Successful: ${result.successful}, Failed: ${result.failed}`);

    // Log audit
    await logAudit(
      req.user.id,
      'bulk_removal',
      'member',
      undefined,
      undefined,
      {
        batch_id: batchId,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        removal_reason: value.removal_reason,
        removal_type: value.removal_type
      },
      req
    );

    sendSuccess(res, {
      ...result,
      batch_id: batchId
    }, `Successfully removed ${result.successful} members`);
  })
);

/**
 * POST /api/v1/self-data-management/bulk-removal/preview-excel
 * Preview members from uploaded Excel file
 */
router.post('/bulk-removal/preview-excel',
  authenticate,
  requirePermission('self_data_management.delete'),
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    console.log('📂 Processing Excel file for bulk removal preview:', req.file.originalname);
    const startTime = Date.now();

    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📊 Excel file has ${data.length} rows`);

    // Clean up temp file early
    fs.unlinkSync(req.file.path);

    const results: any[] = [];
    const notFound: any[] = [];

    // Parse all rows first
    const rowsWithId: Array<{ rowNumber: number; idNumber: string; nameAndSurname: string; subregion: string; wardNo: string }> = [];
    const rowsWithoutId: Array<{ rowNumber: number; nameAndSurname: string; subregion: string; wardNo: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = row['#'] || i + 1;
      const idNumber = row['ID NUMBER']?.toString().trim();
      const nameAndSurname = row['NAME AND SURNAME']?.toString().trim();
      const subregion = row['SUBREGION']?.toString().trim();
      const wardNo = row['WARD NO.']?.toString().trim();

      if (idNumber) {
        rowsWithId.push({ rowNumber, idNumber, nameAndSurname, subregion, wardNo });
      } else if (nameAndSurname && subregion) {
        rowsWithoutId.push({ rowNumber, nameAndSurname, subregion, wardNo });
      } else {
        notFound.push({
          row_number: rowNumber,
          excel_data: { subregion, ward_no: wardNo, name_and_surname: nameAndSurname, id_number: idNumber },
          reason: 'Missing ID number and name/province combination'
        });
      }
    }

    console.log(`📊 Rows with ID: ${rowsWithId.length}, Rows without ID: ${rowsWithoutId.length}`);

    // Batch lookup all ID numbers at once
    if (rowsWithId.length > 0) {
      console.log('🔍 Batch looking up members by ID numbers...');
      const allIdNumbers = rowsWithId.map(r => r.idNumber);
      const foundMembers = await SelfDataManagementModel.findMembersByIdNumbers(allIdNumbers);
      const membersByIdNumber = new Map(foundMembers.map(m => [m.id_number, m]));
      console.log(`✅ Found ${foundMembers.length} members by ID number`);

      for (const row of rowsWithId) {
        const member = membersByIdNumber.get(row.idNumber);
        if (member) {
          results.push({
            row_number: row.rowNumber,
            excel_data: { subregion: row.subregion, ward_no: row.wardNo, name_and_surname: row.nameAndSurname, id_number: row.idNumber },
            member,
            search_method: 'id_number',
            match_confidence: 'exact'
          });
        } else {
          notFound.push({
            row_number: row.rowNumber,
            excel_data: { subregion: row.subregion, ward_no: row.wardNo, name_and_surname: row.nameAndSurname, id_number: row.idNumber },
            reason: 'ID number not found in database'
          });
        }
      }
    }

    // Process rows without ID (run lookups in PARALLEL for speed)
    if (rowsWithoutId.length > 0) {
      console.log(`🔍 Looking up ${rowsWithoutId.length} members by name+province (parallel)...`);

      // Run all name lookups in parallel
      const lookupPromises = rowsWithoutId.map(async (row) => {
        try {
          const members = await SelfDataManagementModel.findMembersByNameAndProvince(row.nameAndSurname, row.subregion);
          return { row, members, error: null };
        } catch (err: any) {
          return { row, members: [], error: err.message };
        }
      });

      const lookupResults = await Promise.all(lookupPromises);

      // Process results
      for (const { row, members, error } of lookupResults) {
        if (error) {
          console.error(`❌ Error looking up "${row.nameAndSurname}":`, error);
          notFound.push({
            row_number: row.rowNumber,
            excel_data: { subregion: row.subregion, ward_no: row.wardNo, name_and_surname: row.nameAndSurname, id_number: null },
            reason: `Error during lookup: ${error}`
          });
        } else if (members.length === 1) {
          results.push({
            row_number: row.rowNumber,
            excel_data: { subregion: row.subregion, ward_no: row.wardNo, name_and_surname: row.nameAndSurname, id_number: null },
            member: members[0],
            search_method: 'name_province',
            match_confidence: 'exact'
          });
        } else if (members.length > 1) {
          results.push({
            row_number: row.rowNumber,
            excel_data: { subregion: row.subregion, ward_no: row.wardNo, name_and_surname: row.nameAndSurname, id_number: null },
            members: members,
            search_method: 'name_province',
            match_confidence: 'multiple',
            requires_selection: true
          });
        } else {
          notFound.push({
            row_number: row.rowNumber,
            excel_data: { subregion: row.subregion, ward_no: row.wardNo, name_and_surname: row.nameAndSurname, id_number: null },
            reason: 'No member found matching name and province'
          });
        }
      }
      console.log(`✅ Completed ${rowsWithoutId.length} name+province lookups (parallel)`);
    }

    // Sort results by row number
    results.sort((a, b) => a.row_number - b.row_number);
    notFound.sort((a, b) => a.row_number - b.row_number);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Preview complete in ${elapsed}ms. Found: ${results.length}, Not found: ${notFound.length}`);

    sendSuccess(res, {
      found: results,
      not_found: notFound,
      total_rows: data.length,
      total_found: results.length,
      requires_selection: results.some(r => r.requires_selection)
    });
  })
);

/**
 * POST /api/v1/self-data-management/bulk-removal/remove-by-excel
 * Remove members based on Excel preview results
 */
router.post('/bulk-removal/remove-by-excel',
  authenticate,
  requirePermission('self_data_management.delete'),
  asyncHandler(async (req: Request, res: Response) => {
    const { members_to_remove, removal_reason, removal_type, source_file, confirmation } = req.body;

    if (confirmation !== 'CONFIRM') {
      throw new ValidationError('Please confirm the removal by setting confirmation to "CONFIRM"');
    }

    if (!Array.isArray(members_to_remove) || members_to_remove.length === 0) {
      throw new ValidationError('No members provided for removal');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const batchId = uuidv4();

    const result = await SelfDataManagementModel.archiveAndRemoveMembers(
      members_to_remove,
      removal_reason || 'Termination of Membership',
      removal_type || 'terminated',
      req.user.id,
      batchId,
      source_file
    );

    // Log audit
    await logAudit(
      req.user.id,
      'bulk_removal_excel',
      'member',
      undefined,
      undefined,
      {
        batch_id: batchId,
        source_file,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        removal_reason: removal_reason || 'Termination of Membership',
        removal_type: removal_type || 'terminated'
      },
      req
    );

    sendSuccess(res, {
      ...result,
      batch_id: batchId
    }, `Successfully removed ${result.successful} members from Excel upload`);
  })
);

/**
 * GET /api/v1/self-data-management/bulk-removal/expelled-members
 * Get list of expelled/suspended members
 */
router.get('/bulk-removal/expelled-members',
  authenticate,
  requirePermission('self_data_management.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = expelledMembersQuerySchema.validate(req.query);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const result = await SelfDataManagementModel.getExpelledMembers(
      value.limit,
      value.offset,
      {
        search: value.search,
        removal_type: value.removal_type,
        province: value.province,
        batch_id: value.batch_id,
        from_date: value.from_date,
        to_date: value.to_date
      }
    );

    sendSuccess(res, result);
  })
);

export default router;

