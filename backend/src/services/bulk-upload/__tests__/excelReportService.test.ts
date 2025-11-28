import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { ExcelReportService } from '../excelReportService';
import {
  BulkUploadRecord,
  InvalidIdRecord,
  DuplicateRecord,
  ExistingMemberRecord,
  IECVerificationResult,
  ValidationResult,
  DatabaseOperationsBatchResult
} from '../types';

describe('ExcelReportService', () => {
  const testOutputDir = path.join(__dirname, 'test-reports');
  const testOutputPath = path.join(testOutputDir, 'test-report.xlsx');

  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmdirSync(testOutputDir);
    }
  });

  describe('generateReport', () => {
    it('should generate complete Excel report with all 7 sheets', async () => {
      // Prepare test data
      const originalData: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Firstname: 'John',
          Surname: 'Doe',
          'Cell Number': '0821234567',
          Email: 'john@example.com'
        },
        {
          row_number: 3,
          'ID Number': '9505050505085',
          Firstname: 'Jane',
          Surname: 'Smith',
          'Cell Number': '0829876543',
          Email: 'jane@example.com'
        }
      ];

      const invalidIds: InvalidIdRecord[] = [
        {
          row_number: 4,
          'ID Number': '1234567890123',
          error_message: 'Invalid checksum',
          validation_type: 'checksum',
          Firstname: 'Invalid',
          Surname: 'User'
        }
      ];

      const duplicates: DuplicateRecord[] = [
        {
          row_number: 5,
          'ID Number': '8001015009087',
          duplicate_count: 2,
          first_occurrence_row: 2,
          all_row_numbers: [2, 5],
          Firstname: 'John',
          Surname: 'Doe'
        }
      ];

      const existingMembers: ExistingMemberRecord[] = [
        {
          row_number: 3,
          'ID Number': '9505050505085',
          Firstname: 'Jane',
          Surname: 'Smith',
          existing_member_id: 12345,
          existing_name: 'Jane Smith',
          existing_ward: '59900001',
          existing_vd: '59900001001',
          existing_created_at: new Date('2023-01-01'),
          existing_updated_at: new Date('2023-01-01'),
          ward_changed: false,
          vd_changed: false
        }
      ];

      const validationResult: ValidationResult = {
        validation_stats: {
          total_records: 5,
          valid_ids: 2,
          invalid_ids: 1,
          unique_records: 4,
          duplicates: 1,
          existing_members: 1,
          new_members: 1
        },
        valid_records: originalData,
        invalid_ids: invalidIds,
        duplicates: duplicates,
        new_members: [originalData[0]],
        existing_members: existingMembers
      };

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          ward_code: '59900001',
          voting_district_code: '59900001001',
          verification_date: new Date()
        }],
        ['9505050505085', {
          id_number: '9505050505085',
          is_registered: false,
          verification_date: new Date()
        }]
      ]);

      const dbResult: DatabaseOperationsBatchResult = {
        operation_stats: {
          total_records: 2,
          inserts: 1,
          updates: 1,
          skipped: 0,
          failures: 0
        },
        successful_operations: [
          {
            id_number: '8001015009087',
            member_id: 100,
            operation: 'insert',
            success: true
          },
          {
            id_number: '9505050505085',
            member_id: 12345,
            operation: 'update',
            success: true
          }
        ],
        failed_operations: []
      };

      // Generate report
      const reportPath = await ExcelReportService.generateReport(
        testOutputPath,
        originalData,
        validationResult,
        iecResults,
        dbResult
      );

      // Verify file was created
      expect(fs.existsSync(reportPath)).toBe(true);

      // Read and verify workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(reportPath);

      // Verify all 7 sheets exist
      expect(workbook.worksheets.length).toBe(7);
      expect(workbook.getWorksheet('Summary')).toBeDefined();
      expect(workbook.getWorksheet('All Uploaded Rows')).toBeDefined();
      expect(workbook.getWorksheet('Invalid IDs')).toBeDefined();
      expect(workbook.getWorksheet('Duplicates')).toBeDefined();
      expect(workbook.getWorksheet('Not Registered')).toBeDefined();
      expect(workbook.getWorksheet('New Members')).toBeDefined();
      expect(workbook.getWorksheet('Existing Members (Updated)')).toBeDefined();
    });

    it('should verify Summary sheet content and styling', async () => {
      const validationResult: ValidationResult = {
        validation_stats: {
          total_records: 10,
          valid_ids: 8,
          invalid_ids: 2,
          unique_records: 9,
          duplicates: 1,
          existing_members: 3,
          new_members: 5
        },
        valid_records: [],
        invalid_ids: [],
        duplicates: [],
        new_members: [],
        existing_members: []
      };

      const dbResult: DatabaseOperationsBatchResult = {
        operation_stats: {
          total_records: 8,
          inserts: 5,
          updates: 3,
          skipped: 0,
          failures: 0
        },
        successful_operations: [],
        failed_operations: []
      };

      await ExcelReportService.generateReport(
        testOutputPath,
        [],
        validationResult,
        new Map(),
        dbResult
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(testOutputPath);
      const sheet = workbook.getWorksheet('Summary');

      // Verify title
      expect(sheet!.getCell('A1').value).toBe('Bulk Upload Processing Summary');
      expect(sheet!.getCell('A1').font?.bold).toBe(true);
      expect(sheet!.getCell('A1').font?.size).toBe(16);

      // Verify validation stats
      expect(sheet!.getCell('A4').value).toBe('VALIDATION STATISTICS');
      expect(sheet!.getCell('B5').value).toBe(10); // Total Records
      expect(sheet!.getCell('B6').value).toBe(8);  // Valid IDs
      expect(sheet!.getCell('B7').value).toBe(2);  // Invalid IDs

      // Verify processing stats
      expect(sheet!.getCell('B14').value).toBe(8); // Total Processed
      expect(sheet!.getCell('B15').value).toBe(5); // Successful Inserts
      expect(sheet!.getCell('B16').value).toBe(3); // Successful Updates
    });

    it('should handle empty sheets gracefully', async () => {
      const validationResult: ValidationResult = {
        validation_stats: {
          total_records: 0,
          valid_ids: 0,
          invalid_ids: 0,
          unique_records: 0,
          duplicates: 0,
          existing_members: 0,
          new_members: 0
        },
        valid_records: [],
        invalid_ids: [],
        duplicates: [],
        new_members: [],
        existing_members: []
      };

      await ExcelReportService.generateReport(
        testOutputPath,
        [],
        validationResult,
        new Map(),
        {
          operation_stats: { total_records: 0, inserts: 0, updates: 0, skipped: 0, failures: 0 },
          successful_operations: [],
          failed_operations: []
        }
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(testOutputPath);

      // Verify empty sheets have appropriate messages
      expect(workbook.getWorksheet('Invalid IDs')!.getCell('A1').value).toBe('No invalid ID numbers found');
      expect(workbook.getWorksheet('Duplicates')!.getCell('A1').value).toBe('No duplicate records found');
      expect(workbook.getWorksheet('Not Registered')!.getCell('A1').value).toBe('All members are registered voters');
      expect(workbook.getWorksheet('New Members')!.getCell('A1').value).toBe('No new members added');
      expect(workbook.getWorksheet('Existing Members (Updated)')!.getCell('A1').value).toBe('No existing members updated');
    });

    it('should verify Invalid IDs sheet with red header', async () => {
      const invalidIds: InvalidIdRecord[] = [
        {
          row_number: 2,
          'ID Number': '1234567890123',
          error_message: 'Invalid checksum',
          validation_type: 'checksum',
          Firstname: 'Invalid',
          Surname: 'User'
        }
      ];

      const validationResult: ValidationResult = {
        validation_stats: {
          total_records: 1,
          valid_ids: 0,
          invalid_ids: 1,
          unique_records: 1,
          duplicates: 0,
          existing_members: 0,
          new_members: 0
        },
        valid_records: [],
        invalid_ids: invalidIds,
        duplicates: [],
        new_members: [],
        existing_members: []
      };

      await ExcelReportService.generateReport(
        testOutputPath,
        [],
        validationResult,
        new Map(),
        {
          operation_stats: { total_records: 0, inserts: 0, updates: 0, skipped: 0, failures: 0 },
          successful_operations: [],
          failed_operations: []
        }
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(testOutputPath);
      const sheet = workbook.getWorksheet('Invalid IDs');

      // Verify header row styling (red background)
      const headerRow = sheet!.getRow(1);
      expect(headerRow.font?.bold).toBe(true);
      expect(headerRow.fill).toBeDefined();
      const fill = headerRow.fill as ExcelJS.FillPattern;
      expect(fill.fgColor?.argb).toBe('FFFF6B6B');

      // Verify data
      expect(sheet!.getCell('A2').value).toBe(2); // Row Number
      expect(sheet!.getCell('B2').value).toBe('Invalid checksum'); // Error
      expect(sheet!.getCell('C2').value).toBe('1234567890123'); // ID Number
    });
  });
});
