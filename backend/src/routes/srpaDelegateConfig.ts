import express, { Request, Response } from 'express';
import Joi from 'joi';
import { SRPADelegateConfigModel, SRPADelegateConfig } from '../models/srpaDelegateConfig';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler, NotFoundError, AuthenticationError } from '../middleware/errorHandler';
import { sendSuccess, sendError } from '../middleware/errorHandler';

const router = express.Router();

// =====================================================
// Validation Schemas
// =====================================================

const provinceCodeSchema = Joi.object({
  province_code: Joi.string().required().max(10)
});

const subRegionCodeSchema = Joi.object({
  sub_region_code: Joi.string().required().max(20)
});

const upsertConfigSchema = Joi.object({
  sub_region_code: Joi.string().required().max(20),
  max_delegates: Joi.number().integer().min(1).max(100).required(),
  notes: Joi.string().allow('', null).optional()
});

const bulkUpsertSchema = Joi.object({
  configs: Joi.array().items(
    Joi.object({
      sub_region_code: Joi.string().required().max(20),
      max_delegates: Joi.number().integer().min(1).max(100).required(),
      notes: Joi.string().allow('', null).optional()
    })
  ).min(1).required()
});

// =====================================================
// Routes
// =====================================================

/**
 * GET /api/v1/srpa-delegate-config/all
 * Get all SRPA delegate configurations
 */
router.get('/all',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const configs = await SRPADelegateConfigModel.getAllConfigs();
    sendSuccess(res, configs, 'All SRPA delegate configurations retrieved successfully');
  })
);

/**
 * GET /api/v1/srpa-delegate-config/province/:province_code
 * Get SRPA delegate configurations for a specific province
 */
router.get('/province/:province_code',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: provinceCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code } = req.params;
    const configs = await SRPADelegateConfigModel.getConfigsByProvince(province_code);
    sendSuccess(res, configs, `SRPA delegate configurations for ${province_code} retrieved successfully`);
  })
);

/**
 * GET /api/v1/srpa-delegate-config/sub-region/:sub_region_code
 * Get SRPA delegate configuration for a specific sub-region
 */
router.get('/sub-region/:sub_region_code',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: subRegionCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sub_region_code } = req.params;
    const config = await SRPADelegateConfigModel.getConfigBySubRegion(sub_region_code);

    if (!config) {
      throw new NotFoundError('Configuration not found for this sub-region');
    }

    sendSuccess(res, config, 'SRPA delegate configuration retrieved successfully');
  })
);

/**
 * POST /api/v1/srpa-delegate-config
 * Create or update SRPA delegate configuration for a sub-region
 */
router.post('/',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({ body: upsertConfigSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sub_region_code, max_delegates, notes } = req.body;
    const userId = req.user?.id; // Changed from user_id to id

    if (!userId) {
      throw new AuthenticationError('User ID not found');
    }

    const config = await SRPADelegateConfigModel.upsertConfig({
      sub_region_code,
      max_delegates,
      notes,
      user_id: userId
    });

    sendSuccess(res, config, 'SRPA delegate configuration saved successfully', 201);
  })
);

/**
 * POST /api/v1/srpa-delegate-config/bulk
 * Bulk create or update SRPA delegate configurations
 */
router.post('/bulk',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({ body: bulkUpsertSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { configs } = req.body;
    const userId = req.user?.id; // Changed from user_id to id

    if (!userId) {
      throw new AuthenticationError('User ID not found');
    }

    const results: SRPADelegateConfig[] = [];
    const errors: Array<{ sub_region_code: string; error: string }> = [];

    for (const configData of configs) {
      try {
        const config = await SRPADelegateConfigModel.upsertConfig({
          ...configData,
          user_id: userId
        });
        results.push(config);
      } catch (error: any) {
        errors.push({
          sub_region_code: configData.sub_region_code,
          error: error.message
        });
      }
    }

    sendSuccess(res, {
      success_count: results.length,
      error_count: errors.length,
      results,
      errors
    }, `Bulk update completed: ${results.length} successful, ${errors.length} failed`);
  })
);

/**
 * DELETE /api/v1/srpa-delegate-config/:sub_region_code
 * Delete (deactivate) SRPA delegate configuration for a sub-region
 */
router.delete('/:sub_region_code',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({ params: subRegionCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sub_region_code } = req.params;
    
    await SRPADelegateConfigModel.deleteConfig(sub_region_code);
    
    sendSuccess(res, null, 'SRPA delegate configuration deleted successfully');
  })
);

export default router;

