import { Router } from 'express';
import { ViewsService } from '../services/viewsService';
import { authenticate, requirePermission } from '../middleware/auth';
import { asyncHandler, sendSuccess, NotFoundError } from '../middleware/errorHandler';
import { WordDocumentService } from '../services/wordDocumentService';
import { AttendanceRegisterEmailService } from '../services/attendanceRegisterEmailService';
import { executeQuery, executeQuerySingle } from '../config/database';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

const router = Router();

// POST /api/v1/views/create-members-voting-districts - Create members with voting districts views
router.post('/create-members-voting-districts',
  authenticate,
  requirePermission('system.admin'),
  asyncHandler(async (req, res) => {
    await ViewsService.createMembersVotingDistrictViews();
    
    sendSuccess(res, null, 'Members with voting districts views created successfully');
  })
);

// GET /api/v1/views/members-with-voting-districts - Get members with voting district information
router.get('/members-with-voting-districts',
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {
      province_code: req.query.province_code as string,
      district_code: req.query.district_code as string,
      municipal_code: req.query.municipal_code as string,
      ward_code: req.query.ward_code as string,
      voting_district_code: req.query.voting_district_code as string,
      voting_station_id: req.query.voting_station_id as string,
      voting_station_name: req.query.voting_station_name as string,
      has_voting_district: req.query.has_voting_district as string,
      age_group: req.query.age_group as string,
      gender_id: req.query.gender_id as string,
      membership_status: req.query.membership_status as string,
      search: req.query.search as string,
      page: req.query.page as string,
      limit: req.query.limit as string
    };

    const result = await ViewsService.getMembersWithVotingDistricts(filters);

    sendSuccess(res, result, 'Members with voting districts retrieved successfully');
  })
);

// GET /api/v1/views/voting-district-summary - Get voting district summary
router.get('/voting-district-summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {
      province_name: req.query.province_name as string,
      district_name: req.query.district_name as string,
      municipal_name: req.query.municipal_name as string,
      ward_code: req.query.ward_code as string,
      min_members: req.query.min_members as string
    };

    const summary = await ViewsService.getVotingDistrictSummary(filters);

    sendSuccess(res, {
      summary,
      total: summary.length
    }, 'Voting district summary retrieved successfully');
  })
);

// GET /api/v1/views/members-with-voting-districts/export - Export ward attendance register
router.get('/members-with-voting-districts/export',
  authenticate,
  requirePermission('members.read'),
  asyncHandler(async (req, res) => {
    try {
      const { format = 'both', ward_code, voting_district_code, voting_station_id } = req.query;

      console.log(`🔄 Starting geographic search export - Format: ${format}`);

      // Build filters for member query
      const filters = {
        province_code: req.query.province_code as string,
        district_code: req.query.district_code as string,
        municipal_code: req.query.municipal_code as string,
        ward_code: ward_code as string,
        voting_district_code: voting_district_code as string,
        voting_station_id: voting_station_id as string,
        voting_station_name: req.query.voting_station_name as string,
        has_voting_district: req.query.has_voting_district as string,
        age_group: req.query.age_group as string,
        gender_id: req.query.gender_id as string,
        membership_status: req.query.membership_status as string,
        search: req.query.search as string,
        limit: '10000' // Get all members for export (respects membership_status filter)
      };

      // Get members with voting districts (ALL members - active and inactive)
      const result = await ViewsService.getMembersWithVotingDistricts(filters);
      const members = result.members || [];

      console.log(`📊 Found ${members.length} members (including inactive) for export`);

      if (members.length === 0) {
        throw new NotFoundError('No active members found for the selected filters');
      }

      // Get ward information if ward_code is provided
      let wardInfo: any = null;
      if (ward_code) {
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
        wardInfo = await executeQuerySingle(wardInfoQuery, [ward_code]);

        // Authorization check: Verify user has access to this ward's province
        if (wardInfo && req.user) {
          const userProvinceCode = (req.user as any).province_code;
          const wardProvinceCode = wardInfo.province_code;
          const isNationalAdmin = req.user.admin_level === 'national' || req.user.role_name === 'super_admin';
          const isProvincialAdmin = req.user.admin_level === 'province';

          // Provincial admins can only access wards in their assigned province
          if (isProvincialAdmin && userProvinceCode !== wardProvinceCode) {
            console.log(`🚫 Authorization failed: User province ${userProvinceCode} does not match ward province ${wardProvinceCode}`);
            return res.status(403).json({
              success: false,
              error: {
                code: 'PROVINCE_ACCESS_DENIED',
                message: `You are not authorized to download attendance registers from ${wardInfo.province_name}. You can only access wards in your assigned province.`,
                userProvince: userProvinceCode,
                requestedProvince: wardProvinceCode
              }
            });
          }

          console.log(`✅ Authorization passed: User has access to ward in province ${wardProvinceCode}`);
        }
      }

      // Create temp directory for files
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().split('T')[0];

      // Different filenames for Excel (All Members) vs Word (Attendance Register - Active only)
      const excelBaseFilename = ward_code
        ? `Ward_${ward_code}_All_Members_${timestamp}`
        : `Geographic_Search_All_Members_${timestamp}`;

      const wordBaseFilename = ward_code
        ? `Ward_${ward_code}_Attendance_Register_${timestamp}`
        : `Geographic_Search_Export_${timestamp}`;

      const filesToGenerate: { path: string; type: string }[] = [];

      // Generate Excel file if requested
      if (format === 'excel' || format === 'both') {
        const excelFilename = `${excelBaseFilename}.xlsx`;
        const excelFilePath = path.join(tempDir, excelFilename);

        // Sort members by membership status for better organization
        // Order: Active -> Grace Period -> Expired -> Inactive
        const statusOrder: Record<string, number> = {
          'Active': 1,
          'Grace Period': 2,
          'Expired': 3,
          'Inactive': 4,
          'Unknown': 5
        };

        const sortedMembers = [...members].sort((a: any, b: any) => {
          const statusA = statusOrder[a.membership_status] || 999;
          const statusB = statusOrder[b.membership_status] || 999;
          if (statusA !== statusB) return statusA - statusB;
          // Secondary sort by surname
          return (a.surname || '').localeCompare(b.surname || '');
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('All Members');

        // Add title row
        worksheet.mergeCells('A1:O1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = ward_code
          ? `Ward ${ward_code} - All Members (Active, Expired, Inactive, Grace Period)`
          : 'Geographic Search - All Members (Active, Expired, Inactive, Grace Period)';
        titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDC143C' } // EFF Red
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 25;

        // Add summary row
        const statusCounts = members.reduce((acc: any, member: any) => {
          const status = member.membership_status || 'Unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        worksheet.mergeCells('A2:O2');
        const summaryCell = worksheet.getCell('A2');
        summaryCell.value = `Total: ${members.length} | Active: ${statusCounts['Active'] || 0} | Grace Period: ${statusCounts['Grace Period'] || 0} | Expired: ${statusCounts['Expired'] || 0} | Inactive: ${statusCounts['Inactive'] || 0}`;
        summaryCell.font = { bold: true, size: 11 };
        summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 20;

        // Add headers on row 3
        worksheet.getRow(3).values = [
          'Membership Status',
          'Province',
          'District',
          'Municipality',
          'Ward Code',
          'Ward Name',
          'Voting District',
          'Voting Station',
          'First Name',
          'Surname',
          'ID Number',
          'Cell Number',
          'Email',
          'Date Joined',
          'Expiry Date'
        ];

        // Style header row
        worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' } // Blue header
        };
        worksheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(3).height = 20;

        // Set column widths
        worksheet.columns = [
          { key: 'membership_status', width: 18 },
          { key: 'province_name', width: 20 },
          { key: 'district_name', width: 25 },
          { key: 'municipal_name', width: 30 },
          { key: 'ward_code', width: 12 },
          { key: 'ward_name', width: 30 },
          { key: 'voting_district_name', width: 30 },
          { key: 'voting_station_name', width: 30 },
          { key: 'firstname', width: 20 },
          { key: 'surname', width: 20 },
          { key: 'id_number', width: 15 },
          { key: 'cell_number', width: 15 },
          { key: 'email', width: 30 },
          { key: 'date_joined', width: 15 },
          { key: 'expiry_date', width: 15 }
        ];

        // Add data rows (starting from row 4)
        let currentStatus = '';
        sortedMembers.forEach((member: any, index: number) => {
          const rowNumber = index + 4;
          const row = worksheet.addRow({
            membership_status: member.membership_status || 'Unknown',
            province_name: member.province_name || '',
            district_name: member.district_name || '',
            municipal_name: member.municipal_name || member.municipality_name || '',
            ward_code: member.ward_code || '',
            ward_name: member.ward_name || '',
            voting_district_name: member.voting_district_name || '',
            voting_station_name: member.voting_station_name || '',
            firstname: member.firstname || '',
            surname: member.surname || '',
            id_number: member.id_number || '',
            cell_number: member.cell_number || '',
            email: member.email || '',
            date_joined: member.date_joined ? new Date(member.date_joined).toLocaleDateString('en-ZA') : '',
            expiry_date: member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-ZA') : ''
          });

          // Add background color based on membership status
          const status = member.membership_status || 'Unknown';
          let bgColor = 'FFFFFFFF'; // White default

          if (status === 'Active') {
            bgColor = 'FFD4EDDA'; // Light green
          } else if (status === 'Grace Period') {
            bgColor = 'FFFFF3CD'; // Light yellow
          } else if (status === 'Expired') {
            bgColor = 'FFF8D7DA'; // Light red
          } else if (status === 'Inactive') {
            bgColor = 'FFE2E3E5'; // Light gray
          }

          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bgColor }
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });

          // Add bold separator when status changes
          if (status !== currentStatus && currentStatus !== '') {
            row.font = { bold: true };
          }
          currentStatus = status;
        });

        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber >= 3) {
            row.eachCell((cell) => {
              if (!cell.border) {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              }
            });
          }
        });

        await workbook.xlsx.writeFile(excelFilePath);
        filesToGenerate.push({ path: excelFilePath, type: 'excel' });
        console.log(`✅ Excel file created with ${members.length} members (all statuses): ${excelFilename}`);
      }

      // Generate PDF file if requested using HTML-to-PDF conversion
      if (format === 'pdf') {
        if (!wardInfo) {
          throw new NotFoundError('Ward information is required for PDF attendance register. Please provide ward_code parameter.');
        }

        console.log('📄 PDF format requested - generating using HTML-to-PDF');

        const pdfFilename = `${wordBaseFilename}.pdf`;
        const pdfFilePath = path.join(tempDir, pdfFilename);

        // Filter members for attendance register - only Active members who are Registered voters
        const attendanceMembers = members.filter((member: any) => {
          const isActive = member.membership_status_id === 1;
          const isRegistered = member.voter_status_id === 1;
          return isActive && isRegistered;
        });

        console.log(`📋 Filtered ${attendanceMembers.length} Active & Registered members from ${members.length} total members for PDF attendance register`);

        // Import HtmlPdfService dynamically
        const { HtmlPdfService } = require('../services/htmlPdfService');
        const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, attendanceMembers);
        fs.writeFileSync(pdfFilePath, pdfBuffer);

        filesToGenerate.push({ path: pdfFilePath, type: 'pdf' });
        console.log(`✅ PDF Attendance Register created with ${attendanceMembers.length} members: ${pdfFilename}`);

        // Trigger background email process with HTML-based PDF (fire-and-forget)
        if (req.user?.email) {
          AttendanceRegisterEmailService.processAttendanceRegisterEmailFromHtml({
            userEmail: req.user.email,
            userName: req.user.name || req.user.email,
            wardInfo: wardInfo,
            members: attendanceMembers
          }).catch(error => {
            // Log error but don't fail the request
            console.error('❌ Background email process failed (non-blocking):', error);
            // Set header to indicate email failed
            res.setHeader('X-Email-Status', 'failed');
            res.setHeader('X-Email-Error', error.message || 'Unknown error');
          });
          console.log(`📧 Background HTML-based PDF email process initiated for ${req.user.email}`);
          // Set header to indicate email is being sent
          res.setHeader('X-Email-Status', 'sending');
          res.setHeader('X-Email-Sent-To', req.user.email);
        } else {
          console.warn('⚠️ User email not available, skipping background email');
          res.setHeader('X-Email-Status', 'no-email');
        }
      }

      // Generate Word file if requested
      if (format === 'word' || format === 'both') {
        if (!wardInfo) {
          throw new NotFoundError('Ward information is required for Word attendance register. Please provide ward_code parameter.');
        }

        const wordFilename = `${wordBaseFilename}.docx`;
        const wordFilePath = path.join(tempDir, wordFilename);

        // FIXED: Filter members for attendance register - only Active members who are Registered voters
        // membership_status_id = 1 (Active), voter_status_id = 1 (Registered)
        const attendanceMembers = members.filter((member: any) => {
          const isActive = member.membership_status_id === 1;
          const isRegistered = member.voter_status_id === 1;
          return isActive && isRegistered;
        });

        console.log(`📋 Filtered ${attendanceMembers.length} Active & Registered members from ${members.length} total members for attendance register`);

        const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(wardInfo, attendanceMembers);
        fs.writeFileSync(wordFilePath, wordBuffer);

        filesToGenerate.push({ path: wordFilePath, type: 'word' });
        console.log(`✅ Word Attendance Register created with ${attendanceMembers.length} members: ${wordFilename}`);

        // Trigger background email process (fire-and-forget)
        if (req.user?.email) {
          AttendanceRegisterEmailService.processAttendanceRegisterEmail({
            userEmail: req.user.email,
            userName: req.user.name || req.user.email,
            wordBuffer: wordBuffer,
            wardInfo: wardInfo,
            memberCount: attendanceMembers.length
          }).catch(error => {
            // Log error but don't fail the request
            console.error('❌ Background email process failed (non-blocking):', error);
            // Set header to indicate email failed
            res.setHeader('X-Email-Status', 'failed');
            res.setHeader('X-Email-Error', error.message || 'Unknown error');
          });
          console.log(`📧 Background email process initiated for ${req.user.email}`);
          // Set header to indicate email is being sent
          res.setHeader('X-Email-Status', 'sending');
        } else {
          console.warn('⚠️ User email not available, skipping background email');
          res.setHeader('X-Email-Status', 'no-email');
        }
      }

      // If both formats requested, create a ZIP file
      if (format === 'both' && filesToGenerate.length > 1) {
        const zipFilename = ward_code
          ? `Ward_${ward_code}_Complete_Export_${timestamp}.zip`
          : `Geographic_Search_Complete_Export_${timestamp}.zip`;
        const zipFilePath = path.join(tempDir, zipFilename);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        filesToGenerate.forEach(file => {
          archive.file(file.path, { name: path.basename(file.path) });
        });

        await archive.finalize();

        // Wait for the stream to finish
        await new Promise<void>((resolve, reject) => {
          output.on('close', () => resolve());
          output.on('error', reject);
        });

        // Send ZIP file
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        // Add custom header to indicate email will be sent
        if (req.user?.email) {
          res.setHeader('X-Email-Sent-To', req.user.email);
        }

        // Set a longer timeout for large files
        res.setTimeout(300000); // 5 minutes

        res.sendFile(zipFilePath, (err) => {
          if (err) {
            console.error('❌ Error sending file:', err);
            // Don't try to send error response if headers already sent
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to send file' });
            }
          }
          // Cleanup temp files
          filesToGenerate.forEach(file => {
            if (fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
              } catch (cleanupErr) {
                console.warn('⚠️ Failed to cleanup temp file:', cleanupErr);
              }
            }
          });
          if (fs.existsSync(zipFilePath)) {
            try {
              fs.unlinkSync(zipFilePath);
            } catch (cleanupErr) {
              console.warn('⚠️ Failed to cleanup zip file:', cleanupErr);
            }
          }
        });
      } else {
        // Send single file
        const file = filesToGenerate[0];

        // Set correct Content-Type based on file type
        let contentType: string;
        if (file.type === 'excel') {
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (file.type === 'pdf') {
          contentType = 'application/pdf';
        } else {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(file.path)}"`);
        // Add custom header to indicate email will be sent (for Word and PDF formats)
        if ((file.type === 'word' || file.type === 'pdf') && req.user?.email) {
          res.setHeader('X-Email-Sent-To', req.user.email);
        }

        // Set a longer timeout for large files
        res.setTimeout(300000); // 5 minutes

        res.sendFile(file.path, (err) => {
          if (err) {
            console.error('❌ Error sending file:', err);
            // Don't try to send error response if headers already sent
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to send file' });
            }
          }
          // Cleanup temp file
          if (fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (cleanupErr) {
              console.warn('⚠️ Failed to cleanup temp file:', cleanupErr);
            }
          }
        });
      }

      console.log(`✅ Export completed successfully`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  })
);

export default router;
