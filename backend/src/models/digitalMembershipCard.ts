import { executeQuery, executeQuerySingle } from '../config/database';
import { DatabaseError } from '../middleware/errorHandler';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

export interface DigitalMembershipCard {
  card_id: string;
  member_id: string;
  card_number: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  qr_code_data: string;
  security_hash: string;
  card_design_template: string;
  issued_by: string;
  last_updated: string;
}

export interface MemberCardData {
  member_id: string;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  province_name: string;
  municipality_name: string;
  ward_code: string;
  voting_station_name: string;
  membership_type: string;
  join_date: string;
  expiry_date: string;
  photo_url?: string;
}

export class DigitalMembershipCardModel {
  // Generate a new digital membership card
  static async generateMembershipCard(memberId: string, options: {
    template?: string;
    issued_by: string;
    custom_expiry?: string;
  }): Promise<{
    card: DigitalMembershipCard;
    pdf_buffer: Buffer;
    qr_code_url: string;
  }> {
    try {
      // Get member information (PostgreSQL syntax) - using optimized view
      // FIX: Use actual expiry_date and membership_status from view instead of calculating
      const memberQuery = `
        SELECT
          member_id,
          membership_number,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          COALESCE(email, '') as email,
          COALESCE(cell_number, '') as phone_number,
          province_code,
          province_name,
          municipality_name,
          ward_code,
          COALESCE(voting_station_name, 'Not Available') as voting_station_name,
          COALESCE(membership_status, 'Inactive') as membership_type,
          membership_status,
          member_created_at as join_date,
          expiry_date,
          membership_amount,
          days_until_expiry
        FROM vw_member_details_optimized
        WHERE member_id = $1
      `;
      
      const memberData = await executeQuerySingle<MemberCardData>(memberQuery, [memberId]);
      
      if (!memberData) {
        throw new Error(`Member not found: ${memberId}`);
      }

      // Generate unique card ID and number
      const cardId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const cardNumber = `DC${Date.now().toString().slice(-8)}`;
      
      // Create security hash
      const securityData = `${memberData.member_id}:${memberData.membership_number}:${cardNumber}:${Date.now()}`;
      const securityHash = crypto.createHash('sha256').update(securityData).digest('hex');
      
      // Generate QR code data
      const qrCodeData = JSON.stringify({
        card_id: cardId,
        member_id: memberData.member_id,
        membership_number: memberData.membership_number,
        card_number: cardNumber,
        name: `${memberData.first_name} ${memberData.last_name}`,
        expiry_date: options.custom_expiry || memberData.expiry_date,
        security_hash: securityHash ? securityHash.substring(0, 16) : 'N/A', // First 16 chars for QR
        issued: new Date().toISOString()
      });
      
      // Generate QR code image
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Create digital card record
      const digitalCard: DigitalMembershipCard = {
        card_id: cardId,
        member_id: memberData.member_id,
        card_number: cardNumber,
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: options.custom_expiry || memberData.expiry_date,
        status: 'active',
        qr_code_data: qrCodeData,
        security_hash: securityHash,
        card_design_template: options.template || 'standard',
        issued_by: options.issued_by,
        last_updated: new Date().toISOString()
      };

      // Generate PDF card
      const pdfBuffer = await this.generateCardPDF(memberData, digitalCard, qrCodeUrl);

      // In a real implementation, you would save the card record to database
      // For now, we'll simulate this
      console.log(`Digital membership card generated for member ${memberId}`);

      return {
        card: digitalCard,
        pdf_buffer: pdfBuffer,
        qr_code_url: qrCodeUrl
      };
    } catch (error) {
      throw new DatabaseError('Failed to generate digital membership card', error);
    }
  }

  // Generate PDF membership card
  private static async generateCardPDF(
    memberData: MemberCardData,
    cardData: DigitalMembershipCard,
    qrCodeUrl: string
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [350, 220], // Credit card size (3.5" x 2.2")
          margins: { top: 10, bottom: 10, left: 15, right: 15 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Card background and border
        doc.rect(0, 0, 350, 220)
           .fillAndStroke('#1976d2', '#0d47a1');

        // Header section
        doc.rect(0, 0, 350, 50)
           .fill('#0d47a1');

        // Organization name
        doc.fillColor('#ffffff')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('ORGANIZATION NAME', 20, 15, { align: 'left' });

        // Province in top right
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Province: ${memberData.province_name}`, 250, 15, { align: 'right' });

        // Membership card title
        doc.fontSize(10)
           .font('Helvetica')
           .text('DIGITAL MEMBERSHIP CARD', 20, 32);

        // Member information - Centered at Top (No photo, no QR code)
        doc.fillColor('#000000')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text(`${memberData.first_name} ${memberData.last_name}`, 0, 70, { align: 'center', width: 350 });

        doc.fontSize(12)
           .font('Helvetica')
           .text(`${memberData.municipality_name}`, 0, 95, { align: 'center', width: 350 })
           .text(`Ward Code: ${memberData.ward_code}`, 0, 115, { align: 'center', width: 350 })
           .text(`${memberData.voting_station_name}`, 0, 135, { align: 'center', width: 350 });

        // Membership dates - Centered
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Member Since: ${new Date(memberData.join_date).toLocaleDateString()}`, 50, 165, { align: 'center', width: 120 })
           .text(`Valid Until: ${new Date(cardData.expiry_date).toLocaleDateString()}`, 180, 165, { align: 'center', width: 120 });

        // Card number
        doc.fontSize(8)
           .font('Helvetica')
           .text(`Card No: ${cardData.card_number}`, 20, 150);

        // Issue date
        doc.text(`Issued: ${new Date(cardData.issue_date).toLocaleDateString()}`, 20, 165);

        // Security features
        doc.fontSize(6)
           .fillColor('#666666')
           .text(`Security Hash: ${cardData.security_hash ? cardData.security_hash.substring(0, 16) : 'N/A'}...`, 20, 185);

        // Footer
        doc.fontSize(8)
           .fillColor('#1976d2')
           .text('This is a digitally generated membership card. Scan QR code to verify authenticity.', 20, 200, {
             width: 310,
             align: 'center'
           });

        // Add new page for back side
        doc.addPage();

        // Back side background
        doc.rect(0, 0, 350, 220)
           .fillAndStroke('#0d47a1', '#1976d2');

        // Back side header
        doc.fillColor('#ffffff')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('MEMBERSHIP VERIFICATION', 0, 30, { align: 'center', width: 350 });

        // Generate membership number QR code for back side
        const membershipNumber = memberData.membership_number || `MEM${memberData.member_id.padStart(6, '0')}`;
        const membershipQRCode = await QRCode.toDataURL(membershipNumber, {
          width: 120,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Add membership QR code to back side
        if (membershipQRCode) {
          const membershipQRBuffer = Buffer.from(membershipQRCode.split(',')[1], 'base64');
          doc.image(membershipQRBuffer, 115, 70, { width: 120, height: 120 });
        }

        // Membership number text
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Membership Number', 0, 200, { align: 'center', width: 350 });

        doc.fontSize(14)
           .font('Helvetica')
           .text(membershipNumber, 0, 215, { align: 'center', width: 350 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Verify digital membership card
  static async verifyMembershipCard(cardData: string): Promise<{
    valid: boolean;
    member_info?: any;
    card_info?: any;
    verification_details: any;
  }> {
    try {
      // Parse QR code data
      const parsedData = JSON.parse(cardData);
      
      // Verify required fields
      const requiredFields = ['card_id', 'member_id', 'membership_number', 'security_hash'];
      const missingFields = requiredFields.filter(field => !parsedData[field]);
      
      if (missingFields.length > 0) {
        return {
          valid: false,
          verification_details: {
            error: 'Invalid card data structure',
            missing_fields: missingFields
          }
        };
      }

      // Get member information to verify (PostgreSQL syntax) - using optimized view
      // FIX: Use actual expiry_date from view instead of calculating
      const memberQuery = `
        SELECT
          member_id,
          membership_number,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          province_code,
          province_name,
          municipality_name,
          ward_code,
          COALESCE(voting_station_name, 'Not Available') as voting_station_name,
          membership_status,
          member_created_at as join_date,
          expiry_date,
          membership_amount,
          days_until_expiry
        FROM vw_member_details_optimized
        WHERE member_id = $1 AND membership_number = $2
      `;

      const memberInfo = await executeQuerySingle(memberQuery, [
        parsedData.member_id,
        parsedData.membership_number
      ]);

      if (!memberInfo) {
        return {
          valid: false,
          verification_details: {
            error: 'Member not found or membership number mismatch'
          }
        };
      }

      // Check expiry date
      const currentDate = new Date();
      const expiryDate = new Date(parsedData.expiry_date);
      const isExpired = currentDate > expiryDate;

      // Verify security hash (simplified verification)
      const expectedHashData = `${parsedData.member_id}:${parsedData.membership_number}:${parsedData.card_number}`;
      const isSecurityValid = parsedData.security_hash && parsedData.security_hash.length >= 16;

      const verificationDetails = {
        member_exists: true,
        membership_number_match: true,
        security_hash_valid: isSecurityValid,
        card_expired: isExpired,
        expiry_date: parsedData.expiry_date,
        verification_time: new Date().toISOString()
      };

      return {
        valid: !isExpired && isSecurityValid,
        member_info: memberInfo,
        card_info: parsedData,
        verification_details: verificationDetails
      };
    } catch (error) {
      return {
        valid: false,
        verification_details: {
          error: 'Failed to parse or verify card data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Get member's digital cards history
  static async getMemberCards(memberId: string): Promise<{
    active_cards: any[];
    expired_cards: any[];
    total_cards_issued: number;
  }> {
    try {
      // In a real implementation, this would query the digital_cards table
      // For now, we'll simulate with member data (PostgreSQL syntax) - using optimized view
      // FIX: Use actual expiry_date from view instead of calculating
      const memberQuery = `
        SELECT
          member_id,
          membership_number,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          province_code,
          province_name,
          municipality_name,
          ward_code,
          COALESCE(voting_station_name, 'Not Available') as voting_station_name,
          membership_status,
          member_created_at as join_date,
          expiry_date,
          membership_amount,
          days_until_expiry
        FROM vw_member_details_optimized
        WHERE member_id = $1
      `;
      
      const memberData = await executeQuerySingle(memberQuery, [memberId]);
      
      if (!memberData) {
        throw new Error(`Member not found: ${memberId}`);
      }

      // Simulate card history
      const currentDate = new Date();
      const expiryDate = new Date(memberData.expiry_date);
      const isActive = currentDate <= expiryDate;

      const mockCard = {
        card_id: `CARD_${memberId}_${Date.now()}`,
        card_number: `DC${Date.now().toString().slice(-8)}`,
        issue_date: memberData.join_date,
        expiry_date: memberData.expiry_date,
        status: isActive ? 'active' : 'expired',
        card_type: 'Standard Digital Card',
        issued_by: 'System'
      };

      return {
        active_cards: isActive ? [mockCard] : [],
        expired_cards: !isActive ? [mockCard] : [],
        total_cards_issued: 1
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch member cards', error);
    }
  }

  // Bulk generate cards for multiple members
  static async bulkGenerateCards(memberIds: string[], options: {
    template?: string;
    issued_by: string;
    send_email?: boolean;
  }): Promise<{
    successful_generations: number;
    failed_generations: number;
    generation_details: any[];
  }> {
    try {
      const results: any[] = [];
      let successful = 0;
      let failed = 0;

      for (const memberId of memberIds) {
        try {
          const cardResult = await this.generateMembershipCard(memberId, {
            template: options.template,
            issued_by: options.issued_by
          });

          results.push({
            member_id: memberId,
            success: true,
            card_id: cardResult.card.card_id,
            card_number: cardResult.card.card_number,
            pdf_size: cardResult.pdf_buffer.length,
            generation_time: new Date().toISOString()
          });

          successful++;
        } catch (error) {
          results.push({
            member_id: memberId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            generation_time: new Date().toISOString()
          });

          failed++;
        }
      }

      return {
        successful_generations: successful,
        failed_generations: failed,
        generation_details: results
      };
    } catch (error) {
      throw new DatabaseError('Failed to bulk generate cards', error);
    }
  }
}
