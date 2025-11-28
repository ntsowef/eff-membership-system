import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { FileReaderService } from './fileReaderService';
import { PreValidationService } from './preValidationService';
import { IECVerificationService } from './iecVerificationService';
import { DatabaseOperationsService } from './databaseOperationsService';
import { ExcelReportService } from './excelReportService';
import { WebSocketService } from '../websocketService';
import {
  BulkUploadRecord,
  ValidationResult,
  IECVerificationResult,
  DatabaseOperationsBatchResult,
  ProcessingResult,
  IECVerificationBatchResult
} from './types';

/**
 * Progress callback for real-time updates during processing
 */
export interface ProgressCallback {
  (stage: string, progress: number, message: string): void;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  dbPool: Pool;
  reportsDir: string;
  iecVerificationEnabled?: boolean;
  progressCallback?: ProgressCallback;
  // For WebSocket notifications
  fileId?: number;
  jobId?: string;
}

/**
 * Bulk Upload Orchestrator
 * 
 * Coordinates all services to process bulk member uploads:
 * 1. File Reading
 * 2. Pre-Validation (ID validation, duplicate detection, existing member check)
 * 3. IEC Verification (voter registration check)
 * 4. Database Operations (insert/update members)
 * 5. Excel Report Generation
 */
export class BulkUploadOrchestrator {
  private dbPool: Pool;
  private reportsDir: string;
  private iecVerificationEnabled: boolean;
  private progressCallback?: ProgressCallback;
  private fileId?: number;
  private jobId?: string;

  constructor(config: OrchestratorConfig) {
    this.dbPool = config.dbPool;
    this.reportsDir = config.reportsDir;
    this.iecVerificationEnabled = config.iecVerificationEnabled ?? true;
    this.progressCallback = config.progressCallback;
    this.fileId = config.fileId;
    this.jobId = config.jobId;
  }

  /**
   * Process bulk upload file end-to-end
   * 
   * @param filePath - Path to Excel file
   * @param uploadedBy - User who uploaded the file
   * @returns Complete processing result
   */
  async processUpload(filePath: string, uploadedBy: string): Promise<ProcessingResult> {
    const startTime = Date.now();

    this.logProgress('initialization', 0, '🚀 Starting bulk upload processing...');

    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }

      // Step 1: Read Excel file
      this.logProgress('file_reading', 10, '📖 Reading Excel file...');
      const originalData = FileReaderService.readExcelFile(filePath);

      if (originalData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      this.logProgress('file_reading', 20, `✅ Read ${originalData.length} records from file`);

      // Step 2: Pre-validation
      this.logProgress('validation', 25, '🔍 Validating records...');
      const validationResult = await PreValidationService.validateRecords(
        originalData,
        this.dbPool
      );

      this.logProgress('validation', 40, 
        `✅ Validation complete: ${validationResult.validation_stats.valid_ids} valid, ` +
        `${validationResult.validation_stats.invalid_ids} invalid, ` +
        `${validationResult.validation_stats.duplicates} duplicates`
      );

      // Step 3: IEC Verification (only for unique, valid records)
      const recordsToVerify = [
        ...validationResult.new_members,
        ...validationResult.existing_members,
      ];

      let iecResults = new Map<string, IECVerificationResult>();
      let iecBatchResult: import('./types').IECVerificationBatchResult = {
        verified_records: [],
        failed_verifications: [],
        verification_stats: {
          total_records: 0,
          registered: 0,
          not_registered: 0,
          failed: 0
        }
      };

      // Track if rate limit was hit
      let rateLimitHit = false;
      let rateLimitInfo: ProcessingResult['rate_limit_info'] | undefined;

      if (recordsToVerify.length > 0 && this.iecVerificationEnabled) {
        this.logProgress('iec_verification', 45, `🗳️  Verifying ${recordsToVerify.length} voters with IEC...`);

        const idNumbers = recordsToVerify.map((r) => r['ID Number']);
        iecBatchResult = await IECVerificationService.verifyVotersBatch(
          idNumbers,
          this.dbPool
        );

        // CHECK FOR RATE LIMIT HIT - This is the STOP FLAG implementation
        if (iecBatchResult.rate_limit_hit) {
          rateLimitHit = true;
          rateLimitInfo = {
            rate_limit_hit: true,
            rate_limit_reset_time: iecBatchResult.rate_limit_reset_time || 0,
            rows_processed_before_limit: iecBatchResult.rows_processed_before_limit || 0,
            rate_limit_message: iecBatchResult.rate_limit_message || 'IEC API rate limit exceeded'
          };

          const resetTimeStr = new Date(rateLimitInfo.rate_limit_reset_time).toLocaleTimeString();
          this.logProgress('iec_verification', 60,
            `🚫 IEC RATE LIMIT HIT: Processed ${rateLimitInfo.rows_processed_before_limit}/${recordsToVerify.length} records. ` +
            `Resets at ${resetTimeStr}`
          );

          // Send WebSocket notification about rate limit
          if (this.fileId) {
            WebSocketService.sendIECRateLimitExceeded(this.fileId, {
              current_count: rateLimitInfo.rows_processed_before_limit,
              max_limit: 10000,
              reset_time: rateLimitInfo.rate_limit_reset_time,
              rows_processed: rateLimitInfo.rows_processed_before_limit,
              rows_total: recordsToVerify.length,
              message: rateLimitInfo.rate_limit_message
            });
          }
        } else {
          // Convert VerifiedRecord to IECVerificationResult for database operations
          iecBatchResult.verified_records.forEach(record => {
            iecResults.set(record['ID Number'], {
              id_number: record['ID Number'],
              is_registered: record.iec_registered,
              voter_status: undefined,
              province_code: undefined,
              municipality_code: undefined,
              ward_code: record.iec_ward,
              voting_district_code: record.iec_vd_code,
              voting_station_name: record.iec_voting_station,
              verification_date: record.iec_verification_date,
              error: record.iec_error
            });
          });

          this.logProgress('iec_verification', 60,
            `✅ IEC verification complete: ${iecBatchResult.verification_stats.registered} registered, ` +
            `${iecBatchResult.verification_stats.not_registered} not registered`
          );
        }
      } else {
        this.logProgress('iec_verification', 60,
          this.iecVerificationEnabled
            ? '⏭️  No records to verify (all invalid or duplicates)'
            : '⏭️  IEC verification disabled'
        );
      }

      // Step 4: Database Operations (SKIP if rate limit hit)
      let dbResult: DatabaseOperationsBatchResult = {
        operation_stats: {
          total_records: 0,
          inserts: 0,
          updates: 0,
          skipped: 0,
          failures: 0
        },
        successful_operations: [],
        failed_operations: []
      };

      // IMPORTANT: Process ALL records even if rate limit was hit
      // Matching Python behavior: records without IEC verification still get inserted with special VD codes
      if (recordsToVerify.length > 0) {
        if (rateLimitHit) {
          this.logProgress('database_operations', 65,
            `💾 Processing ${recordsToVerify.length} database operations (IEC rate limit hit - using special VD codes for unverified records)...`
          );
        } else {
          this.logProgress('database_operations', 65, `💾 Processing ${recordsToVerify.length} database operations...`);
        }

        dbResult = await DatabaseOperationsService.processRecordsBatch(
          validationResult.new_members,
          validationResult.existing_members,
          iecResults,
          this.dbPool
        );

        this.logProgress('database_operations', 80,
          `✅ Database operations complete: ${dbResult.operation_stats.inserts} inserts, ` +
          `${dbResult.operation_stats.updates} updates, ${dbResult.operation_stats.failures} failures`
        );
      } else {
        this.logProgress('database_operations', 80, '⏭️  No database operations needed');
      }

      // Step 5: Generate Excel Report (generate even on rate limit for partial results)
      this.logProgress('report_generation', 85, '📊 Generating Excel report...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const reportFileName = `bulk-upload-report-${timestamp}.xlsx`;
      const reportPath = path.join(this.reportsDir, reportFileName);

      await ExcelReportService.generateReport(
        reportPath,
        originalData,
        validationResult,
        iecResults,
        dbResult
      );

      this.logProgress('report_generation', 95, `✅ Report generated: ${reportFileName}`);

      // Calculate processing duration
      const processingEnd = Date.now();
      const processingDuration = processingEnd - startTime;

      // Build complete processing result
      // Status is 'completed' even if rate limit hit since we now process ALL records with special VD codes
      const result: ProcessingResult = {
        file_id: this.fileId || 0,
        file_path: filePath,
        uploaded_by: uploadedBy,
        processing_start: new Date(startTime),
        processing_end: new Date(processingEnd),
        processing_duration_ms: processingDuration,
        validation: validationResult,
        iec_verification: iecBatchResult,
        database_operations: dbResult,
        report_path: reportPath,
        report_filename: reportFileName,
        status: 'completed', // Always complete since we insert ALL records (matching Python behavior)
        error_message: rateLimitHit
          ? `IEC API rate limit hit. Verified ${rateLimitInfo?.rows_processed_before_limit || 0}/${recordsToVerify.length} records. Unverified records inserted with special VD codes.`
          : undefined,
        rate_limit_info: rateLimitInfo
      };

      if (rateLimitHit) {
        this.logProgress('completion', 100,
          `⚠️ Processing complete with IEC rate limit. All ${dbResult.operation_stats.inserts + dbResult.operation_stats.updates} records inserted. Duration: ${(processingDuration / 1000).toFixed(2)}s`
        );
      } else {
        this.logProgress('completion', 100,
          `✅ Processing complete! Duration: ${(processingDuration / 1000).toFixed(2)}s`
        );
      }

      return result;

    } catch (error: any) {
      this.logProgress('error', 0, `❌ Processing failed: ${error.message}`);

      // Re-throw error for caller to handle
      throw error;
    }
  }

  /**
   * Log progress with optional callback
   */
  private logProgress(stage: string, progress: number, message: string): void {
    console.log(message);

    if (this.progressCallback) {
      this.progressCallback(stage, progress, message);
    }
  }

  /**
   * Validate file before processing
   */
  static validateFile(filePath: string): { valid: boolean; error?: string } {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist' };
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return { valid: false, error: 'Invalid file format. Only .xlsx and .xls files are supported' };
    }

    // Check file size (max 50MB)
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      return { valid: false, error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (50MB)` };
    }

    return { valid: true };
  }
}

