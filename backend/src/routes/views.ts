import { Router } from 'express';
import { ViewsService } from '../services/viewsService';
import { authenticate, requirePermission } from '../middleware/auth';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';

const router = Router();

// POST /api/v1/views/create-members-voting-districts - Create members with voting districts views
router.post('/create-members-voting-districts',
  authenticate,
  requirePermission('system.admin'),
  asyncHandler(async (req, res) => {
    await ViewsService.createMembersVotingDistrictViews();
    
    sendSuccess(res, null, 'Members with voting districts views created successfully');
  })
);

// GET /api/v1/views/members-with-voting-districts - Get members with voting district information
router.get('/members-with-voting-districts',
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {
      province_code: req.query.province_code as string,
      district_code: req.query.district_code as string,
      municipal_code: req.query.municipal_code as string,
      ward_code: req.query.ward_code as string,
      voting_district_code: req.query.voting_district_code as string,
      voting_station_id: req.query.voting_station_id as string,
      voting_station_name: req.query.voting_station_name as string,
      has_voting_district: req.query.has_voting_district as string,
      age_group: req.query.age_group as string,
      gender_id: req.query.gender_id as string,
      limit: req.query.limit as string
    };

    const members = await ViewsService.getMembersWithVotingDistricts(filters);
    
    sendSuccess(res, {
      members,
      total: members.length
    }, 'Members with voting districts retrieved successfully');
  })
);

// GET /api/v1/views/voting-district-summary - Get voting district summary
router.get('/voting-district-summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const filters = {
      province_name: req.query.province_name as string,
      district_name: req.query.district_name as string,
      municipal_name: req.query.municipal_name as string,
      ward_code: req.query.ward_code as string,
      min_members: req.query.min_members as string
    };

    const summary = await ViewsService.getVotingDistrictSummary(filters);
    
    sendSuccess(res, {
      summary,
      total: summary.length
    }, 'Voting district summary retrieved successfully');
  })
);

export default router;
