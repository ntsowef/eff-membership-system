import ExcelJS from 'exceljs';
import {
  BulkUploadRecord,
  InvalidIdRecord,
  DuplicateRecord,
  ExistingMemberRecord,
  IECVerificationResult,
  ValidationResult,
  DatabaseOperationsBatchResult
} from './types';

/**
 * Excel Report Service
 *
 * Generates comprehensive 11-sheet Excel reports for bulk upload processing.
 * Sheets:
 * 1. Summary - Processing statistics
 * 2. All Uploaded Rows - Complete data with IEC status and existing member info
 * 3. Invalid IDs - Records with invalid ID numbers
 * 4. Duplicates - Duplicate records within the file
 * 5. Deceased Voters - Members marked as deceased by IEC or assigned VD 11111111
 * 6. Not Registered - Valid IDs but not registered voters
 * 7. New Members - Successfully inserted new members
 * 8. Existing Members - Successfully updated existing members
 * 9. Database Errors - Failed database operations with detailed error messages
 * 10. Registered in Ward - Members where file ward matches IEC ward (actual VD codes)
 * 11. Registered in Different Ward - Members where file ward differs from IEC ward (VD code 22222222)
 */
export class ExcelReportService {
  /**
   * Generate complete Excel report with all 7 sheets
   *
   * @param outputPath - Path to save the Excel file
   * @param originalData - Original uploaded data
   * @param validationResult - Pre-validation results
   * @param iecResults - IEC verification results
   * @param dbResult - Database operation results
   * @returns Path to generated report
   */
  static async generateReport(
    outputPath: string,
    originalData: BulkUploadRecord[],
    validationResult: ValidationResult,
    iecResults: Map<string, IECVerificationResult>,
    dbResult: DatabaseOperationsBatchResult
  ): Promise<string> {
    console.log(`\n📊 EXCEL REPORT: Generating report...`);

	    const workbook = new ExcelJS.Workbook();

	    // Pre-compute IEC / ward status groups for summary and sheets
	    const registeredInWard = this.getRegisteredInWard(
	      validationResult.valid_records,
	      iecResults,
	      dbResult.successful_operations
	    );
	    const registeredDifferentWard = this.getRegisteredInDifferentWard(
	      validationResult.valid_records,
	      iecResults,
	      dbResult.successful_operations
	    );
	    const notRegistered = this.getNotRegisteredVoters(
	      validationResult.valid_records,
	      iecResults
	    );
	    const deceased = this.getDeceasedVoters(
	      validationResult.valid_records,
	      iecResults,
	      dbResult.successful_operations
	    );

	    console.log(
	      `   📊 Ward/IEC Stats: ${registeredInWard.length} in same ward, ${registeredDifferentWard.length} in different ward, ${notRegistered.length} not registered, ${deceased.length} deceased`
	    );

	    // Sheet 1: Summary (now includes IEC ward verification & deceased stats)
	    this.createSummarySheet(
	      workbook,
	      validationResult,
	      dbResult,
	      iecResults,
	      registeredInWard.length,
	      registeredDifferentWard.length,
	      notRegistered.length,
	      deceased.length
	    );

	    // Sheet 2: All Uploaded Rows (with IEC status and existing member info)
	    this.createAllUploadedRowsSheet(workbook, originalData, validationResult, iecResults);

	    // Sheet 3: Invalid IDs
	    this.createInvalidIdsSheet(workbook, validationResult.invalid_ids);

	    // Sheet 4: Duplicates
	    this.createDuplicatesSheet(workbook, validationResult.duplicates);

	    // Sheet 5: Deceased Voters
	    this.createDeceasedVotersSheet(workbook, deceased, iecResults);

	    // Sheet 6: Not Registered Voters
	    this.createNotRegisteredSheet(workbook, notRegistered);

	    // Sheet 7: New Members
	    this.createNewMembersSheet(workbook, validationResult.new_members);

	    // Sheet 8: Existing Members (Updated)
	    this.createExistingMembersSheet(workbook, validationResult.existing_members);

	    // Sheet 9: Database Errors
	    this.createDatabaseErrorsSheet(workbook, dbResult.failed_operations, originalData);

	    // Sheet 10: Registered in Ward (file ward matches IEC ward)
	    this.createRegisteredInWardSheet(workbook, registeredInWard, iecResults);

	    // Sheet 11: Registered in Different Ward (file ward differs from IEC ward)
	    this.createRegisteredDifferentWardSheet(workbook, registeredDifferentWard, iecResults);

    // Save workbook
    await workbook.xlsx.writeFile(outputPath);
    console.log(`   ✅ Report saved to: ${outputPath}`);

    return outputPath;
  }

	  /**
	   * Create Summary sheet with validation, processing, and IEC verification statistics
	   */
	  private static createSummarySheet(
	    workbook: ExcelJS.Workbook,
	    validationResult: ValidationResult,
	    dbResult: DatabaseOperationsBatchResult,
	    iecResults?: Map<string, IECVerificationResult>,
	    registeredInWardCount?: number,
	    registeredDifferentWardCount?: number,
	    notRegisteredCount?: number,
	    deceasedCount?: number
	  ): void {
    const sheet = workbook.addWorksheet('Summary');

    // Title
    sheet.mergeCells('A1:B1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Bulk Upload Processing Summary';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Timestamp
    sheet.mergeCells('A2:B2');
    const timestampCell = sheet.getCell('A2');
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.alignment = { horizontal: 'center' };

    // Validation Statistics
    sheet.getCell('A4').value = 'VALIDATION STATISTICS';
    sheet.getCell('A4').font = { bold: true, size: 12 };

    const validationStats = [
      ['Total Records Uploaded', validationResult.validation_stats.total_records],
      ['Valid ID Numbers', validationResult.validation_stats.valid_ids],
      ['Invalid ID Numbers', validationResult.validation_stats.invalid_ids],
      ['Unique Records', validationResult.validation_stats.unique_records],
      ['Duplicate Records', validationResult.validation_stats.duplicates],
      ['Existing Members', validationResult.validation_stats.existing_members],
      ['New Members', validationResult.validation_stats.new_members],
    ];

    let row = 5;
    validationStats.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Processing Statistics
    sheet.getCell(`A${row + 1}`).value = 'PROCESSING STATISTICS';
    sheet.getCell(`A${row + 1}`).font = { bold: true, size: 12 };

    const processingStats = [
      ['Total Processed', dbResult.operation_stats.total_records],
      ['Successful Inserts', dbResult.operation_stats.inserts],
      ['Successful Updates', dbResult.operation_stats.updates],
      ['Skipped Records', dbResult.operation_stats.skipped],
      ['Failed Operations', dbResult.operation_stats.failures],
    ];

    row += 2;
    processingStats.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

	    // IEC Verification Statistics (Ward Comparison + Not Registered + Deceased)
	    if (
	      iecResults &&
	      registeredInWardCount !== undefined &&
	      registeredDifferentWardCount !== undefined &&
	      notRegisteredCount !== undefined &&
	      deceasedCount !== undefined
	    ) {
	      sheet.getCell(`A${row + 1}`).value = 'IEC WARD VERIFICATION';
	      sheet.getCell(`A${row + 1}`).font = { bold: true, size: 12 };
	
	      const iecStats = [
	        ['Registered in Same Ward', registeredInWardCount],
	        ['Registered in Different Ward', registeredDifferentWardCount],
	        ['Not Registered Voters', notRegisteredCount],
	        ['Deceased Voters', deceasedCount],
	      ];
	
	      row += 2;
	      iecStats.forEach(([label, value]) => {
	        sheet.getCell(`A${row}`).value = label;
	        sheet.getCell(`B${row}`).value = value;
	        row++;
	      });
	    }

    // Column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 20;

    // Styling - add borders to data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });
  }

  /**
   * Create All Uploaded Rows sheet with IEC status and existing member info
   */
  private static createAllUploadedRowsSheet(
    workbook: ExcelJS.Workbook,
    originalData: BulkUploadRecord[],
    validationResult: ValidationResult,
    iecResults: Map<string, IECVerificationResult>
  ): void {
    const sheet = workbook.addWorksheet('All Uploaded Rows');

    if (originalData.length === 0) {
      sheet.getCell('A1').value = 'No data uploaded';
      return;
    }

    // Create existing members lookup
    const existingMembersMap = new Map<string, ExistingMemberRecord>();
    validationResult.existing_members.forEach(em => {
      existingMembersMap.set(em['ID Number'], em);
    });

    // Get headers from first row and add status columns
    const originalHeaders = Object.keys(originalData[0]).filter(h =>
      !h.startsWith('_') && h !== 'row_number' && h !== '__EMPTY'
    );

    const statusHeaders = [
      'IEC Registered',
      'IEC Ward',
      'IEC VD Code',
      'Already Exists',
      'Existing Member Name',
      'Existing Ward',
      'Existing VD'
    ];

    const allHeaders = [...originalHeaders, ...statusHeaders];
    sheet.addRow(allHeaders);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add data rows with status information
    originalData.forEach((record) => {
      const idNumber = record['ID Number'];
      const iecDetails = iecResults.get(idNumber);
      const existingMember = existingMembersMap.get(idNumber);

      const values = [
        ...originalHeaders.map((h) => record[h]),
        iecDetails?.is_registered ? 'YES' : 'NO',
        iecDetails?.ward_code || 'N/A',
        iecDetails?.voting_district_code || 'N/A',
        existingMember ? 'YES' : 'NO',
        existingMember ? `${existingMember.existing_name || ''}`.trim() : 'N/A',
        existingMember?.existing_ward || 'N/A',
        existingMember?.existing_vd || 'N/A'
      ];

      const row = sheet.addRow(values);

      // Color code based on status
      if (!iecDetails?.is_registered) {
        // Not registered - light red
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
      } else if (existingMember) {
        // Existing member - light yellow
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' },
        };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < originalHeaders.length) {
        column.width = 15;
      } else {
        column.width = 20; // Wider for status columns
      }
    });
  }

  /**
   * Create Invalid IDs sheet
   */
  private static createInvalidIdsSheet(
    workbook: ExcelJS.Workbook,
    invalidIds: InvalidIdRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Invalid IDs');

    if (invalidIds.length === 0) {
      sheet.getCell('A1').value = 'No invalid ID numbers found';
      return;
    }

    // Get all column headers from first invalid record (excluding internal fields)
    const firstRecord = invalidIds[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'error_message' && h !== 'validation_type' && h !== '__EMPTY'
    );

    // Put error and row number first, then all other columns
    const headers = ['Row Number', 'Error', 'ID Number', ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number')];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' },
    };

    // Add data rows with all original data
    invalidIds.forEach((record) => {
      const values = [
        record.row_number,
        record.error_message,
        record['ID Number'],
        ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number').map(h => record[h])
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < 3) {
        column.width = 15; // Row Number, Error, ID Number
      } else {
        column.width = 20; // Other columns
      }
    });
  }

  /**
   * Create Duplicates sheet
   */
  private static createDuplicatesSheet(
    workbook: ExcelJS.Workbook,
    duplicates: DuplicateRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Duplicates');

    if (duplicates.length === 0) {
      sheet.getCell('A1').value = 'No duplicate records found';
      return;
    }

    // Get all column headers from first duplicate record (excluding internal fields)
    const firstRecord = duplicates[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'duplicate_count' && h !== 'first_occurrence_row' && h !== 'all_row_numbers' && h !== '__EMPTY'
    );

    // Put duplicate info first, then all other columns
    const headers = ['Row Number', 'ID Number', 'Duplicate Count', 'All Row Numbers', ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number')];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFA500' },
    };

    // Add data rows with all original data
    duplicates.forEach((record) => {
      const values = [
        record.row_number,
        record['ID Number'],
        record.duplicate_count,
        record.all_row_numbers.join(', '),
        ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number').map(h => record[h])
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < 4) {
        column.width = 15; // Row Number, ID Number, Duplicate Count, All Row Numbers
      } else {
        column.width = 20; // Other columns
      }
    });
  }

  /**
   * Create Not Registered sheet
   */
  private static createNotRegisteredSheet(
    workbook: ExcelJS.Workbook,
    notRegistered: BulkUploadRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Not Registered');

    if (notRegistered.length === 0) {
      sheet.getCell('A1').value = 'All members are registered voters';
      return;
    }

    // Get all column headers from first record (excluding internal fields)
    const firstRecord = notRegistered[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'row_number' && h !== '__EMPTY'
    );

    const headers = ['Row Number', ...allColumns];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' },
    };

    // Add data rows
    notRegistered.forEach((record) => {
      const values = [record.row_number, ...allColumns.map(h => record[h])];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.width = 15;
    });
  }

  /**
   * Create New Members sheet
   */
  private static createNewMembersSheet(
    workbook: ExcelJS.Workbook,
    newMembers: BulkUploadRecord[]
  ): void {
    const sheet = workbook.addWorksheet('New Members');

    if (newMembers.length === 0) {
      sheet.getCell('A1').value = 'No new members added';
      return;
    }

    // Get all column headers from first record (excluding internal fields)
    const firstRecord = newMembers[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'row_number' && h !== '__EMPTY'
    );

    const headers = ['Row Number', ...allColumns];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF92D050' },
    };

    // Add data rows
    newMembers.forEach((record) => {
      const values = [record.row_number, ...allColumns.map(h => record[h])];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.width = 15;
    });
  }

  /**
   * Create Existing Members sheet
   */
  private static createExistingMembersSheet(
    workbook: ExcelJS.Workbook,
    existingMembers: ExistingMemberRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Existing Members (Updated)');

    if (existingMembers.length === 0) {
      sheet.getCell('A1').value = 'No existing members updated';
      return;
    }

    // Get all column headers from first record (excluding internal fields)
    const firstRecord = existingMembers[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'row_number' && h !== 'existing_member_id' &&
      h !== 'existing_name' && h !== 'existing_ward' && h !== 'existing_vd' &&
      h !== 'existing_created_at' && h !== 'existing_updated_at' &&
      h !== 'ward_changed' && h !== 'vd_changed' && h !== '__EMPTY'
    );

    const headers = [
      'Row Number',
      'ID Number',
      'Existing Member Name',
      'Existing Ward',
      'Existing VD',
      'Ward Changed',
      'VD Changed',
      ...allColumns.filter(h => h !== 'ID Number')
    ];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' },
    };

    // Add data rows
    existingMembers.forEach((record) => {
      const values = [
        record.row_number,
        record['ID Number'],
        record.existing_name || 'N/A',
        record.existing_ward || 'N/A',
        record.existing_vd || 'N/A',
        record.ward_changed ? 'YES' : 'NO',
        record.vd_changed ? 'YES' : 'NO',
        ...allColumns.filter(h => h !== 'ID Number').map(h => record[h])
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < 7) {
        column.width = 20; // Status columns
      } else {
        column.width = 15; // Data columns
      }
    });
  }

  /**
   * Create Database Errors sheet
   * Shows all failed database operations with detailed error messages
   */
  private static createDatabaseErrorsSheet(
    workbook: ExcelJS.Workbook,
    failedOperations: any[],
    originalData: BulkUploadRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Database Errors');

    if (failedOperations.length === 0) {
      // No errors - add a message
      sheet.addRow(['No database errors occurred']);
      sheet.getCell('A1').font = { bold: true, color: { argb: 'FF00AA00' } };
      return;
    }

    // Create a map of ID numbers to original records for easy lookup
    const recordMap = new Map<string, BulkUploadRecord>();
    originalData.forEach(record => {
      recordMap.set(record['ID Number'], record);
    });

    // Get all column names from original data
    const allColumns = originalData.length > 0 ? Object.keys(originalData[0]).filter(k => k !== 'row_number') : [];

    // Headers: Operation, Error, ID Number, then all other columns
    const headers = ['Operation', 'Error Message', 'ID Number', ...allColumns.filter(h => h !== 'ID Number')];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC143C' }, // Crimson red for database errors
    };

    // Add data rows
    failedOperations.forEach((operation) => {
      const originalRecord = recordMap.get(operation.id_number);
      const values = [
        operation.operation.toUpperCase(), // INSERT, UPDATE, SKIP
        operation.error || 'Unknown error',
        operation.id_number,
        ...allColumns.filter(h => h !== 'ID Number').map(h => originalRecord?.[h] || 'N/A')
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx === 0) {
        column.width = 12; // Operation column
      } else if (idx === 1) {
        column.width = 60; // Error message column (wider for detailed errors)
      } else if (idx === 2) {
        column.width = 15; // ID Number column
      } else {
        column.width = 15; // Data columns
      }
    });

    // Wrap text for error message column
    sheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  }

  /**
   * Get not registered voters from valid records
   */
  private static getNotRegisteredVoters(
    validRecords: BulkUploadRecord[],
    iecResults: Map<string, IECVerificationResult>
  ): BulkUploadRecord[] {
    return validRecords.filter(record => {
      const iecResult = iecResults.get(record['ID Number']);
      return iecResult && !iecResult.is_registered;
    });
  }

	  /**
	   * Get deceased voters from valid records
	   * Criteria:
	   *  - IEC voter_status explicitly indicates 'DECEASED', OR
	   *  - Special VD code 11111111 was assigned (via IEC voter_status mapping)
	   *
	   * We infer 11111111 assignment from IEC voter_status (LookupService maps DECEASED
	   * to VD 11111111), and we also require that the record was successfully processed
	   * in the database batch.
	   */
	  private static getDeceasedVoters(
	    validRecords: BulkUploadRecord[],
	    iecResults: Map<string, IECVerificationResult>,
	    successfulOperations: any[]
	  ): BulkUploadRecord[] {
	    const successfulIds = new Set(successfulOperations.map(op => op.id_number));

	    return validRecords.filter(record => {
	      const idNumber = record['ID Number'];
	      const iecResult = iecResults.get(idNumber);
	      if (!iecResult || !successfulIds.has(idNumber)) {
	        return false;
	      }

	      const status = iecResult.voter_status?.toUpperCase() || '';
	      return status.includes('DECEASED');
	    });
	  }

	  /**
	   * Create Deceased Voters sheet
	   *
	   * Criteria:
	   *  - IEC voter_status === 'DECEASED' (or contains 'DECEASED')
	   *  - Or, by business rule, member would be assigned VD code 11111111
	   */
	  private static createDeceasedVotersSheet(
	    workbook: ExcelJS.Workbook,
	    deceasedRecords: BulkUploadRecord[],
	    iecResults: Map<string, IECVerificationResult>
	  ): void {
	    const sheet = workbook.addWorksheet('Deceased Voters');

	    if (deceasedRecords.length === 0) {
	      sheet.getCell('A1').value = 'No deceased voters detected from IEC verification';
	      return;
	    }

	    const headers = [
	      'Row Number',
	      'ID Number',
	      'Full Name',
	      'File Ward Code',
	      'IEC Ward Code',
	      'Voting District Code',
	      'Province Code',
	      'Province Name',
	      'Municipality Code',
	      'Municipality Name',
	      'District Code',
	      'District Name',
	      'IEC Registered',
	      'Voter Status',
	      'Date Joined',
	      'Membership Status',
	      'Note'
	    ];
	    sheet.addRow(headers);

	    // Style header row with dark gray/black to indicate deceased status
	    const headerRow = sheet.getRow(1);
	    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	    headerRow.fill = {
	      type: 'pattern',
	      pattern: 'solid',
	      fgColor: { argb: 'FF000000' }, // Black header for deceased
	    };

	    deceasedRecords.forEach((record) => {
	      const iecResult = iecResults.get(record['ID Number']);
	      const fileWardCode = record.Ward ? String(record.Ward).trim() : '';
	      const iecWardCode = iecResult?.ward_code ? String(iecResult.ward_code).trim() : '';
	      const fullName = `${record.Firstname || record['First Name'] || ''} ${record.Surname || record['Last Name'] || ''}`.trim();
	      const status = iecResult?.voter_status || 'DECEASED';

	      const values = [
	        record.row_number,
	        record['ID Number'],
	        fullName,
	        fileWardCode,
	        iecWardCode,
	        '11111111', // Special VD code for deceased
	        iecResult?.province_code || record['Province Code'] || 'N/A',
	        record.Province || 'N/A',
	        iecResult?.municipality_code || record['Municipality Code'] || 'N/A',
	        record.Municipality || 'N/A',
	        iecResult?.district_code || record['District Code'] || 'N/A',
	        record.District || 'N/A',
	        iecResult?.is_registered ? 'YES' : 'NO',
	        status,
	        record['Date Joined'] || 'N/A',
	        record['Membership Status'] || record.Status || 'N/A',
	        'Member marked as DECEASED by IEC verification (VD 11111111)'
	      ];
	      sheet.addRow(values);
	    });

	    // Auto-fit columns
	    sheet.columns.forEach((column, idx) => {
	      if (idx === 2) {
	        column.width = 25; // Full Name
	      } else if (idx === 16) {
	        column.width = 40; // Note
	      } else {
	        column.width = 18;
	      }
	    });
	  }

  /**
   * Get members registered in the same ward (file ward matches IEC ward)
   * These members have actual VD codes from IEC
   */
  private static getRegisteredInWard(
    validRecords: BulkUploadRecord[],
    iecResults: Map<string, IECVerificationResult>,
    successfulOperations: any[]
  ): BulkUploadRecord[] {
    // Create a set of successfully processed ID numbers
    const successfulIds = new Set(successfulOperations.map(op => op.id_number));

    return validRecords.filter(record => {
      const idNumber = record['ID Number'];
      const iecResult = iecResults.get(idNumber);

      // Must be registered and successfully processed
      if (!iecResult || !iecResult.is_registered || !successfulIds.has(idNumber)) {
        return false;
      }

      // Get ward codes and compare
      const fileWardCode = record.Ward ? String(record.Ward).trim() : null;
      const iecWardCode = iecResult.ward_code ? String(iecResult.ward_code).trim() : null;

      // Both ward codes must exist and be equal
      return fileWardCode && iecWardCode && fileWardCode === iecWardCode;
    });
  }

  /**
   * Get members registered in a different ward (file ward differs from IEC ward)
   * These members have VD code 22222222
   */
  private static getRegisteredInDifferentWard(
    validRecords: BulkUploadRecord[],
    iecResults: Map<string, IECVerificationResult>,
    successfulOperations: any[]
  ): BulkUploadRecord[] {
    // Create a set of successfully processed ID numbers
    const successfulIds = new Set(successfulOperations.map(op => op.id_number));

    return validRecords.filter(record => {
      const idNumber = record['ID Number'];
      const iecResult = iecResults.get(idNumber);

      // Must be registered and successfully processed
      if (!iecResult || !iecResult.is_registered || !successfulIds.has(idNumber)) {
        return false;
      }

      // Get ward codes and compare
      const fileWardCode = record.Ward ? String(record.Ward).trim() : null;
      const iecWardCode = iecResult.ward_code ? String(iecResult.ward_code).trim() : null;

      // Both ward codes must exist and be different
      return fileWardCode && iecWardCode && fileWardCode !== iecWardCode;
    });
  }

  /**
   * Create "Registered in Ward" sheet
   * Shows members where file ward matches IEC ward (using actual VD codes)
   */
  private static createRegisteredInWardSheet(
    workbook: ExcelJS.Workbook,
    records: BulkUploadRecord[],
    iecResults: Map<string, IECVerificationResult>
  ): void {
    const sheet = workbook.addWorksheet('Registered in Ward');

    if (records.length === 0) {
      sheet.getCell('A1').value = 'No members registered in their uploaded ward';
      return;
    }

    // Headers for this sheet
    const headers = [
      'Row Number',
      'ID Number',
      'Full Name',
      'File Ward Code',
      'IEC Ward Code',
      'Ward Match',
      'Voting District Code',
      'IEC VD Code (Raw)',
      'Province Code',
      'Province Name',
      'Municipality Code',
      'Municipality Name',
      'District Code',
      'District Name',
      'IEC Registered',
      'Voter Status',
      'Date Joined',
      'Membership Status'
    ];
    sheet.addRow(headers);

    // Style header row with green (success color)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF28A745' }, // Bootstrap success green
    };

    // Add data rows
    records.forEach((record) => {
      const iecResult = iecResults.get(record['ID Number']);
      const fileWardCode = record.Ward ? String(record.Ward).trim() : '';
      const iecWardCode = iecResult?.ward_code ? String(iecResult.ward_code).trim() : '';
      const fullName = `${record.Firstname || record['First Name'] || ''} ${record.Surname || record['Last Name'] || ''}`.trim();

      const values = [
        record.row_number,
        record['ID Number'],
        fullName,
        fileWardCode,
        iecWardCode,
        '✓ MATCH',
        iecResult?.voting_district_code || 'N/A',
        iecResult?.voting_district_code || 'N/A',
        iecResult?.province_code || record['Province Code'] || 'N/A',
        record.Province || 'N/A',
        iecResult?.municipality_code || record['Municipality Code'] || 'N/A',
        record.Municipality || 'N/A',
        iecResult?.district_code || record['District Code'] || 'N/A',
        record.District || 'N/A',
        iecResult?.is_registered ? 'YES' : 'NO',
        iecResult?.voter_status || 'N/A',
        record['Date Joined'] || 'N/A',
        record['Membership Status'] || record.Status || 'N/A'
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      column.width = idx === 2 ? 25 : 18; // Wider for Full Name column
    });
  }

  /**
   * Create "Registered in Different Ward" sheet
   * Shows members where file ward differs from IEC ward (VD code 22222222)
   */
  private static createRegisteredDifferentWardSheet(
    workbook: ExcelJS.Workbook,
    records: BulkUploadRecord[],
    iecResults: Map<string, IECVerificationResult>
  ): void {
    const sheet = workbook.addWorksheet('Different Ward');

    if (records.length === 0) {
      sheet.getCell('A1').value = 'No members registered in different ward from upload file';
      return;
    }

    // Headers for this sheet - includes ward mismatch info
    const headers = [
      'Row Number',
      'ID Number',
      'Full Name',
      'File Ward Code',
      'IEC Ward Code',
      'Ward Mismatch',
      'Assigned VD Code',
      'IEC VD Code (Actual)',
      'Province Code',
      'Province Name',
      'Municipality Code',
      'Municipality Name',
      'District Code',
      'District Name',
      'IEC Registered',
      'Voter Status',
      'Date Joined',
      'Membership Status',
      'Note'
    ];
    sheet.addRow(headers);

    // Style header row with orange (warning color)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFD7E14' }, // Bootstrap warning orange
    };

    // Add data rows
    records.forEach((record) => {
      const iecResult = iecResults.get(record['ID Number']);
      const fileWardCode = record.Ward ? String(record.Ward).trim() : '';
      const iecWardCode = iecResult?.ward_code ? String(iecResult.ward_code).trim() : '';
      const fullName = `${record.Firstname || record['First Name'] || ''} ${record.Surname || record['Last Name'] || ''}`.trim();

      // Ward mismatch description
      const wardMismatch = `File: ${fileWardCode} ≠ IEC: ${iecWardCode}`;

      const values = [
        record.row_number,
        record['ID Number'],
        fullName,
        fileWardCode,
        iecWardCode,
        wardMismatch,
        '22222222', // Special VD code for different ward
        iecResult?.voting_district_code || 'N/A', // Actual IEC VD code
        iecResult?.province_code || record['Province Code'] || 'N/A',
        record.Province || 'N/A',
        iecResult?.municipality_code || record['Municipality Code'] || 'N/A',
        record.Municipality || 'N/A',
        iecResult?.district_code || record['District Code'] || 'N/A',
        record.District || 'N/A',
        iecResult?.is_registered ? 'YES' : 'NO',
        iecResult?.voter_status || 'N/A',
        record['Date Joined'] || 'N/A',
        record['Membership Status'] || record.Status || 'N/A',
        'Member is registered in a different ward than the upload file'
      ];
      const row = sheet.addRow(values);

      // Highlight the ward mismatch column with light red background
      row.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' }, // Light red
      };
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx === 2) {
        column.width = 25; // Wider for Full Name
      } else if (idx === 5 || idx === 18) {
        column.width = 30; // Wider for Ward Mismatch and Note
      } else {
        column.width = 18;
      }
    });
  }
}
