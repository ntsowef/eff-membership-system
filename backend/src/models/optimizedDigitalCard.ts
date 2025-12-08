import { OptimizedMemberModel, OptimizedMemberData } from './optimizedMembers';
import { cacheService, CacheTTL } from '../services/cacheService';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

// Optimized card generation with caching and performance improvements
export class OptimizedDigitalCardModel {
  // Cache prefixes
  private static readonly PDF_CACHE_PREFIX = 'pdf:';
  private static readonly QR_CACHE_PREFIX = 'qr:';
  private static readonly CARD_DATA_CACHE_PREFIX = 'card_data:';
  
  // Cache TTLs
  private static readonly PDF_CACHE_TTL = CacheTTL.LONG; // 1 hour
  private static readonly QR_CACHE_TTL = CacheTTL.VERY_LONG; // 4 hours
  private static readonly CARD_DATA_CACHE_TTL = CacheTTL.MEDIUM; // 30 minutes

  /**
   * Generate optimized membership card with aggressive caching
   */
  static async generateOptimizedMembershipCard(
    memberId: string, 
    options: {
      template?: string;
      issued_by: string;
      custom_expiry?: string;
    }
  ): Promise<{
    card_data: any;
    pdf_buffer: Buffer;
    qr_code_url: string;
    pdf_size: number;
    cache_hit: boolean;
  }> {
    const cacheKey = `${this.CARD_DATA_CACHE_PREFIX}${memberId}:${options.template || 'standard'}`;
    
    try {
      // Check if complete card data is cached
      const cachedCardData: any = await cacheService.get(cacheKey);
      if (cachedCardData) {
        return {
          card_data: cachedCardData.card_data,
          pdf_buffer: Buffer.from(cachedCardData.pdf_buffer, 'base64'),
          qr_code_url: cachedCardData.qr_code_url,
          pdf_size: cachedCardData.pdf_size,
          cache_hit: true
        };
      }

      // Get member data using optimized model
      const memberData = await OptimizedMemberModel.getMemberByIdOptimized(memberId);
      if (!memberData) {
        throw new Error(`Member not found: ${memberId}`);
      }

      // Generate card components in parallel
      const [cardData, qrCodeUrl, pdfBuffer] = await Promise.all([
        this.generateCardData(memberData, options),
        this.generateQRCodeCached(memberData, options),
        this.generatePDFCached(memberData, options)
      ]);

      const result = {
        card_data: cardData,
        pdf_buffer: pdfBuffer,
        qr_code_url: qrCodeUrl,
        pdf_size: pdfBuffer.length,
        cache_hit: false
      };

      // Cache the complete result
      await cacheService.set(cacheKey, result, this.CARD_DATA_CACHE_TTL);

      return result;
    } catch (error) {
      console.error('Error generating optimized membership card:', error);
      throw error;
    }
  }

  /**
   * Generate card data with caching
   */
  private static async generateCardData(
    memberData: OptimizedMemberData, 
    options: any
  ): Promise<any> {
    // Generate unique card ID and number
    const cardId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cardNumber = `DC${Date.now().toString().slice(-8)}`;
    
    // Create security hash
    const securityData = `${memberData.member_id}:${memberData.membership_number}:${cardNumber}:${Date.now()}`;
    const securityHash = crypto.createHash('sha256').update(securityData).digest('hex');

    return {
      card_id: cardId,
      member_id: memberData.member_id,
      card_number: cardNumber,
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: options.custom_expiry || memberData.expiry_date,
      status: 'active',
      security_hash: securityHash,
      card_design_template: options.template || 'standard',
      issued_by: options.issued_by,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Generate QR code with caching
   */
  private static async generateQRCodeCached(
    memberData: OptimizedMemberData, 
    options: any
  ): Promise<string> {
    // Create cache key based on member data
    const qrCacheKey = `${this.QR_CACHE_PREFIX}${memberData.member_id}:${memberData.membership_number}`;
    
    try {
      // Check cache first
      const cachedQR = await cacheService.get(qrCacheKey);
      if (cachedQR) {
        return cachedQR as string;
      }

      // Generate QR code data
      const qrCodeData = JSON.stringify({
        member_id: memberData.member_id,
        membership_number: memberData.membership_number,
        name: `${memberData.first_name} ${memberData.last_name}`,
        expiry_date: options.custom_expiry || memberData.expiry_date,
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

      // Cache the QR code
      await cacheService.set(qrCacheKey, qrCodeUrl, this.QR_CACHE_TTL);

      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Generate PDF with caching
   */
  private static async generatePDFCached(
    memberData: OptimizedMemberData, 
    options: any
  ): Promise<Buffer> {
    // Create cache key based on member data and template
    const pdfCacheKey = `${this.PDF_CACHE_PREFIX}${memberData.member_id}:${options.template || 'standard'}`;
    
    try {
      // Check cache first
      const cachedPDF = await cacheService.get(pdfCacheKey);
      if (cachedPDF) {
        // Convert cached base64 back to buffer
        return Buffer.from(cachedPDF as string, 'base64');
      }

      // Generate PDF
      const pdfBuffer = await this.generatePDFBuffer(memberData, options);

      // Cache the PDF as base64 string
      await cacheService.set(pdfCacheKey, pdfBuffer.toString('base64'), this.PDF_CACHE_TTL);

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF buffer (optimized version)
   */
  private static async generatePDFBuffer(
    memberData: OptimizedMemberData, 
    options: any
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [350, 220], // Credit card size
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Front side - Clean layout
        doc.rect(0, 0, 350, 220).fill('#1976d2');

        // Header section
        doc.rect(0, 0, 350, 50).fill('#0d47a1');

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

        // Member information - Centered at Top
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
           .text(`Valid Until: ${new Date(memberData.expiry_date).toLocaleDateString()}`, 180, 165, { align: 'center', width: 120 });

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
        doc.rect(0, 0, 350, 220).fillAndStroke('#0d47a1', '#1976d2');

        // Back side header
        doc.fillColor('#ffffff')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('MEMBERSHIP VERIFICATION', 0, 30, { align: 'center', width: 350 });

        // Generate membership number QR code for back side
        const membershipQRCode = await QRCode.toDataURL(memberData.membership_number, {
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
           .text(memberData.membership_number, 0, 215, { align: 'center', width: 350 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Batch generate cards for multiple members
   */
  static async batchGenerateCards(
    memberIds: string[], 
    options: {
      template?: string;
      issued_by: string;
      concurrency?: number;
    }
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ memberId: string; success: boolean; error?: string }>;
  }> {
    const concurrency = options.concurrency || 10; // Limit concurrent operations
    const results: Array<{ memberId: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < memberIds.length; i += concurrency) {
      const batch = memberIds.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (memberId) => {
        try {
          await this.generateOptimizedMembershipCard(memberId, options);
          successful++;
          return { memberId, success: true };
        } catch (error) {
          failed++;
          return { 
            memberId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return { successful, failed, results };
  }

  /**
   * Clear card caches for a member
   */
  static async clearMemberCardCache(memberId: string): Promise<void> {
    const cacheKeys = [
      `${this.PDF_CACHE_PREFIX}${memberId}:standard`,
      `${this.QR_CACHE_PREFIX}${memberId}:*`,
      `${this.CARD_DATA_CACHE_PREFIX}${memberId}:standard`
    ];

    await Promise.all(cacheKeys.map(key => cacheService.del(key)));
  }

  /**
   * Get cache statistics for card generation
   */
  static async getCardCacheStats(): Promise<{
    pdfCacheSize: number;
    qrCacheSize: number;
    cardDataCacheSize: number;
    totalCacheHits: number;
    totalCacheMisses: number;
  }> {
    try {
      const stats = await cacheService.getStats();
      return {
        pdfCacheSize: 0, // Would need to implement cache size tracking by prefix
        qrCacheSize: 0,
        cardDataCacheSize: 0,
        totalCacheHits: stats.hits || 0,
        totalCacheMisses: stats.misses || 0
      };
    } catch (error) {
      console.error('Error getting card cache stats:', error);
      return {
        pdfCacheSize: 0,
        qrCacheSize: 0,
        cardDataCacheSize: 0,
        totalCacheHits: 0,
        totalCacheMisses: 0
      };
    }
  }
}
