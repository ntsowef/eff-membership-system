import express from 'express';
import multer from 'multer';
import path from 'path';
import archiver from 'archiver';
import fs from 'fs';
import { FileWatcherService } from '../services/fileWatcherService';
import { FileProcessingQueueManager } from '../services/fileProcessingQueueManager';
import { authenticate, requirePermission } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { ValidationError } from '../middleware/errorHandler';
import { redisService } from '../services/redisService';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const fileWatcher = FileWatcherService.getInstance();
const queueManager = FileProcessingQueueManager.getInstance();

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, fileWatcher.getUploadDirectory());
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const filename = `${baseName}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Get queue status
router.get('/queue/status',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    const status = await queueManager.getQueueStatus();
    sendSuccess(res, status, 'Queue status retrieved successfully');
  })
);

// Get job history
router.get('/jobs',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const jobs = await queueManager.getJobHistory(limit);
    sendSuccess(res, jobs, 'Job history retrieved successfully');
  })
);

// Get specific job details
router.get('/jobs/:jobId',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = await redisService.hgetall(`job:${jobId}`);
    
    if (!job || Object.keys(job).length === 0) {
      return sendError(res, new Error('Job not found'), 'Job not found', 404);
    }
    
    // Parse result if it exists
    if (job.result) {
      try {
        job.result = JSON.parse(job.result);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    
    sendSuccess(res, job, 'Job details retrieved successfully');
  })
);

// Manual file upload endpoint
router.post('/upload',
  authenticate,
  requirePermission('members.create'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return sendError(res, new Error('No file uploaded'), 'No file uploaded', 400);
    }
    
    const wardNumber = req.body.ward_number ? parseInt(req.body.ward_number) : undefined;
    
    sendSuccess(res, {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      wardNumber,
      message: 'File uploaded successfully and queued for processing'
    }, 'File uploaded successfully');
  })
);

// Download processed files as ZIP package
router.get('/download/:jobId',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    console.log(`🔍 Download request for job: ${jobId}`);

    const job = await redisService.hgetall(`job:${jobId}`);
    console.log(`📊 Job data:`, {
      exists: !!job,
      keys: job ? Object.keys(job) : [],
      status: job?.status,
      hasResult: !!job?.result
    });

    if (!job || Object.keys(job).length === 0) {
      console.log(`❌ Job not found: ${jobId}`);
      return sendError(res, new Error('Job not found'), 'Job not found', 404);
    }

    let result: any = null;
    if (job.result) {
      try {
        // Handle both string and already-parsed result
        if (typeof job.result === 'string') {
          // Check if it's corrupted data like "[object Object]"
          if (job.result === '[object Object]' || job.result.startsWith('[object')) {
            console.log(`⚠️ Corrupted result data detected for job: ${jobId}`);
            result = null;
          } else {
            result = JSON.parse(job.result);
          }
        } else {
          // Already an object
          result = job.result;
        }
      } catch (parseError) {
        console.log(`⚠️ Failed to parse job result for ${jobId}:`, parseError);
        result = null;
      }
    }

    console.log(`📋 Job result:`, {
      hasResult: !!result,
      hasOutputFiles: !!(result?.output_files),
      outputFilesCount: result?.output_files?.length || 0,
      outputFiles: result?.output_files || []
    });

    if (!result || !result.output_files || result.output_files.length === 0) {
      console.log(`❌ No output files available for job: ${jobId}`);
      return sendError(res, new Error('No output files available'), 'No output files available', 404);
    }

    // Verify all files exist
    const existingFiles = result.output_files.filter((filePath: string) => {
      const exists = fs.existsSync(filePath);
      console.log(`📁 File check: ${filePath} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      return exists;
    });

    console.log(`📊 File verification: ${existingFiles.length}/${result.output_files.length} files exist`);

    if (existingFiles.length === 0) {
      console.log(`❌ No processed files found on disk for job: ${jobId}`);
      return sendError(res, new Error('No processed files found'), 'No processed files found', 404);
    }

    // Create ZIP filename based on the main Excel file
    const mainFile = existingFiles.find((file: string) => file.endsWith('.xlsx')) || existingFiles[0];
    const baseName = path.basename(mainFile, path.extname(mainFile));
    const zipFileName = `${baseName}_Package.zip`;

    console.log(`📦 Creating ZIP: ${zipFileName} with ${existingFiles.length} files`);

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      if (!res.headersSent) {
        return sendError(res, err, 'Failed to create archive', 500);
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add all files to the archive
    existingFiles.forEach((filePath: string) => {
      const fileName = path.basename(filePath);
      console.log(`➕ Adding file to ZIP: ${fileName}`);
      archive.file(filePath, { name: fileName });
    });

    // Finalize the archive
    try {
      await archive.finalize();
      console.log(`✅ ZIP package created successfully: ${zipFileName} (${existingFiles.length} files)`);
    } catch (error) {
      console.error('❌ Error finalizing archive:', error);
      throw error;
    }
  })
);

// Download processed files (with specific filename - legacy support)
router.get('/download/:jobId/:fileName',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    const { jobId, fileName } = req.params;
    const job = await redisService.hgetall(`job:${jobId}`);
    
    if (!job || Object.keys(job).length === 0) {
      return sendError(res, new Error('Job not found'), 'Job not found', 404);
    }
    
    const result = job.result ? JSON.parse(job.result) : null;
    if (!result || !result.output_files) {
      return sendError(res, new Error('No output files available'), 'No output files available', 404);
    }
    
    const filePath = result.output_files.find((file: string) => 
      path.basename(file) === fileName
    );
    
    if (!filePath || !require('fs').existsSync(filePath)) {
      return sendError(res, new Error('File not found'), 'File not found', 404);
    }
    
    res.download(filePath, fileName);
  })
);

// Cancel job
router.post('/jobs/:jobId/cancel',
  authenticate,
  requirePermission('members.write'),
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const success = await queueManager.cancelJob(jobId);

    if (!success) {
      return sendError(res, new Error('Job cannot be cancelled'), 'Only queued jobs can be cancelled', 400);
    }

    sendSuccess(res, { jobId, status: 'cancelled' }, 'Job cancelled successfully');
  })
);

// Clear queue (emergency cleanup)
router.post('/queue/clear',
  authenticate,
  requirePermission('members.write'),
  asyncHandler(async (req, res) => {
    const clearedCount = await queueManager.clearQueue();
    sendSuccess(res, { cleared_count: clearedCount }, `Cleared ${clearedCount} jobs from queue`);
  })
);

// Get service status
router.get('/status',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    const status = {
      fileWatcher: {
        active: fileWatcher.isActive(),
        uploadDirectory: fileWatcher.getUploadDirectory()
      },
      queueManager: {
        processing: queueManager.isCurrentlyProcessing(),
        currentJob: queueManager.getCurrentJob()
      },
      redis: {
        connected: redisService.getConnectionStatus()
      }
    };
    
    sendSuccess(res, status, 'Service status retrieved successfully');
  })
);

export default router;
