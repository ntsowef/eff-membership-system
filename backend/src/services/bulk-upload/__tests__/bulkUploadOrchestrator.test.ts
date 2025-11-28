import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { BulkUploadOrchestrator, ProgressCallback } from '../bulkUploadOrchestrator';

describe('BulkUploadOrchestrator', () => {
  let pool: Pool;
  let orchestrator: BulkUploadOrchestrator;
  const testReportsDir = path.join(__dirname, 'test-reports-orchestrator');
  const testFilePath = path.join(__dirname, '../../../../reports/2nd Letsemeng Ward 3 Upload.xlsx');

  beforeAll(() => {
    // Create database connection pool
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'eff_membership',
      user: 'postgres',
      password: 'postgres',
      max: 20
    });

    // Create test reports directory
    if (!fs.existsSync(testReportsDir)) {
      fs.mkdirSync(testReportsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();

    // Clean up test reports directory
    if (fs.existsSync(testReportsDir)) {
      const files = fs.readdirSync(testReportsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testReportsDir, file));
      });
      fs.rmdirSync(testReportsDir);
    }
  });

  beforeEach(() => {
    orchestrator = new BulkUploadOrchestrator({
      dbPool: pool,
      reportsDir: testReportsDir,
      iecVerificationEnabled: false // Disable IEC for testing
    });
  });

  describe('validateFile', () => {
    it('should validate existing Excel file', () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(testFilePath)) {
        console.log('⏭️  Skipping test - test file not found');
        return;
      }

      const result = BulkUploadOrchestrator.validateFile(testFilePath);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-existent file', () => {
      const result = BulkUploadOrchestrator.validateFile('/path/to/nonexistent.xlsx');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File does not exist');
    });

    it('should reject invalid file format', () => {
      const testFile = path.join(testReportsDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');
      
      const result = BulkUploadOrchestrator.validateFile(testFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file format');
      
      fs.unlinkSync(testFile);
    });
  });

  describe('processUpload', () => {
    it('should process complete bulk upload end-to-end', async () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(testFilePath)) {
        console.log('⏭️  Skipping integration test - test file not found');
        return;
      }

      const progressUpdates: Array<{ stage: string; progress: number; message: string }> = [];
      
      const progressCallback: ProgressCallback = (stage, progress, message) => {
        progressUpdates.push({ stage, progress, message });
      };

      orchestrator = new BulkUploadOrchestrator({
        dbPool: pool,
        reportsDir: testReportsDir,
        iecVerificationEnabled: false,
        progressCallback
      });

      const result = await orchestrator.processUpload(testFilePath, 'test-user');

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.file_path).toBe(testFilePath);
      expect(result.uploaded_by).toBe('test-user');
      expect(result.status).toBe('completed');
      expect(result.processing_duration_ms).toBeGreaterThan(0);

      // Verify validation results
      expect(result.validation).toBeDefined();
      expect(result.validation.validation_stats.total_records).toBeGreaterThan(0);

      // Verify database operations
      expect(result.database_operations).toBeDefined();
      expect(result.database_operations.operation_stats).toBeDefined();

      // Verify report was generated
      expect(result.report_path).toBeDefined();
      expect(fs.existsSync(result.report_path)).toBe(true);

      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('initialization');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('completion');
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);

      console.log('\n📊 Processing Summary:');
      console.log(`   Total Records: ${result.validation.validation_stats.total_records}`);
      console.log(`   Valid IDs: ${result.validation.validation_stats.valid_ids}`);
      console.log(`   Invalid IDs: ${result.validation.validation_stats.invalid_ids}`);
      console.log(`   Duplicates: ${result.validation.validation_stats.duplicates}`);
      console.log(`   New Members: ${result.validation.validation_stats.new_members}`);
      console.log(`   Existing Members: ${result.validation.validation_stats.existing_members}`);
      console.log(`   Inserts: ${result.database_operations.operation_stats.inserts}`);
      console.log(`   Updates: ${result.database_operations.operation_stats.updates}`);
      console.log(`   Failures: ${result.database_operations.operation_stats.failures}`);
      console.log(`   Duration: ${(result.processing_duration_ms / 1000).toFixed(2)}s`);
      console.log(`   Report: ${result.report_filename}`);
    }, 120000); // 2 minute timeout for integration test

    it('should handle empty file gracefully', async () => {
      // Create empty Excel file
      const emptyFilePath = path.join(testReportsDir, 'empty.xlsx');
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, emptyFilePath);

      await expect(orchestrator.processUpload(emptyFilePath, 'test-user')).rejects.toThrow('No data found in Excel file');

      fs.unlinkSync(emptyFilePath);
    });
  });
});

