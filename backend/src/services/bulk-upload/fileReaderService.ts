import * as XLSX from 'xlsx';
import { BulkUploadRecord } from './types';

/**
 * File Reader Service
 * 
 * Handles reading Excel files and converting them to BulkUploadRecord format.
 * Responsibilities:
 * - Read Excel files using XLSX library
 * - Convert Excel data to JSON format
 * - Add row numbers for tracking
 * - Normalize column names (handle variations like "Name" vs "Firstname")
 * - Parse dates from Excel serial numbers
 * - Calculate expiry dates if missing (Last Payment + 24 months)
 */
export class FileReaderService {
  /**
   * Read Excel file and convert to array of BulkUploadRecord
   * 
   * @param filePath - Path to Excel file
   * @returns Array of records with row numbers and normalized data
   * @throws Error if file not found or cannot be read
   */
  static readExcelFile(filePath: string): BulkUploadRecord[] {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Add row numbers and normalize data
    const records = data.map((row: any, index: number) => {
      const normalized: BulkUploadRecord = {
        row_number: index + 2, // +2 for Excel (header row + 0-based index)
        ...row,
      };

      // Normalize column names (handle both "Name" and "Firstname")
      if (normalized.Firstname && !normalized.Name) {
        normalized.Name = normalized.Firstname;
      }

      // Parse dates from Excel serial numbers
      if (normalized['Last Payment']) {
        normalized['Last Payment'] = this.parseDate(normalized['Last Payment']);
      }

      if (normalized['Date Joined']) {
        normalized['Date Joined'] = this.parseDate(normalized['Date Joined']);
      }

      if (normalized['Expiry Date']) {
        normalized['Expiry Date'] = this.parseDate(normalized['Expiry Date']);
      }

      // Calculate expiry date if missing but "Last Payment" exists
      if (!normalized['Expiry Date'] && normalized['Last Payment']) {
        const expiryDate = this.calculateExpiryDate(normalized['Last Payment']);
        if (expiryDate) {
          normalized['Expiry Date'] = expiryDate;
          normalized['_expiry_calculated'] = true; // Flag for reporting
        }
      }

      return normalized;
    });

    return records;
  }

  /**
   * Parse date from various formats (Excel serial, ISO string, Date object)
   * 
   * @param value - Date value in any format
   * @returns Date object or null if invalid
   */
  static parseDate(value: any): Date | null {
    if (!value) return null;

    // Already a Date object
    if (value instanceof Date) return value;

    // Excel serial number (numeric)
    if (typeof value === 'number') {
      return this.excelSerialToDate(value);
    }

    // ISO string or other string format
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    return null;
  }

  /**
   * Convert Excel serial date to JavaScript Date
   * Excel stores dates as number of days since 1900-01-01
   * 
   * @param serial - Excel serial number
   * @returns Date object
   */
  static excelSerialToDate(serial: number): Date {
    // Excel incorrectly treats 1900 as a leap year, so we need to adjust
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const days = Math.floor(serial);
    const milliseconds = days * 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + milliseconds);
  }

  /**
   * Calculate expiry date from payment date (add 24 months)
   * 
   * @param paymentDate - Last payment date
   * @returns Expiry date (payment date + 24 months) or null
   */
  static calculateExpiryDate(paymentDate: any): Date | null {
    const parsed = this.parseDate(paymentDate);
    if (!parsed) return null;
    return this.addMonths(parsed, 24);
  }

  /**
   * Add months to a date
   * 
   * @param date - Base date
   * @param months - Number of months to add
   * @returns New date with months added
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}

