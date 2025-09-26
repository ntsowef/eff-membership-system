import { Router } from 'express';
import { LookupModel } from '../models/lookups';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { validate, commonSchemas } from '../middleware/validation';

const router = Router();

// Get all lookup data in one call
router.get('/', asyncHandler(async (req, res) => {
  const lookupData = await LookupModel.getAllLookupData();
  sendSuccess(res, lookupData, 'All lookup data retrieved successfully');
}));

// Gender lookups
router.get('/genders', asyncHandler(async (req, res) => {
  const genders = await LookupModel.getAllGenders();
  sendSuccess(res, genders, 'Genders retrieved successfully');
}));

// Race lookups
router.get('/races', asyncHandler(async (req, res) => {
  const races = await LookupModel.getAllRaces();
  sendSuccess(res, races, 'Races retrieved successfully');
}));

// Citizenship lookups
router.get('/citizenships', asyncHandler(async (req, res) => {
  const citizenships = await LookupModel.getAllCitizenships();
  sendSuccess(res, citizenships, 'Citizenships retrieved successfully');
}));

// Language lookups
router.get('/languages', asyncHandler(async (req, res) => {
  const languages = await LookupModel.getAllLanguages();
  sendSuccess(res, languages, 'Languages retrieved successfully');
}));

// Occupation category lookups
router.get('/occupation-categories', asyncHandler(async (req, res) => {
  const categories = await LookupModel.getAllOccupationCategories();
  sendSuccess(res, categories, 'Occupation categories retrieved successfully');
}));

// Occupation lookups
router.get('/occupations', asyncHandler(async (req, res) => {
  const { category_id } = req.query;

  let occupations;
  if (category_id) {
    const categoryIdNum = parseInt(category_id as string);
    if (isNaN(categoryIdNum)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'category_id must be a valid number',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    occupations = await LookupModel.getOccupationsByCategory(categoryIdNum);
  } else {
    occupations = await LookupModel.getAllOccupations();
  }

  sendSuccess(res, occupations, 'Occupations retrieved successfully');
}));

// Get occupations by category
router.get('/occupations/category/:categoryId',
  validate({ params: commonSchemas.categoryId }),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const occupations = await LookupModel.getOccupationsByCategory(parseInt(categoryId));
    sendSuccess(res, occupations, `Occupations for category ${categoryId} retrieved successfully`);
  })
);

// Qualification level lookups
router.get('/qualification-levels', asyncHandler(async (req, res) => {
  const qualificationLevels = await LookupModel.getAllQualificationLevels();
  sendSuccess(res, qualificationLevels, 'Qualification levels retrieved successfully');
}));

// Subscription type lookups
router.get('/subscription-types', asyncHandler(async (req, res) => {
  const subscriptionTypes = await LookupModel.getAllSubscriptionTypes();
  sendSuccess(res, subscriptionTypes, 'Subscription types retrieved successfully');
}));

// Membership status lookups
router.get('/membership-statuses', asyncHandler(async (req, res) => {
  const { active_only } = req.query;
  
  let membershipStatuses;
  if (active_only === 'true') {
    membershipStatuses = await LookupModel.getActiveMembershipStatuses();
  } else {
    membershipStatuses = await LookupModel.getAllMembershipStatuses();
  }
  
  sendSuccess(res, membershipStatuses, 'Membership statuses retrieved successfully');
}));

// Voting station lookups
router.get('/voting-stations', asyncHandler(async (req, res) => {
  const { ward_code } = req.query;
  
  let votingStations;
  if (ward_code) {
    votingStations = await LookupModel.getVotingStationsByWard(ward_code as string);
  } else {
    votingStations = await LookupModel.getAllVotingStations();
  }
  
  sendSuccess(res, votingStations, 'Voting stations retrieved successfully');
}));

// Get voting stations by ward
router.get('/voting-stations/ward/:wardCode',
  validate({ params: commonSchemas.wardCode }),
  asyncHandler(async (req, res) => {
    const { wardCode } = req.params;
    const votingStations = await LookupModel.getVotingStationsByWard(wardCode);
    sendSuccess(res, votingStations, `Voting stations for ward ${wardCode} retrieved successfully`);
  })
);

// Get lookup data summary
router.get('/summary', asyncHandler(async (req, res) => {
  const [
    genders,
    races,
    citizenships,
    languages,
    occupationCategories,
    occupations,
    qualificationLevels,
    subscriptionTypes,
    membershipStatuses,
    votingStations
  ] = await Promise.all([
    LookupModel.getAllGenders(),
    LookupModel.getAllRaces(),
    LookupModel.getAllCitizenships(),
    LookupModel.getAllLanguages(),
    LookupModel.getAllOccupationCategories(),
    LookupModel.getAllOccupations(),
    LookupModel.getAllQualificationLevels(),
    LookupModel.getAllSubscriptionTypes(),
    LookupModel.getAllMembershipStatuses(),
    LookupModel.getAllVotingStations()
  ]);

  const summary = {
    counts: {
      genders: genders.length,
      races: races.length,
      citizenships: citizenships.length,
      languages: languages.length,
      occupationCategories: occupationCategories.length,
      occupations: occupations.length,
      qualificationLevels: qualificationLevels.length,
      subscriptionTypes: subscriptionTypes.length,
      membershipStatuses: membershipStatuses.length,
      votingStations: votingStations.length
    },
    details: {
      activeMembershipStatuses: membershipStatuses.filter(s => s.is_active).length,
      occupationsByCategory: occupationCategories.map(category => ({
        category_id: category.category_id,
        category_name: category.category_name,
        occupation_count: occupations.filter(o => o.category_id === category.category_id).length
      })),
      votingStationsByWard: votingStations.reduce((acc, station) => {
        acc[station.ward_code] = (acc[station.ward_code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  };

  sendSuccess(res, summary, 'Lookup data summary retrieved successfully');
}));

export default router;
