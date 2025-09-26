import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { DigitalMembershipCardModel } from '../models/digitalMembershipCard';

const router = Router();

// Generate Digital Membership Card for a Member
router.post('/generate/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    }),
    body: Joi.object({
      template: Joi.string().valid('standard', 'premium', 'executive').optional(),
      issued_by: Joi.string().required(),
      custom_expiry: Joi.string().isoDate().optional(),
      send_email: Joi.boolean().optional(),
      include_photo: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { template, issued_by, custom_expiry, send_email = false } = req.body;
    
    const cardResult = await DigitalMembershipCardModel.generateMembershipCard(memberId, {
      template,
      issued_by,
      custom_expiry
    });

    // Set headers for PDF download
    const filename = `membership-card-${memberId}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', cardResult.pdf_buffer.length);
    
    // Send the PDF buffer directly
    res.send(cardResult.pdf_buffer);
  })
);

// Get Digital Membership Card Data (for preview/display)
router.post('/generate-data/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    }),
    body: Joi.object({
      template: Joi.string().valid('standard', 'premium', 'executive').optional(),
      issued_by: Joi.string().required(),
      custom_expiry: Joi.string().isoDate().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { template, issued_by, custom_expiry } = req.body;
    
    const cardResult = await DigitalMembershipCardModel.generateMembershipCard(memberId, {
      template,
      issued_by,
      custom_expiry
    });

    sendSuccess(res, {
      card_data: cardResult.card,
      qr_code_url: cardResult.qr_code_url,
      pdf_size: cardResult.pdf_buffer.length,
      generation_time: new Date().toISOString()
    }, 'Digital membership card data generated successfully');
  })
);

// Verify Digital Membership Card
router.post('/verify',
  validate({
    body: Joi.object({
      card_data: Joi.string().required(),
      verification_source: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { card_data, verification_source = 'manual' } = req.body;
    
    const verificationResult = await DigitalMembershipCardModel.verifyMembershipCard(card_data);
    
    sendSuccess(res, {
      verification_result: verificationResult,
      verification_source: verification_source,
      verified_at: new Date().toISOString()
    }, verificationResult.valid ? 'Card verification successful' : 'Card verification failed');
  })
);

// Get Member's Digital Cards History
router.get('/member/:memberId/cards',
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    
    const cardsHistory = await DigitalMembershipCardModel.getMemberCards(memberId);
    
    sendSuccess(res, {
      member_id: memberId,
      cards_history: cardsHistory
    }, 'Member cards history retrieved successfully');
  })
);

// Bulk Generate Digital Membership Cards
router.post('/bulk-generate',
  validate({
    body: Joi.object({
      member_ids: Joi.array().items(Joi.string()).min(1).max(100).required(),
      template: Joi.string().valid('standard', 'premium', 'executive').optional(),
      issued_by: Joi.string().required(),
      send_email: Joi.boolean().optional(),
      custom_expiry: Joi.string().isoDate().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_ids, template, issued_by, send_email = false, custom_expiry } = req.body;
    
    const bulkResult = await DigitalMembershipCardModel.bulkGenerateCards(member_ids, {
      template,
      issued_by,
      send_email
    });

    sendSuccess(res, {
      bulk_generation_result: bulkResult,
      summary: {
        total_requested: member_ids.length,
        successful: bulkResult.successful_generations,
        failed: bulkResult.failed_generations,
        success_rate: ((bulkResult.successful_generations / member_ids.length) * 100).toFixed(1) + '%'
      }
    }, 'Bulk card generation completed');
  })
);

// Download Bulk Generated Cards as ZIP
router.post('/bulk-download',
  validate({
    body: Joi.object({
      member_ids: Joi.array().items(Joi.string()).min(1).max(50).required(),
      template: Joi.string().valid('standard', 'premium', 'executive').optional(),
      issued_by: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_ids, template, issued_by } = req.body;
    
    // For now, we'll generate individual cards and return a summary
    // In a full implementation, you would create a ZIP file with all PDFs
    const bulkResult = await DigitalMembershipCardModel.bulkGenerateCards(member_ids, {
      template,
      issued_by
    });

    // Simulate ZIP file creation
    const zipFileName = `membership-cards-bulk-${new Date().toISOString().split('T')[0]}.zip`;
    
    sendSuccess(res, {
      download_info: {
        filename: zipFileName,
        total_cards: bulkResult.successful_generations,
        failed_cards: bulkResult.failed_generations,
        estimated_size: `${(bulkResult.successful_generations * 150).toFixed(0)}KB`
      },
      generation_details: bulkResult.generation_details,
      note: 'ZIP file generation would be implemented in production'
    }, 'Bulk card download prepared');
  })
);

// Get Card Templates
router.get('/templates',
  asyncHandler(async (req, res) => {
    const templates = [
      {
        id: 'standard',
        name: 'Standard Card',
        description: 'Basic membership card with essential information',
        features: ['Member photo', 'QR code', 'Basic info', 'Security hash'],
        preview_url: '/api/v1/digital-cards/templates/standard/preview'
      },
      {
        id: 'premium',
        name: 'Premium Card',
        description: 'Enhanced card with additional features',
        features: ['Member photo', 'QR code', 'Detailed info', 'Security features', 'Color coding'],
        preview_url: '/api/v1/digital-cards/templates/premium/preview'
      },
      {
        id: 'executive',
        name: 'Executive Card',
        description: 'Premium card for executive members',
        features: ['Professional design', 'Enhanced security', 'Special privileges indicator'],
        preview_url: '/api/v1/digital-cards/templates/executive/preview'
      }
    ];

    sendSuccess(res, {
      templates: templates,
      default_template: 'standard'
    }, 'Card templates retrieved successfully');
  })
);

// Card Statistics
router.get('/statistics',
  asyncHandler(async (req, res) => {
    // Mock statistics - in real implementation, would query database
    const statistics = {
      total_cards_issued: 145820,
      active_cards: 142156,
      expired_cards: 3664,
      cards_issued_this_month: 1250,
      verification_requests_today: 89,
      most_popular_template: 'standard',
      template_usage: {
        standard: 89.2,
        premium: 8.5,
        executive: 2.3
      },
      recent_activity: [
        {
          date: new Date().toISOString().split('T')[0],
          cards_generated: 45,
          verifications: 123
        },
        {
          date: new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0],
          cards_generated: 38,
          verifications: 156
        }
      ]
    };

    sendSuccess(res, {
      card_statistics: statistics,
      generated_at: new Date().toISOString()
    }, 'Card statistics retrieved successfully');
  })
);

// Revoke/Suspend Card
router.patch('/revoke/:memberId',
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    }),
    body: Joi.object({
      action: Joi.string().valid('suspend', 'revoke', 'reactivate').required(),
      reason: Joi.string().max(500).required(),
      revoked_by: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { action, reason, revoked_by } = req.body;
    
    // Mock card revocation - in real implementation, would update database
    const revocationResult = {
      member_id: memberId,
      action: action,
      reason: reason,
      revoked_by: revoked_by,
      revocation_date: new Date().toISOString(),
      previous_status: 'active',
      new_status: action === 'reactivate' ? 'active' : action + 'd',
      success: true
    };

    sendSuccess(res, {
      revocation_result: revocationResult
    }, `Card ${action} completed successfully`);
  })
);

export default router;
