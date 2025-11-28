import * as fs from 'fs';
import * as path from 'path';
import { WordToPdfService } from './wordToPdfService';
import { HtmlPdfService } from './htmlPdfService';
import { EmailService } from './emailService';

interface WardInfo {
  ward_code: string;
  ward_name: string;
  ward_number: string;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  district_name: string;
  province_code: string;
  province_name: string;
}

interface AttendanceRegisterEmailOptions {
  userEmail: string;
  userName: string;
  wordBuffer: Buffer;
  wardInfo: WardInfo;
  memberCount: number;
}

export class AttendanceRegisterEmailService {
  private static emailService = new EmailService();

  /**
   * Process attendance register email in background
   * Converts Word to PDF, saves temporarily, and emails to user
   * @param options - Email options including user details, word buffer, and ward info
   */
  static async processAttendanceRegisterEmail(
    options: AttendanceRegisterEmailOptions
  ): Promise<void> {
    const { userEmail, userName, wordBuffer, wardInfo, memberCount } = options;
    
    let pdfFilePath: string | null = null;

    try {
      console.log(`📧 Starting background email process for ${userEmail}`);
      console.log(`📊 Ward: ${wardInfo.ward_number} (${wardInfo.ward_code}), Members: ${memberCount}`);

      // Step 1: Convert Word buffer to PDF
      console.log('🔄 Step 1: Converting Word document to PDF...');
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const pdfBuffer = await WordToPdfService.convertWordBufferToPdf(wordBuffer, tempDir);
      console.log(`✅ PDF conversion successful, size: ${pdfBuffer.length} bytes`);

      // Step 2: Save PDF temporarily (for 24-hour retention)
      console.log('💾 Step 2: Saving PDF temporarily...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const municipalityName = wardInfo.municipality_name.replace(/[^a-zA-Z0-9]/g, '_');
      const wardNumber = wardInfo.ward_number || wardInfo.ward_code;
      const pdfFilename = `ATTENDANCE_REGISTER_WARD_${wardNumber}_${municipalityName}_${timestamp}.pdf`;
      pdfFilePath = path.join(tempDir, pdfFilename);

      fs.writeFileSync(pdfFilePath, pdfBuffer);
      console.log(`✅ PDF saved temporarily: ${pdfFilename}`);

      // Step 3: Send email with PDF attachment
      console.log('📧 Step 3: Sending email with PDF attachment...');
      const emailSubject = `Ward ${wardNumber} Attendance Register - ${wardInfo.municipality_name}`;
      const emailBody = this.generateEmailBody(userName, wardInfo, memberCount);

      const emailSent = await this.emailService.sendEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailBody,
        text: this.generatePlainTextEmail(userName, wardInfo, memberCount),
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      if (emailSent) {
        console.log(`✅ Email sent successfully to ${userEmail}`);
      } else {
        console.warn(`⚠️ Email sending failed for ${userEmail}`);
      }

      // Step 4: Schedule cleanup after 24 hours
      this.scheduleCleanup(pdfFilePath, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    } catch (error: any) {
      console.error('❌ Background email process failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        userEmail,
        wardCode: wardInfo.ward_code
      });

      // Clean up immediately on error
      if (pdfFilePath && fs.existsSync(pdfFilePath)) {
        try {
          fs.unlinkSync(pdfFilePath);
          console.log(`🗑️ Cleaned up PDF file after error: ${path.basename(pdfFilePath)}`);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up PDF file:', cleanupError);
        }
      }

      // Don't throw - this is a background process, we don't want to crash
      // Just log the error and continue
    }
  }

  /**
   * Generate HTML email body
   */
  private static generateEmailBody(
    userName: string,
    wardInfo: WardInfo,
    memberCount: number
  ): string {
    const wardNumber = wardInfo.ward_number || wardInfo.ward_code;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .info-box { background-color: #fff; padding: 15px; border-left: 4px solid #DC143C; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .important { color: #DC143C; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          td:first-child { font-weight: bold; width: 40%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Economic Freedom Fighters</h1>
            <p>Ward Attendance Register</p>
          </div>
          <div class="content">
            <h2>Ward Attendance Register Ready 📋</h2>
            <p>Dear <strong>${userName}</strong>,</p>
            <p>Please find attached the Ward Attendance Register for Ward ${wardNumber} in ${wardInfo.municipality_name}. This document contains <strong>${memberCount}</strong> active registered members.</p>

            <div class="info-box">
              <h3 style="margin-top: 0;">Ward Information</h3>
              <table>
                <tr>
                  <td>Ward Number:</td>
                  <td>${wardNumber}</td>
                </tr>
                <tr>
                  <td>Ward Name:</td>
                  <td>${wardInfo.ward_name}</td>
                </tr>
                <tr>
                  <td>Municipality:</td>
                  <td>${wardInfo.municipality_name}</td>
                </tr>
                <tr>
                  <td>District:</td>
                  <td>${wardInfo.district_name}</td>
                </tr>
                <tr>
                  <td>Province:</td>
                  <td>${wardInfo.province_name}</td>
                </tr>
                <tr>
                  <td>Total Members:</td>
                  <td><strong class="important">${memberCount}</strong></td>
                </tr>
              </table>
            </div>

            <p><strong>Note:</strong> This attendance register includes only <span class="important">Active</span> members who are <span class="important">Registered Voters</span>.</p>

            <p style="margin-top: 30px;">Aluta Continua!<br><strong>EFF Membership System</strong></p>
          </div>
          <div class="footer">
            <p>Economic Freedom Fighters | Membership Management System</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email body (fallback)
   */
  private static generatePlainTextEmail(
    userName: string,
    wardInfo: WardInfo,
    memberCount: number
  ): string {
    const wardNumber = wardInfo.ward_number || wardInfo.ward_code;
    
    return `
Economic Freedom Fighters
Ward Attendance Register

Dear ${userName},

Please find attached the Ward Attendance Register for Ward ${wardNumber} in ${wardInfo.municipality_name}. This document contains ${memberCount} active registered members.

Ward Information:
- Ward Number: ${wardNumber}
- Ward Name: ${wardInfo.ward_name}
- Municipality: ${wardInfo.municipality_name}
- District: ${wardInfo.district_name}
- Province: ${wardInfo.province_name}
- Total Members: ${memberCount}

Note: This attendance register includes only Active members who are Registered Voters.

Aluta Continua!
EFF Membership System

---
Economic Freedom Fighters | Membership Management System
This is an automated message. Please do not reply to this email.
    `.trim();
  }

  /**
   * Schedule cleanup of temporary PDF file after specified delay
   */
  private static scheduleCleanup(filePath: string, delayMs: number): void {
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Scheduled cleanup completed: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to clean up file ${path.basename(filePath)}:`, error);
      }
    }, delayMs);
  }

  /**
   * Process attendance register email with pre-generated PDF buffer
   * Uses already-generated PDF to avoid regeneration and timeout issues
   * @param options - Email options including user details, PDF buffer, and ward info
   */
  static async processAttendanceRegisterEmailWithBuffer(options: {
    userEmail: string;
    userName: string;
    pdfBuffer: Buffer;
    wardInfo: WardInfo;
    memberCount: number;
  }): Promise<void> {
    const { userEmail, userName, pdfBuffer, wardInfo, memberCount } = options;

    let pdfFilePath: string | null = null;

    try {
      console.log(`📧 Starting PDF email process for ${userEmail}`);
      console.log(`📊 Ward: ${wardInfo.ward_number || wardInfo.ward_code}, Members: ${memberCount}`);
      console.log(`📄 Using pre-generated PDF buffer, size: ${pdfBuffer.length} bytes`);

      // Step 1: Save PDF temporarily (for 24-hour retention)
      console.log('💾 Step 1: Saving PDF temporarily...');
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const municipalityName = wardInfo.municipality_name.replace(/[^a-zA-Z0-9]/g, '_');
      const wardNumber = wardInfo.ward_number || wardInfo.ward_code;
      const pdfFilename = `ATTENDANCE_REGISTER_WARD_${wardNumber}_${municipalityName}_${timestamp}.pdf`;
      pdfFilePath = path.join(tempDir, pdfFilename);

      // Write PDF buffer to file
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      console.log(`✅ PDF saved: ${pdfFilename}`);

      // Step 2: Send email with PDF attachment
      console.log('📧 Step 2: Sending email with PDF attachment...');
      const emailSubject = `Attendance Register - Ward ${wardNumber} (${wardInfo.municipality_name})`;
      const emailBody = `
        <h2>Attendance Register</h2>
        <p>Dear ${userName},</p>
        <p>Please find attached the attendance register for:</p>
        <ul>
          <li><strong>Ward:</strong> ${wardNumber} (${wardInfo.ward_code})</li>
          <li><strong>Municipality:</strong> ${wardInfo.municipality_name}</li>
          <li><strong>District:</strong> ${wardInfo.district_name}</li>
          <li><strong>Province:</strong> ${wardInfo.province_name}</li>
          <li><strong>Total Members:</strong> ${memberCount}</li>
        </ul>
        <p>This file will be available for download for 24 hours.</p>
        <p>Best regards,<br>EFF Membership System</p>
      `;

      await this.emailService.sendEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailBody,
        attachments: [
          {
            filename: pdfFilename,
            path: pdfFilePath
          }
        ]
      });

      console.log(`✅ Email sent successfully to ${userEmail}`);

      // Step 3: Schedule file cleanup after 24 hours
      setTimeout(() => {
        try {
          if (pdfFilePath && fs.existsSync(pdfFilePath)) {
            fs.unlinkSync(pdfFilePath);
            console.log(`🗑️ Cleaned up temporary PDF file: ${pdfFilename}`);
          }
        } catch (cleanupError) {
          console.error(`⚠️ Failed to clean up temporary PDF file: ${cleanupError}`);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours

    } catch (error) {
      console.error('❌ Error in PDF email process:', error);

      // Clean up file if it exists
      if (pdfFilePath && fs.existsSync(pdfFilePath)) {
        try {
          fs.unlinkSync(pdfFilePath);
          console.log('🗑️ Cleaned up PDF file after error');
        } catch (cleanupError) {
          console.error('⚠️ Failed to clean up PDF file after error:', cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Process attendance register email using HTML-to-PDF generation
   * Generates PDF directly from HTML and emails to user
   * @param options - Email options including user details, ward info, and members
   */
  static async processAttendanceRegisterEmailFromHtml(options: {
    userEmail: string;
    userName: string;
    wardInfo: WardInfo;
    members: any[];
  }): Promise<void> {
    const { userEmail, userName, wardInfo, members } = options;

    let pdfFilePath: string | null = null;

    try {
      console.log(`📧 Starting HTML-based PDF email process for ${userEmail}`);
      console.log(`📊 Ward: ${wardInfo.ward_number || wardInfo.ward_code}, Members: ${members.length}`);

      // Step 1: Generate PDF directly from HTML
      console.log('🔄 Step 1: Generating PDF from HTML...');
      const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, members);
      console.log(`✅ PDF generation successful, size: ${pdfBuffer.length} bytes`);

      // Step 2: Save PDF temporarily (for 24-hour retention)
      console.log('💾 Step 2: Saving PDF temporarily...');
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const municipalityName = wardInfo.municipality_name.replace(/[^a-zA-Z0-9]/g, '_');
      const wardNumber = wardInfo.ward_number || wardInfo.ward_code;
      const pdfFilename = `ATTENDANCE_REGISTER_WARD_${wardNumber}_${municipalityName}_${timestamp}.pdf`;
      pdfFilePath = path.join(tempDir, pdfFilename);

      fs.writeFileSync(pdfFilePath, pdfBuffer);
      console.log(`✅ PDF saved temporarily: ${pdfFilename}`);

      // Step 3: Send email with PDF attachment
      console.log('📧 Step 3: Sending email with PDF attachment...');
      const emailSubject = `Ward ${wardNumber} Attendance Register - ${wardInfo.municipality_name}`;
      const emailBody = this.generateEmailBody(userName, wardInfo, members.length);

      const emailSent = await this.emailService.sendEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailBody,
        text: this.generatePlainTextEmail(userName, wardInfo, members.length),
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      if (emailSent) {
        console.log(`✅ Email sent successfully to ${userEmail}`);
      } else {
        console.warn(`⚠️ Email sending failed for ${userEmail}`);
      }

      // Step 4: Schedule cleanup after 24 hours
      console.log('🗑️ Step 4: Scheduling cleanup...');
      this.scheduleCleanup(pdfFilePath, 24 * 60 * 60 * 1000); // 24 hours

      console.log(`✅ Background email process completed successfully for ${userEmail}`);
    } catch (error) {
      console.error(`❌ Background email process failed for ${userEmail}:`, error);

      // Clean up temporary file if it exists
      if (pdfFilePath && fs.existsSync(pdfFilePath)) {
        try {
          fs.unlinkSync(pdfFilePath);
          console.log(`🗑️ Cleaned up temporary file after error: ${path.basename(pdfFilePath)}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to clean up temporary file:`, cleanupError);
        }
      }

      throw error;
    }
  }
}

