import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/auth';
import { iecApiService } from '../services/iecApiService';
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const verifyVoterSchema = Joi.object({
  idNumber: Joi.string().required().pattern(/^\d{13}$/).message('ID number must be 13 digits')
});

const searchVotersSchema = Joi.object({
  firstName: Joi.string().optional().min(2).max(50),
  lastName: Joi.string().optional().min(2).max(50),
  idNumber: Joi.string().optional().pattern(/^\d{13}$/),
  votingDistrict: Joi.string().optional().min(1).max(20),
  ward: Joi.string().optional().min(1).max(20)
}).min(1); // At least one field required

const votingDistrictSchema = Joi.object({
  votingDistrictCode: Joi.string().required().min(1).max(20)
});

/**
 * @route GET /api/v1/iec/status
 * @desc Get IEC API connection status
 * @access Private (requires authentication)
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await iecApiService.getApiStatus();
    
    res.json(createSuccessResponse(status, 'IEC API status retrieved successfully'));
  } catch (error) {
    console.error('Error getting IEC API status:', error);
    res.status(500).json(createErrorResponse('Failed to get IEC API status', 'IEC_API_ERROR'));
  }
});

/**
 * @route POST /api/v1/iec/verify-voter
 * @desc Verify voter details by ID number
 * @access Private (requires membership.verify permission)
 */
router.post('/verify-voter', 
  authenticate, 
  requirePermission('membership.verify'),
  validateRequest(verifyVoterSchema),
  async (req, res) => {
    try {
      const { idNumber } = req.body;
      
      const voterDetails = await iecApiService.verifyVoter(idNumber);
      
      if (voterDetails) {
        res.json(createSuccessResponse(voterDetails, 'Voter verified successfully'));
      } else {
        res.status(404).json(createErrorResponse('Voter not found in IEC database', 'VOTER_NOT_FOUND'));
      }
    } catch (error) {
      console.error('Error verifying voter:', error);
      res.status(500).json(createErrorResponse('Failed to verify voter', 'IEC_VERIFICATION_ERROR'));
    }
  }
);

/**
 * @route POST /api/v1/iec/search-voters
 * @desc Search voters by criteria
 * @access Private (requires membership.search permission)
 */
router.post('/search-voters',
  authenticate,
  requirePermission('membership.search'),
  validateRequest(searchVotersSchema),
  async (req, res) => {
    try {
      const searchCriteria = req.body;
      
      const voters = await iecApiService.searchVoters(searchCriteria);
      
      res.json(createSuccessResponse({
        voters,
        count: voters.length
      }, `Found ${voters.length} voters matching criteria`));
    } catch (error) {
      console.error('Error searching voters:', error);
      res.status(500).json(createErrorResponse('Failed to search voters', 'IEC_SEARCH_ERROR'));
    }
  }
);

/**
 * @route GET /api/v1/iec/voting-district/:code
 * @desc Get voting district information
 * @access Private (requires membership.read permission)
 */
router.get('/voting-district/:code',
  authenticate,
  requirePermission('membership.read'),
  async (req, res) => {
    try {
      const { code } = req.params;
      
      // Validate voting district code
      const { error } = votingDistrictSchema.validate({ votingDistrictCode: code });
      if (error) {
        return res.status(400).json(createErrorResponse(error.details[0].message, 'VALIDATION_ERROR'));
      }
      
      const districtInfo = await iecApiService.getVotingDistrictInfo(code);
      
      if (districtInfo) {
        res.json(createSuccessResponse(districtInfo, 'Voting district information retrieved successfully'));
      } else {
        res.status(404).json(createErrorResponse('Voting district not found', 'DISTRICT_NOT_FOUND'));
      }
    } catch (error) {
      console.error('Error getting voting district info:', error);
      res.status(500).json(createErrorResponse('Failed to get voting district information', 'IEC_DISTRICT_ERROR'));
    }
  }
);

/**
 * @route POST /api/v1/iec/validate-voting-district
 * @desc Validate voting district code
 * @access Private (requires membership.read permission)
 */
router.post('/validate-voting-district',
  authenticate,
  requirePermission('membership.read'),
  validateRequest(votingDistrictSchema),
  async (req, res) => {
    try {
      const { votingDistrictCode } = req.body;
      
      const isValid = await iecApiService.validateVotingDistrict(votingDistrictCode);
      
      res.json(createSuccessResponse({
        votingDistrictCode,
        isValid
      }, isValid ? 'Voting district is valid' : 'Voting district is invalid'));
    } catch (error) {
      console.error('Error validating voting district:', error);
      res.status(500).json(createErrorResponse('Failed to validate voting district', 'IEC_VALIDATION_ERROR'));
    }
  }
);

/**
 * @route POST /api/v1/iec/bulk-verify
 * @desc Bulk verify multiple ID numbers
 * @access Private (requires membership.bulk_verify permission)
 */
router.post('/bulk-verify',
  authenticate,
  requirePermission('membership.bulk_verify'),
  async (req, res) => {
    try {
      const { idNumbers } = req.body;
      
      // Validate input
      if (!Array.isArray(idNumbers) || idNumbers.length === 0) {
        return res.status(400).json(createErrorResponse('idNumbers must be a non-empty array', 'VALIDATION_ERROR'));
      }
      
      if (idNumbers.length > 100) {
        return res.status(400).json(createErrorResponse('Maximum 100 ID numbers allowed per request', 'VALIDATION_ERROR'));
      }
      
      // Validate each ID number
      for (const idNumber of idNumbers) {
        if (!/^\d{13}$/.test(idNumber)) {
          return res.status(400).json(createErrorResponse(`Invalid ID number format: ${idNumber}`, 'VALIDATION_ERROR'));
        }
      }
      
      const results: Array<{
        idNumber: string;
        verified: boolean;
        details?: any;
        error?: string;
      }> = [];

      // Process each ID number
      for (const idNumber of idNumbers) {
        try {
          const voterDetails = await iecApiService.verifyVoter(idNumber);
          results.push({
            idNumber,
            verified: !!voterDetails,
            details: voterDetails
          });
        } catch (error: any) {
          results.push({
            idNumber,
            verified: false,
            error: error?.message || 'Unknown error'
          });
        }
      }
      
      const verifiedCount = results.filter(r => r.verified).length;
      
      res.json(createSuccessResponse({
        results,
        summary: {
          total: idNumbers.length,
          verified: verifiedCount,
          failed: idNumbers.length - verifiedCount
        }
      }, `Bulk verification completed: ${verifiedCount}/${idNumbers.length} verified`));
    } catch (error) {
      console.error('Error in bulk verification:', error);
      res.status(500).json(createErrorResponse('Failed to perform bulk verification', 'IEC_BULK_VERIFY_ERROR'));
    }
  }
);

export default router;
