import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { ValidationError } from '../middleware/errorHandler';
import { MemberApplicationBulkUploadService } from '../services/memberApplicationBulkUploadService';
import { MemberApplicationBulkProcessor } from '../services/memberApplicationBulkProcessor';

const router = Router();

// =====================================================================================
// MULTER CONFIGURATION
// =====================================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/member-applications');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}_${timestamp}${ext}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed'));
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
 * @route   POST /api/v1/member-application-bulk-upload/upload
 * @desc    Upload bulk member application spreadsheet
 * @access  Private (Admin)
 */
router.post('/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 1; // TESTING: Default to user ID 1

    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = (ext === '.csv') ? 'CSV' : 'Excel';

    // Create upload record
    const upload_uuid = await MemberApplicationBulkUploadService.createBulkUpload({
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_type: fileType,
      file_size: req.file.size,
      uploaded_by: userId
    });

    // Start background processing
    setImmediate(async () => {
      try {
        await MemberApplicationBulkProcessor.processBulkUpload(upload_uuid);
      } catch (error) {
        console.error('Background processing error:', error);
      }
    });

    sendSuccess(res, {
      upload_uuid,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: fileType,
      message: 'File uploaded successfully and queued for processing'
    }, 'File uploaded successfully', 201);
  })
);

/**
 * @route   GET /api/v1/member-application-bulk-upload/status/:upload_uuid
 * @desc    Get upload processing status
 * @access  Private
 */
router.get('/status/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;

    const status = await MemberApplicationBulkUploadService.getUploadStatus(upload_uuid);

    if (!status) {
      throw new ValidationError('Upload not found');
    }

    sendSuccess(res, status, 'Upload status retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/member-application-bulk-upload/records/:upload_uuid
 * @desc    Get all records from an upload
 * @access  Private
 */
router.get('/records/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;
    const { status, limit = 100, offset = 0 } = req.query;

    const query = `
      SELECT 
        r.*,
        u.upload_uuid,
        u.file_name
      FROM member_application_bulk_upload_records r
      INNER JOIN member_application_bulk_uploads u ON r.upload_id = u.upload_id
      WHERE u.upload_uuid = $1
        ${status ? 'AND r.record_status = $2' : ''}
      ORDER BY r.row_number ASC
      LIMIT $${status ? 3 : 2}
      OFFSET $${status ? 4 : 3}
    `;

    const params = status 
      ? [upload_uuid, status, limit, offset]
      : [upload_uuid, limit, offset];

    const { executeQuery } = await import('../config/database');
    const records = await executeQuery(query, params);

    sendSuccess(res, records, 'Upload records retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/member-application-bulk-upload/recent
 * @desc    Get recent uploads
 * @access  Private
 */
router.get('/recent',
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const query = `
      SELECT 
        u.*,
        us.name as uploaded_by_name
      FROM member_application_bulk_uploads u
      LEFT JOIN users us ON u.uploaded_by = us.user_id
      ORDER BY u.created_at DESC
      LIMIT $1
    `;

    const { executeQuery } = await import('../config/database');
    const uploads = await executeQuery(query, [limit]);

    sendSuccess(res, uploads, 'Recent uploads retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/member-application-bulk-upload/download-template
 * @desc    Download Excel template for bulk upload
 * @access  Public
 */
router.get('/download-template',
  asyncHandler(async (req: Request, res: Response) => {
    // Create template workbook
    const workbook = XLSX.utils.book_new();

    // Define template headers
    const headers = [
      'First Name',
      'Last Name',
      'ID Number',
      'Date of Birth',
      'Gender',
      'Email',
      'Cell Number',
      'Address',
      'Ward Code',
      'Province Code',
      'District Code',
      'Municipal Code',
      'Application Type',
      'Payment Method',
      'Payment Reference',
      'Payment Amount'
    ];

    // Create sample data
    const sampleData = [
      [
        'John',
        'Doe',
        '8001015009087',
        '1980-01-01',
        'Male',
        'john.doe@example.com',
        '0821234567',
        '123 Main St, Johannesburg',
        '12345678',
        'GP',
        'DC10',
        'JHB',
        'New',
        'Cash',
        'REF123',
        '100.00'
      ]
    ];

    // Create worksheet
    const worksheetData = [headers, ...sampleData];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 15 }, // ID Number
      { wch: 12 }, // Date of Birth
      { wch: 10 }, // Gender
      { wch: 25 }, // Email
      { wch: 15 }, // Cell Number
      { wch: 30 }, // Address
      { wch: 12 }, // Ward Code
      { wch: 12 }, // Province Code
      { wch: 12 }, // District Code
      { wch: 12 }, // Municipal Code
      { wch: 15 }, // Application Type
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Payment Reference
      { wch: 15 }  // Payment Amount
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Member Applications');

    // Add instructions sheet
    const instructions = [
      ['BULK MEMBER APPLICATION UPLOAD - INSTRUCTIONS'],
      [''],
      ['Required Fields:'],
      ['- First Name: Applicant\'s first name'],
      ['- Last Name: Applicant\'s last name/surname'],
      ['- ID Number: 13-digit South African ID number'],
      ['- Date of Birth: Format: YYYY-MM-DD'],
      ['- Gender: Male, Female, Other, or Prefer not to say'],
      ['- Cell Number: Valid cell phone number (minimum 10 digits)'],
      ['- Address: Full residential address'],
      ['- Ward Code: Valid ward code'],
      [''],
      ['Optional Fields:'],
      ['- Email: Valid email address'],
      ['- Province Code: 2-letter province code (e.g., GP, WC, KZN)'],
      ['- District Code: District code'],
      ['- Municipal Code: Municipality code'],
      ['- Application Type: New, Renewal, or Transfer (default: New)'],
      ['- Payment Method: Cash, EFT, Card, etc.'],
      ['- Payment Reference: Payment reference number'],
      ['- Payment Amount: Amount paid (numeric)'],
      [''],
      ['Notes:'],
      ['- Do not modify the header row'],
      ['- Delete the sample data row before uploading'],
      ['- Duplicate ID numbers will be rejected'],
      ['- Maximum file size: 50MB'],
      ['- Supported formats: Excel (.xlsx, .xls) and CSV']
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionsSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Member_Application_Bulk_Upload_Template.xlsx');

    // Send file
    res.send(buffer);
  })
);

/**
 * @route   POST /api/v1/member-application-bulk-upload/cancel/:upload_uuid
 * @desc    Cancel upload processing
 * @access  Private
 */
router.post('/cancel/:upload_uuid',
  asyncHandler(async (req: Request, res: Response) => {
    const { upload_uuid } = req.params;

    await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
      status: 'Cancelled'
    });

    sendSuccess(res, { upload_uuid }, 'Upload cancelled successfully');
  })
);

export default router;

