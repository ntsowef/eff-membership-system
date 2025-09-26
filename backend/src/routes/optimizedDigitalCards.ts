import { Router } from 'express';
import { OptimizedDigitalCardModel } from '../models/optimizedDigitalCard';
import { OptimizedMemberModel } from '../models/optimizedMembers';
import { asyncHandler, sendSuccess, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { rateLimiters, applyRateLimit, requestQueueMiddleware, databaseCircuitBreaker } from '../middleware/rateLimiting';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import Joi from 'joi';

const router = Router();

// Generate optimized digital membership card
router.post('/generate-data/:memberId',
  requestQueueMiddleware, // Queue requests under high load
  applyRateLimit(rateLimiters.cardGeneration), // Strict rate limiting for card generation
  cacheMiddleware({
    ttl: 1800, // 30 minutes cache for card data
    keyGenerator: (req) => `card:data:${req.params.memberId}:${JSON.stringify(req.body)}`,
    condition: (req, res) => res.statusCode === 200
  }),
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    }),
    body: Joi.object({
      template: Joi.string().valid('standard', 'premium').default('standard'),
      issued_by: Joi.string().required(),
      custom_expiry: Joi.string().isoDate().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { template, issued_by, custom_expiry } = req.body;

    // Use circuit breaker for card generation
    const cardResult = await databaseCircuitBreaker.execute(async () => {
      return await OptimizedDigitalCardModel.generateOptimizedMembershipCard(memberId, {
        template,
        issued_by,
        custom_expiry
      });
    });

    // Convert PDF buffer to base64 for JSON response
    const response = {
      card_data: cardResult.card_data,
      qr_code_url: cardResult.qr_code_url,
      pdf_base64: cardResult.pdf_buffer.toString('base64'),
      pdf_size: cardResult.pdf_size,
      cache_hit: cardResult.cache_hit,
      generated_at: new Date().toISOString()
    };

    sendSuccess(res, response, 'Digital membership card generated successfully');
  })
);

// Generate optimized PDF card (direct download)
router.post('/generate/:memberId',
  requestQueueMiddleware,
  applyRateLimit(rateLimiters.cardGeneration),
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    }),
    body: Joi.object({
      template: Joi.string().valid('standard', 'premium').default('standard'),
      issued_by: Joi.string().required(),
      custom_expiry: Joi.string().isoDate().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { template, issued_by, custom_expiry } = req.body;

    // Use circuit breaker for card generation
    const cardResult = await databaseCircuitBreaker.execute(async () => {
      return await OptimizedDigitalCardModel.generateOptimizedMembershipCard(memberId, {
        template,
        issued_by,
        custom_expiry
      });
    });

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="membership-card-${cardResult.card_data.card_number}.pdf"`);
    res.setHeader('Content-Length', cardResult.pdf_buffer.length);
    res.setHeader('X-Cache-Hit', cardResult.cache_hit ? 'true' : 'false');
    res.setHeader('X-PDF-Size', cardResult.pdf_size.toString());

    res.send(cardResult.pdf_buffer);
  })
);

// Batch generate cards (for bulk operations)
router.post('/batch-generate',
  requestQueueMiddleware,
  applyRateLimit(rateLimiters.bulkOperations),
  validate({
    body: Joi.object({
      member_ids: Joi.array().items(Joi.string()).min(1).max(100).required(),
      template: Joi.string().valid('standard', 'premium').default('standard'),
      issued_by: Joi.string().required(),
      concurrency: Joi.number().min(1).max(20).default(10)
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_ids, template, issued_by, concurrency } = req.body;

    // Use circuit breaker for batch operations
    const batchResult = await databaseCircuitBreaker.execute(async () => {
      return await OptimizedDigitalCardModel.batchGenerateCards(member_ids, {
        template,
        issued_by,
        concurrency
      });
    });

    sendSuccess(res, batchResult, 'Batch card generation completed');
  })
);

// Get member by ID number for card generation (optimized public endpoint)
router.get('/member/:idNumber',
  requestQueueMiddleware,
  applyRateLimit(rateLimiters.memberLookup),
  cacheMiddleware({
    ttl: 3600, // 1 hour cache
    keyGenerator: (req) => `card:member:${req.params.idNumber}`,
    condition: (req, res) => res.statusCode === 200
  }),
  validate({
    params: Joi.object({
      idNumber: Joi.string().pattern(/^\d{13}$/).required().messages({
        'string.pattern.base': 'ID number must be exactly 13 digits'
      })
    })
  }),
  asyncHandler(async (req, res) => {
    const { idNumber } = req.params;

    // Use circuit breaker for member lookup
    const member = await databaseCircuitBreaker.execute(async () => {
      return await OptimizedMemberModel.getMemberByIdNumberOptimized(idNumber);
    });

    if (!member) {
      throw new NotFoundError(`Member with ID number ${idNumber} not found`);
    }

    sendSuccess(res, member, 'Member retrieved successfully');
  })
);

// Verify digital membership card
router.post('/verify',
  requestQueueMiddleware,
  applyRateLimit(rateLimiters.general),
  cacheMiddleware({
    ttl: 900, // 15 minutes cache for verification
    keyGenerator: (req) => `card:verify:${Buffer.from(JSON.stringify(req.body)).toString('base64')}`,
    condition: (req, res) => res.statusCode === 200
  }),
  validate({
    body: Joi.object({
      card_data: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { card_data } = req.body;

    try {
      // Parse and validate card data
      const parsedData = JSON.parse(card_data);
      
      // Use circuit breaker for verification
      const verificationResult = await databaseCircuitBreaker.execute(async () => {
        // Get member data for verification
        const member = await OptimizedMemberModel.getMemberByIdOptimized(parsedData.member_id);
        
        if (!member) {
          return {
            valid: false,
            verification_details: {
              error: 'Member not found'
            }
          };
        }

        // Verify membership number matches
        if (member.membership_number !== parsedData.membership_number) {
          return {
            valid: false,
            verification_details: {
              error: 'Membership number mismatch'
            }
          };
        }

        // Check expiry date
        const expiryDate = new Date(parsedData.expiry_date);
        const currentDate = new Date();
        
        if (currentDate > expiryDate) {
          return {
            valid: false,
            verification_details: {
              error: 'Card has expired',
              expiry_date: parsedData.expiry_date
            }
          };
        }

        return {
          valid: true,
          member_info: {
            name: `${member.first_name} ${member.last_name}`,
            membership_number: member.membership_number,
            province: member.province_name,
            municipality: member.municipality_name
          },
          verification_details: {
            verified_at: new Date().toISOString(),
            expiry_date: parsedData.expiry_date
          }
        };
      });

      sendSuccess(res, verificationResult, 'Card verification completed');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError('Invalid card data format');
      }
      throw error;
    }
  })
);

// Get cache statistics for monitoring
router.get('/cache-stats',
  applyRateLimit(rateLimiters.general),
  asyncHandler(async (req, res) => {
    const [memberCacheStats, cardCacheStats] = await Promise.all([
      OptimizedMemberModel.getCacheStats(),
      OptimizedDigitalCardModel.getCardCacheStats()
    ]);

    const stats = {
      member_cache: memberCacheStats,
      card_cache: cardCacheStats,
      timestamp: new Date().toISOString()
    };

    sendSuccess(res, stats, 'Cache statistics retrieved successfully');
  })
);

// Warm up cache (admin endpoint)
router.post('/warm-cache',
  applyRateLimit(rateLimiters.bulkOperations),
  validate({
    body: Joi.object({
      member_limit: Joi.number().min(100).max(10000).default(1000)
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_limit } = req.body;

    await OptimizedMemberModel.warmUpCache(member_limit);

    sendSuccess(res, { 
      warmed_members: member_limit,
      timestamp: new Date().toISOString()
    }, 'Cache warmed up successfully');
  })
);

// Clear member cache (admin endpoint)
router.delete('/cache/:memberId',
  applyRateLimit(rateLimiters.general),
  validate({
    params: Joi.object({
      memberId: Joi.string().required()
    }),
    body: Joi.object({
      id_number: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    const { id_number } = req.body;

    await Promise.all([
      OptimizedMemberModel.invalidateMemberCache(memberId, id_number),
      OptimizedDigitalCardModel.clearMemberCardCache(memberId)
    ]);

    sendSuccess(res, { 
      cleared: true,
      member_id: memberId,
      timestamp: new Date().toISOString()
    }, 'Member cache cleared successfully');
  })
);

export default router;
