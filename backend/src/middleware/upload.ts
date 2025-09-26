import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ValidationError } from './errorHandler';

// File upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
const ensureUploadDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create upload directories
const createUploadDirs = () => {
  const dirs = [
    path.join(UPLOAD_DIR, 'documents'),
    path.join(UPLOAD_DIR, 'documents', 'id-copies'),
    path.join(UPLOAD_DIR, 'documents', 'proof-of-address'),
    path.join(UPLOAD_DIR, 'documents', 'profile-photos'),
    path.join(UPLOAD_DIR, 'documents', 'supporting-documents'),
    path.join(UPLOAD_DIR, 'temp')
  ];

  dirs.forEach(ensureUploadDir);
};

// Initialize upload directories
createUploadDirs();

// File filter function
const fileFilter = (req: Request, file: any, cb: multer.FileFilterCallback) => {
  // Get document type from request body or query
  const documentType = req.body.document_type || req.query.document_type;
  
  if (!documentType) {
    return cb(new ValidationError('Document type is required'));
  }

  // Define allowed MIME types for each document type
  const allowedMimeTypes: { [key: string]: string[] } = {
    'ID Copy': ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    'Proof of Address': ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    'Profile Photo': ['image/jpeg', 'image/png', 'image/gif'],
    'Supporting Document': [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  };

  const allowed = allowedMimeTypes[documentType];
  if (!allowed || !allowed.includes(file.mimetype)) {
    return cb(new ValidationError(`Invalid file type for ${documentType}. Allowed types: ${allowed?.join(', ')}`));
  }

  cb(null, true);
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file: any, cb) => {
    const documentType = req.body.document_type || req.query.document_type;
    
    let subDir = 'supporting-documents'; // default
    switch (documentType) {
      case 'ID Copy':
        subDir = 'id-copies';
        break;
      case 'Proof of Address':
        subDir = 'proof-of-address';
        break;
      case 'Profile Photo':
        subDir = 'profile-photos';
        break;
      case 'Supporting Document':
        subDir = 'supporting-documents';
        break;
    }

    const uploadPath = path.join(UPLOAD_DIR, 'documents', subDir);
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req: Request, file: any, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${random}${extension}`;
    
    // Store the generated filename in request for later use
    req.body.stored_filename = filename;
    
    cb(null, filename);
  }
});

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow one file per upload
  }
});

// Single file upload middleware
export const uploadSingle = (fieldName: string = 'file') => {
  return upload.single(fieldName);
};

// Multiple files upload middleware (max 5 files)
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};

// Handle multer errors
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new ValidationError(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`));
      case 'LIMIT_FILE_COUNT':
        return next(new ValidationError('Too many files uploaded'));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new ValidationError('Unexpected file field'));
      default:
        return next(new ValidationError(`Upload error: ${error.message}`));
    }
  }
  
  next(error);
};

// Utility function to get file path
export const getFilePath = (documentType: string, filename: string): string => {
  let subDir = 'supporting-documents';
  switch (documentType) {
    case 'ID Copy':
      subDir = 'id-copies';
      break;
    case 'Proof of Address':
      subDir = 'proof-of-address';
      break;
    case 'Profile Photo':
      subDir = 'profile-photos';
      break;
    case 'Supporting Document':
      subDir = 'supporting-documents';
      break;
  }

  return path.join(UPLOAD_DIR, 'documents', subDir, filename);
};

// Utility function to delete file
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.warn(`Warning: Could not delete file ${filePath}:`, error);
  }
};

// Utility function to check if file exists
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

// Utility function to get file stats
export const getFileStats = async (filePath: string) => {
  try {
    return await fs.promises.stat(filePath);
  } catch (error) {
    return null;
  }
};

// Validate file size for specific document type
export const validateFileSize = (documentType: string, fileSize: number): { valid: boolean; error?: string } => {
  const maxSizes: { [key: string]: number } = {
    'ID Copy': 5 * 1024 * 1024, // 5MB
    'Proof of Address': 5 * 1024 * 1024, // 5MB
    'Profile Photo': 2 * 1024 * 1024, // 2MB
    'Supporting Document': 10 * 1024 * 1024 // 10MB
  };

  const maxSize = maxSizes[documentType];
  if (!maxSize) {
    return { valid: false, error: 'Invalid document type' };
  }

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(maxSize / (1024 * 1024))}MB for ${documentType}`
    };
  }

  return { valid: true };
};

// Clean up temporary files
export const cleanupTempFiles = async (): Promise<void> => {
  const tempDir = path.join(UPLOAD_DIR, 'temp');
  try {
    const files = await fs.promises.readdir(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.promises.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up temporary file: ${file}`);
      }
    }
  } catch (error) {
    console.warn('Warning: Could not clean up temporary files:', error);
  }
};

// Schedule cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

export { UPLOAD_DIR, MAX_FILE_SIZE };
