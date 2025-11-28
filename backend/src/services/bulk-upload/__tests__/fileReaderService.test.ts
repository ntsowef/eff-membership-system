import { FileReaderService } from '../fileReaderService';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

describe('FileReaderService', () => {
  const testDataDir = path.join(__dirname, 'test-data');
  const testFilePath = path.join(testDataDir, 'test-members.xlsx');

  beforeAll(() => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('parseDate', () => {
    it('should parse Date objects', () => {
      const date = new Date('2024-01-15');
      const result = FileReaderService.parseDate(date);
      expect(result).toEqual(date);
    });

    it('should parse ISO date strings', () => {
      const result = FileReaderService.parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January = 0
      expect(result?.getDate()).toBe(15);
    });

    it('should parse Excel serial numbers', () => {
      // Excel serial 45292 = 2024-01-01
      const result = FileReaderService.parseDate(45292);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(1);
    });

    it('should return null for invalid values', () => {
      expect(FileReaderService.parseDate(null)).toBeNull();
      expect(FileReaderService.parseDate(undefined)).toBeNull();
      expect(FileReaderService.parseDate('')).toBeNull();
      expect(FileReaderService.parseDate('invalid-date')).toBeNull();
    });
  });

  describe('excelSerialToDate', () => {
    it('should convert Excel serial 1 to 1899-12-31', () => {
      const result = FileReaderService.excelSerialToDate(1);
      expect(result.getFullYear()).toBe(1899);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(31);
    });

    it('should convert Excel serial 45292 to 2024-01-01', () => {
      const result = FileReaderService.excelSerialToDate(45292);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });

    it('should convert Excel serial 44927 to 2023-01-01', () => {
      const result = FileReaderService.excelSerialToDate(44927);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });
  });

  describe('addMonths', () => {
    it('should add months to a date', () => {
      const date = new Date('2024-01-15');
      const result = FileReaderService.addMonths(date, 3);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(15);
    });

    it('should handle year rollover', () => {
      const date = new Date('2024-11-15');
      const result = FileReaderService.addMonths(date, 3);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(15);
    });

    it('should add 24 months correctly', () => {
      const date = new Date('2024-01-15');
      const result = FileReaderService.addMonths(date, 24);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });
  });

  describe('calculateExpiryDate', () => {
    it('should calculate expiry date as payment date + 24 months', () => {
      const paymentDate = new Date('2024-01-15');
      const result = FileReaderService.calculateExpiryDate(paymentDate);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it('should handle Excel serial numbers', () => {
      // Excel serial 45292 = 2024-01-01
      const result = FileReaderService.calculateExpiryDate(45292);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(1);
    });

    it('should return null for invalid dates', () => {
      expect(FileReaderService.calculateExpiryDate(null)).toBeNull();
      expect(FileReaderService.calculateExpiryDate(undefined)).toBeNull();
      expect(FileReaderService.calculateExpiryDate('invalid')).toBeNull();
    });
  });

  describe('readExcelFile', () => {
    beforeEach(() => {
      // Create test Excel file
      const testData = [
        {
          'ID Number': '8001015009087',
          'Name': 'John',
          'Surname': 'Doe',
          'Cell Number': '0821234567',
          'Last Payment': 45292, // 2024-01-01
          'Ward': '12345678',
          'Voting District': '12340001'
        },
        {
          'ID Number': '9001010001088',
          'Firstname': 'Jane', // Note: Firstname instead of Name
          'Surname': 'Smith',
          'Cell Number': '0829876543',
          'Last Payment': 44927, // 2023-01-01
          'Expiry Date': 45658, // 2025-01-01 (corrected serial)
          'Ward': '12345678',
          'Voting District': '12340002'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
      XLSX.writeFile(workbook, testFilePath);
    });

    it('should read Excel file and return records with row numbers', () => {
      const records = FileReaderService.readExcelFile(testFilePath);

      expect(records).toHaveLength(2);
      expect(records[0].row_number).toBe(2); // First data row (after header)
      expect(records[1].row_number).toBe(3); // Second data row
    });

    it('should preserve all columns from Excel', () => {
      const records = FileReaderService.readExcelFile(testFilePath);

      expect(records[0]['ID Number']).toBe('8001015009087');
      expect(records[0]['Name']).toBe('John');
      expect(records[0]['Surname']).toBe('Doe');
      expect(records[0]['Cell Number']).toBe('0821234567');
      expect(records[0]['Ward']).toBe('12345678');
      expect(records[0]['Voting District']).toBe('12340001');
    });

    it('should normalize Firstname to Name', () => {
      const records = FileReaderService.readExcelFile(testFilePath);

      // Second record has "Firstname" instead of "Name"
      expect(records[1]['Firstname']).toBe('Jane');
      expect(records[1]['Name']).toBe('Jane'); // Should be normalized
    });

    it('should parse Excel serial dates', () => {
      const records = FileReaderService.readExcelFile(testFilePath);

      // First record: Last Payment = 45292 (2024-01-01)
      expect(records[0]['Last Payment']).toBeInstanceOf(Date);
      const lastPayment = records[0]['Last Payment'] as Date;
      expect(lastPayment.getFullYear()).toBe(2024);
      expect(lastPayment.getMonth()).toBe(0); // January

      // Second record: Expiry Date = 45657 (2025-01-01)
      expect(records[1]['Expiry Date']).toBeInstanceOf(Date);
      const expiryDate = records[1]['Expiry Date'] as Date;
      expect(expiryDate.getFullYear()).toBe(2025);
      expect(expiryDate.getMonth()).toBe(0); // January
    });

    it('should calculate expiry date if missing', () => {
      const records = FileReaderService.readExcelFile(testFilePath);

      // First record has no Expiry Date, should be calculated from Last Payment
      expect(records[0]['Expiry Date']).toBeInstanceOf(Date);
      expect(records[0]['_expiry_calculated']).toBe(true);

      const expiryDate = records[0]['Expiry Date'] as Date;
      // Last Payment = 2024-01-01, Expiry = 2024-01-01 + 24 months = 2026-01-01
      expect(expiryDate.getFullYear()).toBe(2026);
      expect(expiryDate.getMonth()).toBe(0); // January
    });

    it('should not override existing expiry date', () => {
      const records = FileReaderService.readExcelFile(testFilePath);

      // Second record has Expiry Date, should not be recalculated
      expect(records[1]['_expiry_calculated']).toBeUndefined();

      const expiryDate = records[1]['Expiry Date'] as Date;
      expect(expiryDate.getFullYear()).toBe(2025);
      expect(expiryDate.getMonth()).toBe(0); // January
    });

    it('should throw error if file does not exist', () => {
      expect(() => {
        FileReaderService.readExcelFile('/non/existent/file.xlsx');
      }).toThrow();
    });
  });
});

