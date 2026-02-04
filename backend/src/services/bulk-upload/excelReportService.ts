import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import {
  BulkUploadRecord,
  InvalidIdRecord,
  DuplicateRecord,
  ExistingMemberRecord,
  IECVerificationResult,
  ValidationResult,
  DatabaseOperationsBatchResult,
  RenewalRecord,
  RenewalValidationError,
  SubscriptionTypeError,
  DatabaseOperationResult,
  MemberStatusUpdateBatchResult
} from './types';
import { getPrisma } from '../prismaService';
import { HtmlPdfService } from '../htmlPdfService';
import { ViewsService } from '../viewsService';
import { executeQuerySingle } from '../../config/database';
import { EmailService } from '../emailService';

const prisma = getPrisma();

/**
 * Ward compliance data for summary sheet
 */
interface WardComplianceData {
  ward_code: string;
  existing_members: number;
  new_members: number;
  total_registered: number;
  is_compliant: boolean;
}

/**
 * Generated attendance register info
 */
interface GeneratedAttendanceRegister {
  ward_code: string;
  file_path: string;
  member_count: number;
}

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
   * @param userEmail - Optional: User email for sending attendance register PDFs
   * @param userName - Optional: User name for email personalization
   * @param generateAttendanceRegisters - Optional: Whether to generate attendance register PDFs (default: true)
   * @returns Object with report path and attendance register paths
   */
  static async generateReport(
    outputPath: string,
    originalData: BulkUploadRecord[],
    validationResult: ValidationResult,
    iecResults: Map<string, IECVerificationResult>,
    dbResult: DatabaseOperationsBatchResult,
    userEmail?: string,
    userName?: string,
    generateAttendanceRegisters: boolean = true,
    statusUpdates?: MemberStatusUpdateBatchResult
  ): Promise<{ reportPath: string; attendanceRegisterPaths: string[] }> {
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

    // Calculate ward compliance data
    const wardComplianceData = await this.calculateWardCompliance(
      originalData,
      dbResult.successful_operations,
      iecResults
    );

    // Sheet 1: Summary (now includes IEC ward verification & deceased stats + ward compliance)
    await this.createSummarySheet(
      workbook,
      validationResult,
      dbResult,
      iecResults,
      registeredInWard.length,
      registeredDifferentWard.length,
      notRegistered.length,
      deceased.length,
      wardComplianceData,
      statusUpdates
    );

    // Sheet 2: All Uploaded Rows (with IEC status and existing member info)
    this.createAllUploadedRowsSheet(workbook, originalData, validationResult, iecResults, dbResult);

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

    // Sheet 12: Successful Renewals
    const successfulRenewals = dbResult.successful_operations.filter(op => op.operation === 'renewal');
    this.createSuccessfulRenewalsSheet(workbook, successfulRenewals);

    // Sheet 13: Renewal Validation Errors
    this.createRenewalValidationErrorsSheet(workbook, validationResult.renewal_validation_errors);

    // Sheet 14: Subscription Type Errors
    this.createSubscriptionTypeErrorsSheet(workbook, validationResult.subscription_type_errors);

    // Sheet 15: Status Updates (expiry dates calculated, status changes)
    if (statusUpdates && statusUpdates.updates.length > 0) {
      this.createStatusUpdatesSheet(workbook, statusUpdates);
    }

    // Save workbook
    await workbook.xlsx.writeFile(outputPath);
    console.log(`   ✅ Report saved to: ${outputPath}`);

    // Generate attendance registers for compliant wards (200+ registered voters)
    // Only generate if generateAttendanceRegisters flag is true
    const compliantWards = wardComplianceData.filter(w => w.is_compliant);
    const attendanceRegisterPaths: string[] = [];

    if (generateAttendanceRegisters && compliantWards.length > 0) {
      const reportDir = path.dirname(outputPath);
      const generatedRegisters = await this.generateAttendanceRegistersForCompliantWards(
        compliantWards,
        reportDir,
        userEmail,
        userName
      );

      if (generatedRegisters.length > 0) {
        console.log(`\n📋 ATTENDANCE REGISTERS: Generated ${generatedRegisters.length} attendance register(s):`);
        generatedRegisters.forEach(reg => {
          console.log(`   📄 Ward ${reg.ward_code}: ${reg.file_path} (${reg.member_count} members)`);
          attendanceRegisterPaths.push(reg.file_path);
        });
      }
    } else if (!generateAttendanceRegisters && compliantWards.length > 0) {
      console.log(`\n📋 ATTENDANCE REGISTERS: Skipped (generateAttendanceRegisters=false). ${compliantWards.length} compliant ward(s) found.`);
    }

    return { reportPath: outputPath, attendanceRegisterPaths };
  }

  /**
   * Create Summary sheet with validation, processing, IEC verification, and ward compliance statistics
   */
  private static async createSummarySheet(
    workbook: ExcelJS.Workbook,
    validationResult: ValidationResult,
    dbResult: DatabaseOperationsBatchResult,
    iecResults?: Map<string, IECVerificationResult>,
    registeredInWardCount?: number,
    registeredDifferentWardCount?: number,
    notRegisteredCount?: number,
    deceasedCount?: number,
    wardComplianceData?: WardComplianceData[],
    statusUpdates?: MemberStatusUpdateBatchResult
  ): Promise<void> {
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

    // Renewal Statistics Section
    const hasRenewals = validationResult.validation_stats.renewals > 0 ||
      validationResult.validation_stats.renewal_validation_errors > 0 ||
      validationResult.validation_stats.subscription_type_errors > 0;

    if (hasRenewals) {
      sheet.getCell(`A${row + 1}`).value = 'RENEWAL STATISTICS';
      sheet.getCell(`A${row + 1}`).font = { bold: true, size: 12 };

      const renewalStats = [
        ['Total Renewals Processed', validationResult.validation_stats.renewals],
        ['Early Renewals (Active Members)', validationResult.validation_stats.early_renewals],
        ['Expired Member Renewals', validationResult.validation_stats.expired_member_renewals],
        ['Successful Renewals', dbResult.operation_stats.renewals],
        ['Renewal Validation Errors', validationResult.validation_stats.renewal_validation_errors],
        ['Subscription Type Errors', validationResult.validation_stats.subscription_type_errors],
      ];

      row += 2;
      renewalStats.forEach(([label, value]) => {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = value;
        // Color code renewal stats
        if (label === 'Successful Renewals' && (value as number) > 0) {
          sheet.getCell(`B${row}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' } // Light green
          };
        } else if ((label === 'Renewal Validation Errors' || label === 'Subscription Type Errors') && (value as number) > 0) {
          sheet.getCell(`B${row}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' } // Light red
          };
        }
        row++;
      });
    }

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
        ['Not Verified (Rate Limit/Error)', (validationResult.valid_records.length - (registeredInWardCount + registeredDifferentWardCount + notRegisteredCount + deceasedCount))]
      ];

      row += 2;
      iecStats.forEach(([label, value]) => {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = value;
        row++;
      });
    }

    // Status Update Statistics Section
    if (statusUpdates && statusUpdates.stats.total_processed > 0) {
      sheet.getCell(`A${row + 1}`).value = 'STATUS UPDATE STATISTICS';
      sheet.getCell(`A${row + 1}`).font = { bold: true, size: 12 };

      const statusStats = [
        ['Total Members Processed', statusUpdates.stats.total_processed],
        ['Expiry Dates Calculated', statusUpdates.stats.expiry_dates_calculated],
        ['Statuses Changed', statusUpdates.stats.statuses_changed],
        ['Protected Status Skipped', statusUpdates.stats.protected_skipped],
        ['No Payment Date Skipped', statusUpdates.stats.no_payment_date_skipped],
        ['Already Correct Skipped', statusUpdates.stats.already_correct_skipped],
        ['Status Update Errors', statusUpdates.stats.errors],
      ];

      row += 2;
      statusStats.forEach(([label, value]) => {
        sheet.getCell(`A${row}`).value = label;
        sheet.getCell(`B${row}`).value = value;
        // Color code status stats
        if ((label === 'Expiry Dates Calculated' || label === 'Statuses Changed') && (value as number) > 0) {
          sheet.getCell(`B${row}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' } // Light green
          };
        } else if (label === 'Status Update Errors' && (value as number) > 0) {
          sheet.getCell(`B${row}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' } // Light red
          };
        }
        row++;
      });
    }

    // Ward Compliance Summary Section
    if (wardComplianceData && wardComplianceData.length > 0) {
      row += 2;
      sheet.getCell(`A${row}`).value = 'WARD COMPLIANCE SUMMARY (200+ Registered Voters Target)';
      sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
      sheet.mergeCells(`A${row}:E${row}`);
      row++;

      // Add note about registered voters only
      sheet.getCell(`A${row}`).value = 'Note: Only ACTIVE members registered to vote (voter_registration_id = 1) are counted.';
      sheet.getCell(`A${row}`).font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      sheet.mergeCells(`A${row}:E${row}`);
      row += 2;

      // Ward compliance table headers
      const complianceHeaders = ['Ward Code', 'Existing Members', 'New Members', 'Total Registered', 'Compliance Status'];
      complianceHeaders.forEach((header, idx) => {
        const col = String.fromCharCode(65 + idx); // A, B, C, D, E
        sheet.getCell(`${col}${row}`).value = header;
        sheet.getCell(`${col}${row}`).font = { bold: true };
        sheet.getCell(`${col}${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        sheet.getCell(`${col}${row}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });
      row++;

      // Ward compliance data rows
      wardComplianceData.forEach((ward) => {
        sheet.getCell(`A${row}`).value = ward.ward_code;
        sheet.getCell(`B${row}`).value = ward.existing_members;
        sheet.getCell(`C${row}`).value = ward.new_members;
        sheet.getCell(`D${row}`).value = ward.total_registered;

        // Compliance status with color coding
        const statusCell = sheet.getCell(`E${row}`);
        if (ward.is_compliant) {
          statusCell.value = '✅ Ward has achieved the 200+ member target and is ready for BPA/BGA';
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' } // Light green
          };
          statusCell.font = { color: { argb: 'FF006100' } }; // Dark green text
        } else {
          statusCell.value = `❌ Needs ${200 - ward.total_registered} more registered voters`;
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' } // Light red
          };
          statusCell.font = { color: { argb: 'FF9C0006' } }; // Dark red text
        }
        row++;
      });

      // Summary row
      row++;
      const compliantWards = wardComplianceData.filter(w => w.is_compliant).length;
      const totalWards = wardComplianceData.length;
      sheet.getCell(`A${row}`).value = 'Summary:';
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = `${compliantWards} of ${totalWards} wards have achieved 200+ registered voters`;
      sheet.mergeCells(`B${row}:E${row}`);
    }

    // Column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 55;

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
   * Calculate ward compliance data for the summary sheet
   * Counts existing members in database + new members from upload
   * Only counts members who are registered to vote (excludes voter_registration_status_id = 2)
   */
  private static async calculateWardCompliance(
    originalData: BulkUploadRecord[],
    successfulOperations: any[],
    iecResults: Map<string, IECVerificationResult>
  ): Promise<WardComplianceData[]> {
    console.log(`\n📊 WARD COMPLIANCE: Calculating ward compliance data...`);

    // Get unique ward codes from the upload file
    const wardCodes = new Set<string>();
    originalData.forEach(record => {
      // Ward field can be 'Ward', 'Ward Code', or 'ward_code' depending on the upload file format
      const wardCode = record.Ward || record['Ward Code'] || record['ward_code'];
      if (wardCode) {
        wardCodes.add(String(wardCode).trim());
      }
    });

    console.log(`   📋 Found ${wardCodes.size} unique wards in upload file`);

    const complianceData: WardComplianceData[] = [];

    for (const wardCode of wardCodes) {
      try {
        // Query existing members in database for this ward (excluding not registered voters)
        // voter_registration_id = 2 means "Not Registered to Vote"
        const existingCount = await prisma.members_consolidated.count({
          where: {
            ward_code: wardCode,
            voter_registration_id: 1, // ONLY count "Registered" members
            membership_status_id: 1 // ONLY count "Active" members
          }
        });

        // Count new members from this upload for this ward (only registered voters)
        // A member is registered if their IEC result shows is_registered = true
        let newRegisteredCount = 0;
        successfulOperations.forEach(op => {
          // Ward field can be 'Ward', 'Ward Code', or 'ward_code' depending on the upload file format
          const recordWardCode = op.record?.Ward || op.record?.['Ward Code'] || op.record?.['ward_code'];
          if (String(recordWardCode).trim() === wardCode) {
            const idNumber = op.record?.['ID Number'] || op.record?.['id_number'];
            const iecResult = iecResults.get(idNumber);
            // Only count if IEC says they're registered AND not deceased
            const isDeceased = (iecResult?.voter_status?.toUpperCase() || '').includes('DECEASED') ||
              iecResult?.voting_district_code === '11111111';

            if (iecResult?.is_registered && !isDeceased) {
              newRegisteredCount++;
            }
          }
        });

        const totalRegistered = existingCount + newRegisteredCount;
        const isCompliant = totalRegistered >= 200;

        complianceData.push({
          ward_code: wardCode,
          existing_members: existingCount,
          new_members: newRegisteredCount,
          total_registered: totalRegistered,
          is_compliant: isCompliant
        });

        console.log(`   📊 Ward ${wardCode}: ${existingCount} existing + ${newRegisteredCount} new = ${totalRegistered} total (${isCompliant ? '✅ Compliant' : '❌ Not compliant'})`);
      } catch (error: any) {
        console.error(`   ❌ Error calculating compliance for ward ${wardCode}:`, error.message);
      }
    }

    // Sort by ward code
    complianceData.sort((a, b) => a.ward_code.localeCompare(b.ward_code));

    const compliantCount = complianceData.filter(w => w.is_compliant).length;
    console.log(`   ✅ Ward compliance calculation complete: ${compliantCount}/${complianceData.length} wards compliant`);

    return complianceData;
  }

  /**
   * Generate PDF attendance registers for wards with 200+ registered voters
   * Only includes members who are registered to vote (excludes voter_registration_status_id = 2)
   * Optionally sends the generated PDFs via email to the user
   */
  private static async generateAttendanceRegistersForCompliantWards(
    compliantWards: WardComplianceData[],
    outputDir: string,
    userEmail?: string,
    userName?: string
  ): Promise<GeneratedAttendanceRegister[]> {
    console.log(`\n📋 ATTENDANCE REGISTERS: Generating for ${compliantWards.length} compliant ward(s)...`);

    const generatedRegisters: GeneratedAttendanceRegister[] = [];
    const emailService = new EmailService();

    for (const ward of compliantWards) {
      try {
        console.log(`   🔄 Generating attendance register for ward ${ward.ward_code}...`);

        // Get ward information
        const wardInfoQuery = `
          SELECT DISTINCT
            ward_code,
            ward_name,
            ward_number,
            municipality_code,
            municipality_name,
            district_code,
            district_name,
            province_code,
            province_name
          FROM vw_member_details
          WHERE ward_code = $1
        `;
        const wardInfo = await executeQuerySingle(wardInfoQuery, [ward.ward_code]);

        if (!wardInfo) {
          console.log(`   ⚠️ Ward info not found for ${ward.ward_code}, skipping...`);
          continue;
        }

        // Get members for this ward using ViewsService
        // Filter for active members only (membership_status = 'active')
        const filters = {
          ward_code: ward.ward_code,
          membership_status: 'active', // Only active/good standing members (membership_status_id = 1)
          limit: '10000' // Get all members
        };
        const result = await ViewsService.getMembersWithVotingDistricts(filters);
        const allMembers = result.members || [];

        // Filter to only registered voters who are active
        // voter_registration_id: 1 = Registered, 2 = Not Registered
        // membership_status_id: 1 = Active/Good Standing
        // Exclude members who are not registered to vote
        const activeRegisteredMembers = allMembers.filter((member: any) => {
          // voter_registration_id = 2 means "Not Registered to Vote" - exclude these
          const isRegisteredVoter = member.voter_registration_id !== 2;
          // membership_status_id = 1 means "Active/Good Standing" - already filtered by ViewsService
          // but double-check to be safe
          const isActive = member.membership_status_id === 1;
          return isRegisteredVoter && isActive;
        });

        console.log(`   📊 Ward ${ward.ward_code}: ${activeRegisteredMembers.length} active registered voters (filtered from ${allMembers.length} total)`);

        if (activeRegisteredMembers.length === 0) {
          console.log(`   ⚠️ No active registered voters found for ward ${ward.ward_code}, skipping...`);
          continue;
        }

        // Generate the PDF document using HtmlPdfService
        const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, activeRegisteredMembers);

        // Save the file
        const timestamp = new Date().toISOString().split('T')[0];
        const municipalityName = (wardInfo.municipality_name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const wardNumber = wardInfo.ward_number || ward.ward_code;
        const filename = `ATTENDANCE_REGISTER_WARD_${wardNumber}_${municipalityName}_${timestamp}.pdf`;
        const filePath = path.join(outputDir, filename);

        fs.writeFileSync(filePath, pdfBuffer);

        generatedRegisters.push({
          ward_code: ward.ward_code,
          file_path: filePath,
          member_count: activeRegisteredMembers.length
        });

        console.log(`   ✅ Generated: ${filename} (${activeRegisteredMembers.length} active members)`);

        // Send email with PDF attachment if user email is provided
        if (userEmail) {
          try {
            const displayName = userName || userEmail;
            const emailSubject = `Ward ${wardNumber} Attendance Register - ${wardInfo.municipality_name}`;
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #00843D;">Ward Attendance Register</h2>
                <p>Dear ${displayName},</p>
                <p>Please find attached the attendance register for:</p>
                <ul>
                  <li><strong>Ward:</strong> ${wardNumber}</li>
                  <li><strong>Municipality:</strong> ${wardInfo.municipality_name}</li>
                  <li><strong>Province:</strong> ${wardInfo.province_name}</li>
                  <li><strong>Active Registered Voters:</strong> ${activeRegisteredMembers.length}</li>
                </ul>
                <p>This document includes only <strong>active members in good standing</strong> who are <strong>registered to vote</strong>.</p>
                <p>This document was automatically generated from the bulk upload process.</p>
                <p>Best regards,<br>EFF Membership System</p>
              </div>
            `;
            const emailText = `Ward Attendance Register\n\nDear ${displayName},\n\nPlease find attached the attendance register for Ward ${wardNumber} - ${wardInfo.municipality_name} (${activeRegisteredMembers.length} active registered voters).\n\nThis document includes only active members in good standing who are registered to vote.\n\nBest regards,\nEFF Membership System`;

            const emailSent = await emailService.sendEmail({
              to: userEmail,
              subject: emailSubject,
              html: emailHtml,
              text: emailText,
              attachments: [
                {
                  filename: filename,
                  content: pdfBuffer,
                  contentType: 'application/pdf'
                }
              ]
            });

            if (emailSent) {
              console.log(`   📧 Email sent to ${userEmail} with ${filename}`);
            } else {
              console.warn(`   ⚠️ Failed to send email to ${userEmail}`);
            }
          } catch (emailError: any) {
            console.error(`   ❌ Error sending email for ward ${ward.ward_code}:`, emailError.message);
          }
        }
      } catch (error: any) {
        console.error(`   ❌ Error generating attendance register for ward ${ward.ward_code}:`, error.message);
      }
    }

    return generatedRegisters;
  }

  /**
   * Create All Uploaded Rows sheet with IEC status and existing member info
   */
  private static createAllUploadedRowsSheet(
    workbook: ExcelJS.Workbook,
    originalData: BulkUploadRecord[],
    validationResult: ValidationResult,
    iecResults: Map<string, IECVerificationResult>,
    dbResult: DatabaseOperationsBatchResult
  ): void {
    const sheet = workbook.addWorksheet('All Uploaded Rows');

    if (originalData.length === 0) {
      sheet.getCell('A1').value = 'No data uploaded';
      return;
    }

    // Create existing members and error lookups
    const existingMembersMap = new Map<string, ExistingMemberRecord>();
    validationResult.existing_members.forEach(em => {
      existingMembersMap.set(em['ID Number'], em);
    });

    const renewalRecordsMap = new Map<string, RenewalRecord>();
    validationResult.renewal_records.forEach(rr => {
      renewalRecordsMap.set(rr['ID Number'], rr);
    });

    const renewalErrorsMap = new Map<string, RenewalValidationError>();
    validationResult.renewal_validation_errors.forEach(re => {
      renewalErrorsMap.set(re.record['ID Number'], re);
    });

    const subscriptionErrorsMap = new Map<string, SubscriptionTypeError>();
    validationResult.subscription_type_errors.forEach(se => {
      subscriptionErrorsMap.set(se.record['ID Number'], se);
    });

    const successfulRenewalsMap = new Map<string, DatabaseOperationResult>();
    dbResult.successful_operations.filter(op => op.operation === 'renewal').forEach(sr => {
      successfulRenewalsMap.set(sr.id_number, sr);
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
      'Is Renewal',
      'Renewal Status',
      'Renewal Error',
      'Subscription Error'
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
      const renewalRecord = renewalRecordsMap.get(idNumber);
      const renewalError = renewalErrorsMap.get(idNumber);
      const subscriptionError = subscriptionErrorsMap.get(idNumber);
      const successfulRenewal = successfulRenewalsMap.get(idNumber);

      // Determine renewal status display
      let renewalStatus = 'N/A';
      if (successfulRenewal) {
        renewalStatus = `✅ ${successfulRenewal.renewal_classification === 'early_renewal' ? 'Early' : 'Expired'}`;
      } else if (renewalRecord) {
        renewalStatus = '⏳ Validated';
      }

      const values = [
        ...originalHeaders.map((h) => record[h]),
        iecDetails?.is_registered ? 'YES' : 'NO',
        iecDetails?.ward_code || 'N/A',
        iecDetails?.voting_district_code || 'N/A',
        existingMember ? 'YES' : 'NO',
        existingMember ? `${existingMember.existing_name || ''}`.trim() : 'N/A',
        existingMember?.existing_ward || 'N/A',
        renewalRecord || successfulRenewal ? 'YES' : 'NO',
        renewalStatus,
        renewalError ? renewalError.error_type : 'None',
        subscriptionError ? subscriptionError.error_type : 'None'
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
      } else if (renewalRecord || successfulRenewal) {
        // Renewal - light blue
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9EAD3' }, // Very light green/blue for renewals
        };
      } else if (existingMember) {
        // Existing member (standard update) - light yellow
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' },
        };
      } else if (renewalError || subscriptionError) {
        // Error - light red
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < originalHeaders.length) {
        column.width = 15;
      } else {
        column.width = 22; // Wider for status columns
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
      'IEC Municipality Name (Actual)',
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

      // Debug: Log IEC result to see what fields are populated
      console.log(`   📋 Different Ward - ID: ${record['ID Number']}, IEC Municipality: "${iecResult?.municipality || 'UNDEFINED'}"`);

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
        iecResult?.municipality || 'N/A', // IEC Municipality Name (Actual)
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
      } else if (idx === 5 || idx === 19) {
        column.width = 30; // Wider for Ward Mismatch and Note
      } else if (idx === 8) {
        column.width = 30; // Wider for IEC Municipality Name (Actual)
      } else {
        column.width = 18;
      }
    });
  }

  /**
   * Create Successful Renewals sheet
   * Shows all successfully processed membership renewals with classification
   */
  private static createSuccessfulRenewalsSheet(
    workbook: ExcelJS.Workbook,
    successfulRenewals: DatabaseOperationResult[]
  ): void {
    const sheet = workbook.addWorksheet('Successful Renewals');

    if (successfulRenewals.length === 0) {
      sheet.getCell('A1').value = 'No membership renewals processed';
      return;
    }

    // Headers for renewal sheet
    const headers = [
      'ID Number',
      'Full Name',
      'Renewal Classification',
      'Previous Expiry Date',
      'New Expiry Date',
      'Days Extended',
      'Member ID',
      'Ward',
      'Cell Number',
      'Email'
    ];
    sheet.addRow(headers);

    // Style header row with blue (renewal color)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }, // Blue for renewals
    };

    // Add data rows
    successfulRenewals.forEach((renewal) => {
      const record = renewal.record as any;
      const fullName = `${record?.Firstname || record?.Name || ''} ${record?.Surname || ''}`.trim();

      // Calculate days extended
      let daysExtended = 'N/A';
      if (renewal.previous_expiry_date && renewal.new_expiry_date) {
        const prevDate = new Date(renewal.previous_expiry_date);
        const newDate = new Date(renewal.new_expiry_date);
        const diffTime = newDate.getTime() - prevDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysExtended = diffDays.toString();
      }

      // Format classification for display
      const classificationDisplay = renewal.renewal_classification === 'early_renewal'
        ? '🟢 Early Renewal (Active Member)'
        : '🟡 Expired Member Renewal';

      const values = [
        renewal.id_number,
        fullName,
        classificationDisplay,
        renewal.previous_expiry_date ? new Date(renewal.previous_expiry_date).toISOString().split('T')[0] : 'N/A',
        renewal.new_expiry_date ? new Date(renewal.new_expiry_date).toISOString().split('T')[0] : 'N/A',
        daysExtended,
        renewal.member_id || 'N/A',
        record?.Ward || 'N/A',
        record?.['Cell Number'] || 'N/A',
        record?.Email || 'N/A'
      ];
      const row = sheet.addRow(values);

      // Color code based on renewal classification
      if (renewal.renewal_classification === 'early_renewal') {
        row.getCell(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' } // Light green
        };
      } else {
        row.getCell(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' } // Light yellow
        };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx === 1) {
        column.width = 25; // Full Name
      } else if (idx === 2) {
        column.width = 30; // Renewal Classification
      } else {
        column.width = 18;
      }
    });
  }

  /**
   * Create Renewal Validation Errors sheet
   * Shows records that failed renewal-specific validation rules
   */
  private static createRenewalValidationErrorsSheet(
    workbook: ExcelJS.Workbook,
    renewalErrors: RenewalValidationError[]
  ): void {
    const sheet = workbook.addWorksheet('Renewal Validation Errors');

    if (renewalErrors.length === 0) {
      sheet.getCell('A1').value = 'No renewal validation errors';
      sheet.getCell('A1').font = { bold: true, color: { argb: 'FF00AA00' } };
      return;
    }

    // Headers
    const headers = [
      'Row Number',
      'ID Number',
      'Full Name',
      'Error Type',
      'Error Message',
      'Database Expiry Date',
      'Excel Expiry Date',
      'Ward',
      'Cell Number'
    ];
    sheet.addRow(headers);

    // Style header row with red (error color)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC143C' }, // Crimson red
    };

    // Add data rows
    renewalErrors.forEach((error) => {
      const record = error.record;
      const fullName = `${record.Firstname || record.Name || ''} ${record.Surname || ''}`.trim();

      // Format error type for display
      const errorTypeDisplay = {
        'expiry_date_not_newer': '❌ Expiry Date Not Newer',
        'invalid_date_format': '❌ Invalid Date Format',
        'missing_expiry_date': '❌ Missing Expiry Date',
        'invalid_last_payment_date': '❌ Invalid Last Payment Date'
      }[error.error_type] || error.error_type;

      const values = [
        record.row_number,
        record['ID Number'],
        fullName,
        errorTypeDisplay,
        error.error_message,
        error.db_expiry_date ? new Date(error.db_expiry_date).toISOString().split('T')[0] : 'N/A',
        error.excel_expiry_date ? new Date(error.excel_expiry_date).toISOString().split('T')[0] : 'N/A',
        record.Ward || 'N/A',
        record['Cell Number'] || 'N/A'
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx === 2) {
        column.width = 25; // Full Name
      } else if (idx === 3) {
        column.width = 28; // Error Type
      } else if (idx === 4) {
        column.width = 60; // Error Message
      } else {
        column.width = 18;
      }
    });

    // Wrap text for error message column
    sheet.getColumn(5).alignment = { wrapText: true, vertical: 'top' };
  }

  /**
   * Create Subscription Type Errors sheet
   * Shows records with invalid or conflicting subscription types
   */
  private static createSubscriptionTypeErrorsSheet(
    workbook: ExcelJS.Workbook,
    subscriptionErrors: SubscriptionTypeError[]
  ): void {
    const sheet = workbook.addWorksheet('Subscription Type Errors');

    if (subscriptionErrors.length === 0) {
      sheet.getCell('A1').value = 'No subscription type errors';
      sheet.getCell('A1').font = { bold: true, color: { argb: 'FF00AA00' } };
      return;
    }

    // Headers
    const headers = [
      'Row Number',
      'ID Number',
      'Full Name',
      'Subscription Value',
      'Error Type',
      'Error Message',
      'Existing Member ID',
      'Ward',
      'Cell Number'
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
    subscriptionErrors.forEach((error) => {
      const record = error.record;
      const fullName = `${record.Firstname || record.Name || ''} ${record.Surname || ''}`.trim();

      // Format error type for display
      const errorTypeDisplay = {
        'existing_member_new_subscription': '⚠️ Existing Member with "New"',
        'invalid_subscription_type': '❌ Invalid Subscription Type',
        'missing_subscription': '❌ Missing Subscription'
      }[error.error_type] || error.error_type;

      const values = [
        record.row_number,
        record['ID Number'],
        fullName,
        record.Subscription || '(empty)',
        errorTypeDisplay,
        error.error_message,
        error.existing_member_id || 'N/A',
        record.Ward || 'N/A',
        record['Cell Number'] || 'N/A'
      ];
      const row = sheet.addRow(values);

      // Color code based on error type
      if (error.error_type === 'existing_member_new_subscription') {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' } // Light yellow (warning)
        };
      } else {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' } // Light red (error)
        };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx === 2) {
        column.width = 25; // Full Name
      } else if (idx === 4) {
        column.width = 30; // Error Type
      } else if (idx === 5) {
        column.width = 60; // Error Message
      } else {
        column.width = 18;
      }
    });

    // Wrap text for error message column
    sheet.getColumn(6).alignment = { wrapText: true, vertical: 'top' };
  }

  /**
   * Create Status Updates sheet
   * Shows members whose expiry dates were calculated or statuses were changed
   */
  private static createStatusUpdatesSheet(
    workbook: ExcelJS.Workbook,
    statusUpdates: MemberStatusUpdateBatchResult
  ): void {
    const sheet = workbook.addWorksheet('Status Updates');

    // Filter to only show members with actual changes
    const changedMembers = statusUpdates.updates.filter(
      u => u.expiry_date_calculated || u.status_changed
    );

    if (changedMembers.length === 0) {
      sheet.getCell('A1').value = 'No status updates were made';
      sheet.getCell('A1').font = { bold: true, color: { argb: 'FF00AA00' } };
      return;
    }

    // Headers
    const headers = [
      'ID Number',
      'Member Name',
      'Expiry Calculated',
      'Previous Expiry',
      'New Expiry',
      'Status Changed',
      'Previous Status',
      'New Status'
    ];
    sheet.addRow(headers);

    // Style header row (teal for status updates)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF008080' }, // Teal
    };

    // Add data rows
    changedMembers.forEach((update) => {
      const values = [
        update.id_number,
        update.member_name,
        update.expiry_date_calculated ? 'YES' : 'NO',
        update.previous_expiry_date
          ? new Date(update.previous_expiry_date).toISOString().split('T')[0]
          : 'N/A',
        update.new_expiry_date
          ? new Date(update.new_expiry_date).toISOString().split('T')[0]
          : 'N/A',
        update.status_changed ? 'YES' : 'NO',
        update.previous_status_name,
        update.new_status_name
      ];
      const row = sheet.addRow(values);

      // Color code based on change type
      if (update.expiry_date_calculated) {
        row.getCell(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' } // Light green
        };
      }
      if (update.status_changed) {
        row.getCell(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' } // Light yellow
        };
      }
    });

    // Add summary at the bottom
    sheet.addRow([]);
    sheet.addRow(['Summary']);
    sheet.addRow(['Total Processed', statusUpdates.stats.total_processed]);
    sheet.addRow(['Expiry Dates Calculated', statusUpdates.stats.expiry_dates_calculated]);
    sheet.addRow(['Statuses Changed', statusUpdates.stats.statuses_changed]);
    sheet.addRow(['Protected Skipped', statusUpdates.stats.protected_skipped]);
    sheet.addRow(['No Payment Date', statusUpdates.stats.no_payment_date_skipped]);
    sheet.addRow(['Already Correct', statusUpdates.stats.already_correct_skipped]);
    sheet.addRow(['Errors', statusUpdates.stats.errors]);

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx === 1) {
        column.width = 25; // Member Name
      } else {
        column.width = 18;
      }
    });
  }
}
