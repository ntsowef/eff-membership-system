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
}