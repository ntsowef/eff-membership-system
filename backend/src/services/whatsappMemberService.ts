import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';

export interface MemberInfo {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  cell_number: string;
  email?: string;
  ward_code: string;
  ward_name?: string;
  province_name?: string;
  municipality_name?: string;
  membership_status_name: string;
  expiry_date?: Date;
  days_until_expiry?: number;
  last_payment_date?: Date;
  membership_number?: string;
  language_name?: string;  // Member's home language (e.g., 'Sepedi', 'Tshivenda', 'Xitsonga')
}

export interface ApplicationInfo {
  application_id: number;
  id_number: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: Date;
  ward_code: string;
}

export class WhatsAppMemberService {

  static async getMemberByIdNumber(idNumber: string): Promise<MemberInfo | null> {
    try {
      const result = await executeQuery<MemberInfo[]>(`
        SELECT 
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.cell_number,
          m.email,
          m.ward_code,
          w.ward_name,
          p.province_name,
          mun.municipality_name,
          ms.status_name as membership_status_name,
          m.expiry_date,
         (m.expiry_date - CURRENT_DATE) AS days_until_expiry,
          m.last_payment_date,
          m.membership_number,
          l.language_name
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mun ON w.municipality_code = mun.municipality_code
        LEFT JOIN provinces p ON mun.province_code = p.province_code
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        LEFT JOIN languages l ON m.language_id = l.language_id
        WHERE m.id_number = $1
        LIMIT 1
      `, [idNumber]);

      return result && result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error('Error fetching member by ID', { idNumber, error: error.message });
      throw error;
    }
  }

  static async getMemberByPhoneNumber(phoneNumber: string): Promise<MemberInfo | null> {
    // Clean phone number - handle various formats
    // Input could be: 27821234567, +27821234567, 0821234567
    const digitsOnly = phoneNumber.replace(/\D/g, ''); // Remove non-digits

    // Create search patterns
    let searchPatterns: string[] = [];

    if (digitsOnly.startsWith('27') && digitsOnly.length >= 11) {
      // International format: 27821234567
      const localPart = digitsOnly.slice(2); // 821234567
      searchPatterns = [
        `%${localPart}`,           // matches any prefix + local part
        `%0${localPart}`,          // matches 0821234567
        `%27${localPart}`,         // matches 27821234567
      ];
    } else if (digitsOnly.startsWith('0') && digitsOnly.length >= 10) {
      // Local format: 0821234567
      const localPart = digitsOnly.slice(1); // 821234567
      searchPatterns = [
        `%${localPart}`,
        `%0${localPart}`,
        `%27${localPart}`,
      ];
    } else {
      // Just use what we have
      searchPatterns = [`%${digitsOnly}`];
    }

    logger.info('Phone lookup patterns', { phoneNumber, digitsOnly, searchPatterns });

    try {
      const result = await executeQuery<MemberInfo[]>(`
        SELECT
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.cell_number,
          m.email,
          m.ward_code,
          w.ward_name,
          p.province_name,
          mun.municipality_name,
          ms.status_name as membership_status_name,
          m.expiry_date,
          (m.expiry_date - CURRENT_DATE) AS days_until_expiry,
          m.last_payment_date,
          m.membership_number,
          l.language_name
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mun ON w.municipality_code = mun.municipality_code
        LEFT JOIN provinces p ON mun.province_code = p.province_code
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        LEFT JOIN languages l ON m.language_id = l.language_id
        WHERE m.cell_number LIKE $1
           OR m.cell_number LIKE $2
           OR m.cell_number LIKE $3
        LIMIT 1
      `, [searchPatterns[0], searchPatterns[1] || searchPatterns[0], searchPatterns[2] || searchPatterns[0]]);

      if (result && result.length > 0) {
        logger.info('Phone lookup found member', {
          phoneNumber,
          memberId: result[0].member_id,
          name: `${result[0].firstname} ${result[0].surname}`
        });
      }

      return result && result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error('Error fetching member by phone', { phoneNumber, error: error.message });
      throw error;
    }
  }

  static async getApplicationByIdNumber(idNumber: string): Promise<ApplicationInfo | null> {
    try {
      const result = await executeQuery<ApplicationInfo[]>(`
        SELECT 
          application_id,
          id_number,
          first_name,
          last_name,
          status,
          created_at,
          ward_code
        FROM membership_applications
        WHERE id_number = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [idNumber]);

      return result && result.length > 0 ? result[0] : null;
    } catch (error: any) {
      logger.error('Error fetching application by ID', { idNumber, error: error.message });
      throw error;
    }
  }

  static async updateMemberContactPreference(
    memberId: number,
    whatsappOptIn: boolean
  ): Promise<void> {
    await executeQuery(`
      UPDATE members_consolidated
      SET whatsapp_opt_in = $1, updated_at = NOW()
      WHERE member_id = $2
    `, [whatsappOptIn, memberId]);
  }

  /**
   * Update a member's email address
   */
  static async updateMemberEmail(memberId: number, newEmail: string): Promise<boolean> {
    try {
      await executeQuery(`
        UPDATE members_consolidated
        SET email = $1, updated_at = NOW()
        WHERE member_id = $2
      `, [newEmail, memberId]);

      logger.info('Member email updated', { memberId, newEmail });
      return true;
    } catch (error: any) {
      logger.error('Error updating member email', { memberId, error: error.message });
      throw error;
    }
  }

  /**
   * Update a member's phone number (cell_number)
   */
  static async updateMemberPhone(memberId: number, newPhone: string): Promise<boolean> {
    try {
      // Clean phone number - store in consistent format
      let cleanedPhone = newPhone.replace(/\D/g, ''); // Remove non-digits

      // Convert to local format if it starts with 27
      if (cleanedPhone.startsWith('27') && cleanedPhone.length === 11) {
        cleanedPhone = '0' + cleanedPhone.substring(2);
      }

      await executeQuery(`
        UPDATE members_consolidated
        SET cell_number = $1, updated_at = NOW()
        WHERE member_id = $2
      `, [cleanedPhone, memberId]);

      logger.info('Member phone updated', { memberId, newPhone: cleanedPhone });
      return true;
    } catch (error: any) {
      logger.error('Error updating member phone', { memberId, error: error.message });
      throw error;
    }
  }

  /**
   * Update a member's ward code
   */
  static async updateMemberWard(memberId: number, newWardCode: string): Promise<boolean> {
    try {
      await executeQuery(`
        UPDATE members_consolidated
        SET ward_code = $1, updated_at = NOW()
        WHERE member_id = $2
      `, [newWardCode, memberId]);

      logger.info('Member ward updated', { memberId, newWardCode });
      return true;
    } catch (error: any) {
      logger.error('Error updating member ward', { memberId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate if a ward code exists
   */
  static async validateWardCode(wardCode: string): Promise<{ valid: boolean; wardName?: string }> {
    try {
      const result = await executeQuery<{ ward_name: string }[]>(`
        SELECT ward_name FROM wards WHERE ward_code = $1
      `, [wardCode]);

      if (result && result.length > 0) {
        return { valid: true, wardName: result[0].ward_name };
      }
      return { valid: false };
    } catch (error: any) {
      logger.error('Error validating ward code', { wardCode, error: error.message });
      return { valid: false };
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate South African phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '');

    // Check valid SA phone formats:
    // 0821234567 (10 digits starting with 0)
    // 27821234567 (11 digits starting with 27)
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return /^0[6-8][0-9]{8}$/.test(digitsOnly);
    }
    if (digitsOnly.length === 11 && digitsOnly.startsWith('27')) {
      return /^27[6-8][0-9]{8}$/.test(digitsOnly);
    }
    return false;
  }

  /**
   * Validate ward code format (8 digits)
   */
  static validateWardCodeFormat(wardCode: string): boolean {
    return /^\d{8}$/.test(wardCode);
  }
}