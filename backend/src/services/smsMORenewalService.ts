import { executeQuery, executeQuerySingle } from '../config/database';
import { MembershipRenewalModel } from '../models/membershipRenewals';
import { MemberModel, MemberDetails } from '../models/members';
import { SMSService } from './smsService';
import { logger } from '../utils/logger';

export interface MOParsedData {
  msisdn: string;
  messageContent: string;
  idNumber?: string;
  memberId?: number;
}

export class SMSMORenewalService {
  /**
   * Main entry point for processing a renewal request via SMS MO
   */
  static async processRenewalRequest(msisdn: string, messageContent: string, providerName: string): Promise<{
    success: boolean;
    error?: string;
    memberId?: number;
    idNumber?: string;
  }> {
    try {
      logger.info(`Processing renewal request from ${msisdn}: "${messageContent}"`);

      // 1. Extract potential ID Number from message
      const idNumber = this.extractIDNumber(messageContent);
      
      // 2. Lookup Member
      let member: MemberDetails | null = null;
      if (idNumber) {
        member = await MemberModel.getMemberByIdNumber(idNumber);
      }

      // If no match by ID number or no ID number provided, try by phone number
      if (!member) {
        // Find member by cell number. Need to handle different phone formats potentially.
        member = await this.findMemberByPhone(msisdn);
      }

      if (!member) {
        return { 
          success: false, 
          error: 'Member not found. Please ensure your ID number is correct or contact support.',
          idNumber
        };
      }

      const memberId = member.member_id;
      const memberIdNumber = member.id_number;

      // 3. Validate Renewal Eligibility (simplified for now)
      // In a real scenario, we might check if they are already renewed for the current year
      const currentYear = new Date().getFullYear();
      
      // 4. Create Pending Renewal
      const renewalId = await MembershipRenewalModel.createRenewal({
        membership_id: member.current_membership_id || 0, // Should find the correct membership_id
        member_id: memberId,
        renewal_year: currentYear,
        renewal_status: 'Pending',
        renewal_notes: `Initiated via SMS MO (${providerName}). Message: ${messageContent}`
      } as any);

      logger.info(`Created pending renewal ${renewalId} for member ${memberId}`);

      // 5. Send Confirmation SMS
      await this.sendConfirmationSMS(msisdn, member.firstname);

      return { 
        success: true, 
        memberId, 
        idNumber: memberIdNumber 
      };
      return { success: true, memberId, idNumber: memberIdNumber };
    } catch (error: any) {
      logger.error('Error in processRenewalRequest', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Extracts a potential South African ID number (13 digits) from string
   */
  private static extractIDNumber(text: string): string | undefined {
    // Regex for 13 digit numeric sequence
    const match = text.match(/\b\d{13}\b/);
    return match ? match[0] : undefined;
  }

  /**
   * Finds a member by cell number, trying multiple formats
   */
  private static async findMemberByPhone(phone: string): Promise<any | null> {
    // Normalize phone number (remove + and leading 0/prefix if needed)
    const normalized = phone.replace(/\D/g, '');
    
    // In South Africa, common formats are 27... and 0...
    const formats = [
      normalized, // raw
      normalized.startsWith('27') ? '0' + normalized.substring(2) : normalized, // 0... format
      normalized.startsWith('0') ? '27' + normalized.substring(1) : normalized, // 27... format
    ];

    for (const format of new Set(formats)) {
      const query = 'SELECT * FROM members_consolidated WHERE cell_number LIKE ?';
      const member = await executeQuerySingle<any>(query, [`%${format}`]);
      if (member) return member;
    }

    return null;
  }

  /**
   * Sends a confirmation SMS to the member
   */
  private static async sendConfirmationSMS(msisdn: string, name: string): Promise<void> {
    const message = `Hello ${name}, we have received your membership renewal request. An official will contact you shortly with payment details. Thank you!`;
    try {
      await SMSService.sendSMS(msisdn, message, 'RenewalConfirmation');
    } catch (error: any) {
      logger.error('Failed to send renewal confirmation SMS:', { error: error.message });
      // We don't throw here to avoid breaking the MO logging, but it's a failure in UX
    }
  }

  /**
   * Logs the MO callback to the database
   */
  static async logMOCallback(data: {
    msisdn: string;
    destination?: string;
    content?: string;
    provider: string;
    idNumber?: string;
    memberId?: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO sms_mo_callbacks (
        msisdn, destination, message_content, provider_name, 
        id_number, member_id, processed_successfully, processing_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.msisdn,
      data.destination || null,
      data.content || null,
      data.provider,
      data.idNumber || null,
      data.memberId || null,
      data.success,
      data.error || null
    ];

    try {
      await executeQuery(query, params);
    } catch (error: any) {
      logger.error('Failed to log MO callback to database', { error: error.message });
    }
  }
}
