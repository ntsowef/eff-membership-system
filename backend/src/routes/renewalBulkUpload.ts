import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { RenewalBulkUploadService } from '../services/renewalBulkUploadService';
import { RenewalBulkProcessor } from '../services/renewalBulkProcessor';
import { asyncHandler, sendSuccess, ValidationError, AuthenticationError, NotFoundError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
// TEMPORARILY DISABLED FOR TESTING
// router.use(authenticate);

// =====================================================================================
// MULTER CONFIGURATION FOR FILE UPLOAD
// =====================================================================================

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/bulk-renewals');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `renewal-upload-${uniqueSuffix}${ext}`);
  }
});

// File filter - only accept Excel and CSV
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/octet-stream' // Some systems send Excel as binary stream
  ];

  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check MIME type OR file extension
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed. Received: ${file.mimetype} (${fileExtension})`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// =====================================================================================
// ROUTES
// =====================================================================================

/**
 * @route   POST /api/v1/renewal-bulk-upload/upload
 * @desc    Upload bulk renewal spreadsheet
 * @access  Private (Admin/Provincial Admin)
 */
router.post('/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 1; // TESTING: Default to user ID 1
    const userRole = (req as any).user?.role || 'admin'; // TESTING: Default to admin

    // TEMPORARILY DISABLED FOR TESTING
    // if (!userId) {
    //   throw new AuthenticationError('User not authenticated');
    // }

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const { province_code } = req.body;

    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = (ext === '.csv') ? 'CSV' : 'Excel';

    // Create upload record
    const upload_uuid = await RenewalBulkUploadService.createBulkUpload({
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_type: fileType,
      file_size: req.file.size,
      uploaded_by: userId,
      user_role: userRole,
      province_code: province_code || null
    });

    // Start background processing
    // Note: In production, this should be handled by a job queue (Bull, BullMQ, etc.)
    setImmediate(async () => {
      try {
        await RenewalBulkProcessor.processBulkUpload(upload_uuid);
      } catch (error) {
        console.error('Background processing error:', error);
      }
    });

    sendSuccess(res, {
      upload_uuid,
      message: 'File uploaded successfully. Processing started in background.'
    }, 'File uploaded successfully', 201);
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/status/:upload_uuid
 * @desc    Get upload processing status
 * @access  Private
 */
router.get('/status/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;

    const status = await RenewalBulkUploadService.getUploadStatus(upload_uuid);

    if (!status) {
      throw new NotFoundError('Upload not found');
    }

    sendSuccess(res, {
      upload: status
    }, 'Upload status retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/fraud-cases
 * @desc    Get all fraud cases with optional filters
 * @access  Private
 */
router.get('/fraud-cases',
  asyncHandler(async (req: Request, res: Response) => {
    const { fraud_type, fraud_severity, case_status, limit } = req.query;

    const query = `
      SELECT
        fc.*,
        m.firstname || ' ' || m.surname as member_name,
        bu.file_name as upload_file_name,
        bu.uploaded_at as upload_date
      FROM renewal_fraud_cases fc
      LEFT JOIN members m ON fc.member_id = m.member_id
      LEFT JOIN renewal_bulk_uploads bu ON fc.upload_id = bu.upload_id
      WHERE 1=1
        ${fraud_type ? 'AND fc.fraud_type = $1' : ''}
        ${fraud_severity ? `AND fc.fraud_severity = $${fraud_type ? 2 : 1}` : ''}
        ${case_status ? `AND fc.case_status = $${fraud_type && fraud_severity ? 3 : fraud_type || fraud_severity ? 2 : 1}` : ''}
      ORDER BY fc.detected_at DESC
      LIMIT $${[fraud_type, fraud_severity, case_status].filter(Boolean).length + 1}
    `;

    const params: any[] = [];
    if (fraud_type) params.push(fraud_type);
    if (fraud_severity) params.push(fraud_severity);
    if (case_status) params.push(case_status);
    params.push(limit ? parseInt(limit as string) : 100);

    const { executeQuery } = require('../config/database-hybrid');
    const fraudCases = await executeQuery(query, params);

    sendSuccess(res, {
      fraud_cases: fraudCases,
      total: fraudCases.length
    }, 'Fraud cases retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/fraud-cases/:upload_uuid
 * @desc    Get fraud cases detected in specific upload
 * @access  Private
 */
router.get('/fraud-cases/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;

    const fraudCases = await RenewalBulkUploadService.getFraudCases(upload_uuid);

    sendSuccess(res, {
      fraud_cases: fraudCases,
      total: fraudCases.length
    }, 'Fraud cases retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/records/:upload_uuid
 * @desc    Get all records from upload
 * @access  Private
 */
router.get('/records/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;
    const { status, fraud_only, limit } = req.query;

    // Get upload ID first
    const upload = await RenewalBulkUploadService.getUploadStatus(upload_uuid);

    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    const filters = {
      status: status as string,
      fraud_only: fraud_only === 'true',
      limit: limit ? parseInt(limit as string) : undefined
    };

    const records = await RenewalBulkUploadService.getUploadRecords(
      upload.upload_id,
      filters
    );

    sendSuccess(res, {
      records,
      total: records.length
    }, 'Upload records retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/recent
 * @desc    Get recent bulk uploads
 * @access  Private
 */
router.get('/recent',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { limit } = req.query;

    const query = `
      SELECT * FROM vw_upload_progress_summary
      ORDER BY uploaded_at DESC
      LIMIT $1
    `;

    const { executeQuery } = require('../config/database-hybrid');
    const uploads = await executeQuery(query, [limit ? parseInt(limit as string) : 20]);

    sendSuccess(res, {
      uploads,
      total: uploads.length
    }, 'Recent uploads retrieved successfully');
  })
);

/**
 * @route   POST /api/v1/renewal-bulk-upload/cancel/:upload_uuid
 * @desc    Cancel an upload
 * @access  Private (Admin)
 */
router.post('/cancel/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;

    await RenewalBulkUploadService.updateUploadProgress({
      upload_uuid,
      upload_status: 'Cancelled'
    });

    sendSuccess(res, null, 'Upload cancelled successfully');
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/download-template
 * @desc    Download Excel template for bulk upload
 * @access  Private
 */
router.get('/download-template',
  asyncHandler(async (req: Request, res: Response) => {
    const XLSX = require('xlsx');

    // Create template workbook
    const template = [
      {
        'Member ID': '1234567890123',
        'First Name': 'John',
        'Surname': 'Doe',
        'Email': 'john.doe@example.com',
        'Phone': '0821234567',
        'Ward Code': 'WARD001',
        'Ward Name': 'Ward 1',
        'Amount': 500.00,
        'Payment Method': 'Cash',
        'Payment Reference': 'REF123456',
        'Payment Date': '2025-10-01'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Renewals');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=renewal-upload-template.xlsx');
    res.send(buffer);
  })
);

/**
 * @route   GET /api/v1/renewal-bulk-upload/export-report/:upload_uuid
 * @desc    Export detailed report for upload
 * @access  Private
 */
router.get('/export-report/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;
    const XLSX = require('xlsx');

    // Get upload details
    const upload = await RenewalBulkUploadService.getUploadStatus(upload_uuid);

    if (!upload) {
      throw new NotFoundError('Upload not found');
    }

    // Get all records
    const records = await RenewalBulkUploadService.getUploadRecords(upload.upload_id);

    // Get fraud cases
    const fraudCases = await RenewalBulkUploadService.getFraudCases(upload_uuid);

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summary = [{
      'Upload ID': upload.upload_uuid,
      'File Name': upload.file_name,
      'Upload Status': upload.upload_status,
      'Total Records': upload.total_records,
      'Processed': upload.processed_records,
      'Successful': upload.successful_renewals,
      'Failed': upload.failed_validations,
      'Fraud Detected': upload.fraud_detected,
      'Early Renewals': upload.early_renewals,
      'Inactive Renewals': upload.inactive_renewals,
      'Uploaded At': upload.uploaded_at,
      'Uploaded By': upload.uploaded_by_name
    }];
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: All Records
    const recordsSheet = XLSX.utils.json_to_sheet(records);
    XLSX.utils.book_append_sheet(workbook, recordsSheet, 'All Records');

    // Sheet 3: Fraud Cases
    if (fraudCases.length > 0) {
      const fraudSheet = XLSX.utils.json_to_sheet(fraudCases);
      XLSX.utils.book_append_sheet(workbook, fraudSheet, 'Fraud Cases');
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=renewal-upload-report-${upload_uuid}.xlsx`);
    res.send(buffer);
  })
);

export default router;

