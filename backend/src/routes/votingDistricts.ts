import { Router } from 'express';
import { VotingDistrictsService } from '../services/votingDistrictsService';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { asyncHandler, sendSuccess, NotFoundError } from '../middleware/errorHandler';
import { PDFExportService } from '../services/pdfExportService';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createVotingDistrictSchema = {
  body: Joi.object({
    voting_district_code: Joi.string().max(20).required(),
    voting_district_name: Joi.string().max(255).required(),
    voting_district_number: Joi.string().max(10).required(),
    ward_code: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional()
  })
};

const updateVotingDistrictSchema = {
  body: Joi.object({
    voting_district_name: Joi.string().max(255).optional(),
    voting_district_number: Joi.string().max(10).optional(),
    ward_code: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    is_active: Joi.boolean().optional()
  })
};

// GET /api/v1/geographic/voting-districts - Get all voting districts (public for application forms)
router.get('/', asyncHandler(async (req, res) => {
  const filters = {
    province_code: req.query.province_code as string,
    district_code: req.query.district_code as string,
    municipal_code: req.query.municipal_code as string,
    ward_code: req.query.ward_code as string,
    voting_district_code: req.query.voting_district_code as string,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
    search: req.query.search as string
  };

  const votingDistricts = await VotingDistrictsService.getVotingDistricts(filters);

  sendSuccess(res, {
    data: votingDistricts,
    total: votingDistricts.length
  }, 'Voting districts retrieved successfully');
}));

// GET /api/v1/geographic/voting-districts/by-ward/:wardCode - Get voting districts by ward (public for application forms)
router.get('/by-ward/:wardCode', asyncHandler(async (req, res) => {
  const { wardCode } = req.params;
  const votingDistricts = await VotingDistrictsService.getVotingDistrictsByWard(wardCode);

  sendSuccess(res, votingDistricts, 'Voting districts by ward retrieved successfully');
}));

// GET /api/v1/geographic/voting-districts/statistics - Get voting district statistics
router.get('/statistics', authenticate, asyncHandler(async (req, res) => {
  const statistics = await VotingDistrictsService.getVotingDistrictStatistics();

  sendSuccess(res, statistics, 'Voting district statistics retrieved successfully');
}));

// GET /api/v1/geographic/voting-districts/hierarchy - Get complete geographic hierarchy
router.get('/hierarchy', authenticate, asyncHandler(async (req, res) => {
  const filters = {
    province_code: req.query.province_code as string,
    district_code: req.query.district_code as string,
    municipal_code: req.query.municipal_code as string,
    ward_code: req.query.ward_code as string
  };

  const hierarchy = await VotingDistrictsService.getCompleteGeographicHierarchy(filters);

  sendSuccess(res, hierarchy, 'Complete geographic hierarchy retrieved successfully');
}));

// GET /api/v1/geographic/voting-districts/:votingDistrictCode - Get single voting district
router.get('/:votingDistrictCode', authenticate, asyncHandler(async (req, res) => {
  const { votingDistrictCode } = req.params;
  const votingDistrict = await VotingDistrictsService.getVotingDistrictByCode(votingDistrictCode);

  if (!votingDistrict) {
    throw new NotFoundError('Voting district not found');
  }

  sendSuccess(res, votingDistrict, 'Voting district retrieved successfully');
}));

// POST /api/v1/geographic/voting-districts - Create new voting district
router.post('/',
  authenticate,
  requirePermission('geographic.manage'),
  validate(createVotingDistrictSchema),
  asyncHandler(async (req, res) => {
    const votingDistrictId = await VotingDistrictsService.createVotingDistrict(req.body);

    sendSuccess(res, { id: votingDistrictId }, 'Voting district created successfully', 201);
  })
);

// PUT /api/v1/geographic/voting-districts/:votingDistrictCode - Update voting district
router.put('/:votingDistrictCode',
  authenticate,
  requirePermission('geographic.manage'),
  validate(updateVotingDistrictSchema),
  asyncHandler(async (req, res) => {
    const { votingDistrictCode } = req.params;
    const updated = await VotingDistrictsService.updateVotingDistrict(votingDistrictCode, req.body);

    if (!updated) {
      throw new NotFoundError('Voting district not found or no changes made');
    }

    sendSuccess(res, null, 'Voting district updated successfully');
  })
);

// DELETE /api/v1/geographic/voting-districts/:votingDistrictCode - Delete voting district
router.delete('/:votingDistrictCode',
  authenticate,
  requirePermission('geographic.manage'),
  asyncHandler(async (req, res) => {
    const { votingDistrictCode } = req.params;
    const deleted = await VotingDistrictsService.deleteVotingDistrict(votingDistrictCode);

    if (!deleted) {
      throw new NotFoundError('Voting district not found');
    }

    sendSuccess(res, null, 'Voting district deleted successfully');
  })
);

// Export voting districts to PDF
router.get('/export/pdf',
  authenticate,
  requirePermission('voting_districts.export'),
  asyncHandler(async (req, res) => {
    try {
      const filters = {
        province_code: req.query.province_code as string,
        ward_code: req.query.ward_code as string,
        municipality_code: req.query.municipality_code as string
      };

      // Generate PDF using PDFExportService
      const pdfBuffer = await PDFExportService.exportVotingDistrictsToPDF(filters, {
        title: 'Voting Districts Report',
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        orientation: 'landscape'
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=voting-districts-export-${new Date().toISOString().split('T')[0]}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Voting districts PDF export failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate voting districts PDF export',
        error: {
          code: 'PDF_GENERATION_ERROR',
          details: 'An error occurred while generating the PDF file'
        },
        timestamp: new Date().toISOString()
      });
    }
  })
);

export default router;
