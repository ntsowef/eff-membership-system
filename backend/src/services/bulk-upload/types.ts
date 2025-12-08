/**
 * Shared TypeScript interfaces for Bulk Upload Services
 * 
 * This file contains all type definitions used across the bulk upload processor.
 * Migrated from Python bulk upload processor.
 */

// ============================================================================
// CORE RECORD TYPES
// ============================================================================

/**
 * Raw record from Excel file upload
 * Extended to include all fields from real-world bulk upload files
 */
export interface BulkUploadRecord {
  row_number: number;

  // Core identification
  'ID Number': string;

  // Name fields (support both formats)
  Name?: string;
  Firstname?: string;
  Surname?: string;

  // Contact information
  'Cell Number'?: string;
  'Landline Number'?: string;
  Email?: string;
  'Residential Address'?: string;

  // Demographic information
  Age?: number;
  Gender?: string;
  Race?: string;
  Citizenship?: string;
  Language?: string;

  // Professional information
  Occupation?: string;
  Qualification?: string;

  // Geographic information
  Province?: string;
  Region?: string;
  Municipality?: string;
  Ward?: string | number;
  'Voting Station'?: string;
  'Voting District'?: string;

  // Membership dates
  'Date Joined'?: any;
  'Last Payment'?: any;
  'Expiry Date'?: any;

  // Membership details
  Subscription?: string;
  'Memebership Amount'?: string; // Note: typo in source file
  'Membership Amount'?: string;  // Alternative spelling
  Status?: string;

  // Allow additional columns for flexibility
  [key: string]: any;
}

/**
 * Invalid ID record with error details
 */
export interface InvalidIdRecord extends BulkUploadRecord {
  error_message: string;
  validation_type: 'format' | 'checksum' | 'missing';
}

/**
 * Duplicate record within uploaded file
 */
export interface DuplicateRecord extends BulkUploadRecord {
  duplicate_count: number;
  first_occurrence_row: number;
  all_row_numbers: number[];
}

/**
 * Existing member record from database
 */
export interface ExistingMemberRecord extends BulkUploadRecord {
  existing_member_id: number;
  existing_name: string;
  existing_ward: string;
  existing_vd: string;
  existing_created_at: Date;
  existing_updated_at: Date;
  ward_changed: boolean;
  vd_changed: boolean;
}

/**
 * IEC verification result
 */
export interface IECVerificationResult {
  id_number: string;
  is_registered: boolean;
  voter_status?: string;
  province_code?: string;
  district_code?: string;
  municipality_code?: string;
  municipality?: string;  // IEC municipality name (e.g., "JHB - City of Johannesburg")
  ward_code?: string;
  voting_district_code?: string;
  voting_station_name?: string;
  verification_date: Date;
  error?: string;
}

/**
 * Verified record with IEC data
 */
export interface VerifiedRecord extends BulkUploadRecord {
  iec_registered: boolean;
  iec_ward?: string;
  iec_vd_code?: string;
  iec_voting_station?: string;
  iec_municipality?: string;  // IEC municipality name (e.g., "WC015 - Swartland")
  iec_province_code?: string;
  iec_district_code?: string;
  iec_municipality_code?: string;
  iec_voter_status?: string;
  iec_verification_date: Date;
  iec_error?: string;
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

/**
 * Pre-validation result
 */
export interface ValidationResult {
  valid_records: BulkUploadRecord[];
  invalid_ids: InvalidIdRecord[];
  duplicates: DuplicateRecord[];
  existing_members: ExistingMemberRecord[];
  new_members: BulkUploadRecord[];
  validation_stats: {
    total_records: number;
    valid_ids: number;
    invalid_ids: number;
    unique_records: number;
    duplicates: number;
    existing_members: number;
    new_members: number;
  };
}

/**
 * IEC verification result for batch
 */
export interface IECVerificationBatchResult {
  verified_records: VerifiedRecord[];
  failed_verifications: {
    id_number: string;
    error: string;
  }[];
  verification_stats: {
    total_records: number;
    registered: number;
    not_registered: number;
    failed: number;
  };
  // Rate limit information - stop processing when limit is hit
  rate_limit_hit?: boolean;
  rate_limit_reset_time?: number;
  rows_processed_before_limit?: number;
  rate_limit_message?: string;
}

// ============================================================================
// DATABASE OPERATION RESULTS
// ============================================================================

/**
 * Database operation result for single record
 */
export interface DatabaseOperationResult {
  id_number: string;
  success: boolean;
  operation: 'insert' | 'update' | 'skip';
  member_id?: number;
  error?: string;
}

/**
 * Database operations batch result
 */
export interface DatabaseOperationsBatchResult {
  successful_operations: DatabaseOperationResult[];
  failed_operations: DatabaseOperationResult[];
  operation_stats: {
    total_records: number;
    inserts: number;
    updates: number;
    skipped: number;
    failures: number;
  };
}

// ============================================================================
// PROCESSING RESULTS
// ============================================================================

/**
 * Complete processing result
 */
export interface ProcessingResult {
  file_id: number;
  file_path: string;
  uploaded_by: string;
  processing_start: Date;
  processing_end: Date;
  processing_duration_ms: number;

  // Validation results
  validation: ValidationResult;

  // IEC verification results
  iec_verification: IECVerificationBatchResult;

  // Database operation results
  database_operations: DatabaseOperationsBatchResult;

  // Report generation
  report_path: string;
  report_filename: string;

  // Processing status
  status: 'completed' | 'failed' | 'partial' | 'rate_limited';
  error_message?: string;

  // Rate limit information (when status is 'rate_limited')
  rate_limit_info?: {
    rate_limit_hit: boolean;
    rate_limit_reset_time: number;
    rows_processed_before_limit: number;
    rate_limit_message: string;
  };
}

// ============================================================================
// JOB QUEUE TYPES
// ============================================================================

/**
 * Bulk upload job data
 */
export interface BulkUploadJobData {
  file_id: number;
  file_path: string;
  uploaded_by: string;
  upload_timestamp: Date;
  priority?: number;
}

/**
 * Job progress data
 */
export interface JobProgress {
  stage: 'reading' | 'validating' | 'verifying' | 'processing' | 'reporting' | 'complete';
  percentage: number;
  rows_processed: number;
  rows_total: number;
  message?: string;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

/**
 * WebSocket progress event data
 */
export interface WebSocketProgressData {
  file_id: number;
  status: string;
  progress: number;
  rows_processed: number;
  rows_total: number;
  message?: string;
}

/**
 * WebSocket completion event data
 */
export interface WebSocketCompletionData {
  file_id: number;
  rows_success: number;
  rows_failed: number;
  rows_total: number;
  report_path: string;
  errors?: string[];
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Bulk upload processor configuration
 */
export interface BulkUploadConfig {
  // File processing
  max_file_size_mb: number;
  allowed_extensions: string[];
  
  // IEC verification
  iec_batch_size: number;
  iec_rate_limit_per_hour: number;
  iec_retry_attempts: number;
  iec_retry_delay_ms: number;
  
  // Database operations
  db_batch_size: number;
  db_transaction_timeout_ms: number;
  
  // Queue settings
  queue_concurrency: number;
  queue_max_retries: number;
  
  // Report settings
  report_directory: string;
  report_retention_days: number;
}