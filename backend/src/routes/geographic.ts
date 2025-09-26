import { Router } from 'express';
import Joi from 'joi';
import { GeographicModel } from '../models/geographic';
import { asyncHandler, sendSuccess, sendPaginatedSuccess, NotFoundError } from '../middleware/errorHandler';
import { validate, commonSchemas } from '../middleware/validation';
import votingDistrictsRouter from './votingDistricts';

const router = Router();

// Root geographic endpoint - provides overview of available endpoints
router.get('/', asyncHandler(async (_req, res) => {
  const endpoints = {
    provinces: '/api/v1/geographic/provinces',
    districts: '/api/v1/geographic/districts',
    municipalities: '/api/v1/geographic/municipalities',
    wards: '/api/v1/geographic/wards',
    voting_districts: '/api/v1/geographic/voting-districts',
    hierarchy: {
      province: '/api/v1/geographic/hierarchy/province/:provinceCode',
      district: '/api/v1/geographic/hierarchy/district/:districtCode',
      municipality: '/api/v1/geographic/hierarchy/municipality/:municipalityCode',
      complete: '/api/v1/geographic/voting-districts/hierarchy'
    },
    summary: '/api/v1/geographic/summary'
  };

  sendSuccess(res, {
    message: 'Geographic Data API',
    description: 'Access South African geographic data including provinces, districts, municipalities, and wards',
    endpoints
  }, 'Geographic API endpoints listed successfully');
}));

// Province routes
router.get('/provinces', asyncHandler(async (_req, res) => {
  const provinces = await GeographicModel.getAllProvinces();
  sendSuccess(res, provinces, 'Provinces retrieved successfully');
}));

// Alias for singular form
router.get('/province', asyncHandler(async (_req, res) => {
  const provinces = await GeographicModel.getAllProvinces();
  sendSuccess(res, provinces, 'Provinces retrieved successfully');
}));

router.get('/provinces/:code',
  validate({ params: commonSchemas.code }),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const province = await GeographicModel.getProvinceByCode(code);

    if (!province) {
      throw new NotFoundError(`Province with code '${code}' not found`);
    }

    sendSuccess(res, province, 'Province retrieved successfully');
  })
);

// Alias for singular form
router.get('/province/:code',
  validate({ params: commonSchemas.code }),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const province = await GeographicModel.getProvinceByCode(code);

    if (!province) {
      throw new NotFoundError(`Province with code '${code}' not found`);
    }

    sendSuccess(res, province, 'Province retrieved successfully');
  })
);

// District routes
router.get('/districts', asyncHandler(async (req, res) => {
  const { province } = req.query;

  let districts;
  if (province && typeof province === 'string') {
    districts = await GeographicModel.getDistrictsByProvince(province);
  } else {
    districts = await GeographicModel.getAllDistricts();
  }

  sendSuccess(res, districts, 'Districts retrieved successfully');
}));

// Alias for singular form
router.get('/district', asyncHandler(async (req, res) => {
  const { province } = req.query;

  let districts;
  if (province && typeof province === 'string') {
    districts = await GeographicModel.getDistrictsByProvince(province);
  } else {
    districts = await GeographicModel.getAllDistricts();
  }

  sendSuccess(res, districts, 'Districts retrieved successfully');
}));

router.get('/districts/:code',
  validate({ params: commonSchemas.code }),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const district = await GeographicModel.getDistrictByCode(code);

    if (!district) {
      throw new NotFoundError(`District with code '${code}' not found`);
    }

    sendSuccess(res, district, 'District retrieved successfully');
  })
);

// Alias for singular form
router.get('/district/:code',
  validate({ params: commonSchemas.code }),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const district = await GeographicModel.getDistrictByCode(code);

    if (!district) {
      throw new NotFoundError(`District with code '${code}' not found`);
    }

    sendSuccess(res, district, 'District retrieved successfully');
  })
);

// Municipality routes
router.get('/municipalities', asyncHandler(async (req, res) => {
  const { province, district } = req.query;
  
  let municipalities;
  if (district && typeof district === 'string') {
    municipalities = await GeographicModel.getMunicipalitiesByDistrict(district);
  } else if (province && typeof province === 'string') {
    municipalities = await GeographicModel.getMunicipalitiesByProvince(province);
  } else {
    municipalities = await GeographicModel.getAllMunicipalities();
  }
  
  sendSuccess(res, municipalities, 'Municipalities retrieved successfully');
}));

router.get('/municipalities/:code',
  validate({ params: commonSchemas.code }),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const municipality = await GeographicModel.getMunicipalityByCode(code);
    
    if (!municipality) {
      throw new NotFoundError(`Municipality with code '${code}' not found`);
    }
    
    sendSuccess(res, municipality, 'Municipality retrieved successfully');
  })
);

// Ward routes
router.get('/wards',
  validate({
    query: commonSchemas.pagination.keys({
      municipality: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, municipality } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let wards;
    let total;

    if (municipality && typeof municipality === 'string') {
      // When filtering by municipality, return ALL wards without pagination
      wards = await GeographicModel.getWardsByMunicipality(municipality);
      total = wards.length;

      // Return all wards for the municipality without pagination
      sendSuccess(res, wards, 'Wards retrieved successfully');
    } else {
      // Only apply pagination when not filtering by municipality
      wards = await GeographicModel.getAllWards(limitNum, offset);
      total = await GeographicModel.getWardsCount();

      const totalPages = Math.ceil(total / limitNum);

      sendPaginatedSuccess(res, wards, {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }, 'Wards retrieved successfully');
    }
  })
);

router.get('/wards/:code',
  validate({ params: commonSchemas.wardCode }),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const ward = await GeographicModel.getWardByCode(code);
    
    if (!ward) {
      throw new NotFoundError(`Ward with code '${code}' not found`);
    }
    
    sendSuccess(res, ward, 'Ward retrieved successfully');
  })
);

// Hierarchical data routes
router.get('/hierarchy/province/:provinceCode',
  validate({ params: commonSchemas.provinceCode }),
  asyncHandler(async (req, res) => {
    const { provinceCode } = req.params;
    
    const province = await GeographicModel.getProvinceByCode(provinceCode);
    if (!province) {
      throw new NotFoundError(`Province with code '${provinceCode}' not found`);
    }
    
    const districts = await GeographicModel.getDistrictsByProvince(provinceCode);
    const municipalities = await GeographicModel.getMunicipalitiesByProvince(provinceCode);
    
    const hierarchyData = {
      province,
      districts,
      municipalities,
      summary: {
        totalDistricts: districts.length,
        totalMunicipalities: municipalities.length,
        municipalityTypes: {
          local: municipalities.filter(m => m.municipality_type === 'Local').length,
          metropolitan: municipalities.filter(m => m.municipality_type === 'Metropolitan').length,
          district: municipalities.filter(m => m.municipality_type === 'District').length
        }
      }
    };
    
    sendSuccess(res, hierarchyData, 'Province hierarchy retrieved successfully');
  })
);

router.get('/hierarchy/district/:districtCode',
  validate({ params: commonSchemas.districtCode }),
  asyncHandler(async (req, res) => {
    const { districtCode } = req.params;
    
    const district = await GeographicModel.getDistrictByCode(districtCode);
    if (!district) {
      throw new NotFoundError(`District with code '${districtCode}' not found`);
    }
    
    const municipalities = await GeographicModel.getMunicipalitiesByDistrict(districtCode);
    
    const hierarchyData = {
      district,
      municipalities,
      summary: {
        totalMunicipalities: municipalities.length,
        municipalityTypes: {
          local: municipalities.filter(m => m.municipality_type === 'Local').length,
          metropolitan: municipalities.filter(m => m.municipality_type === 'Metropolitan').length,
          district: municipalities.filter(m => m.municipality_type === 'District').length
        }
      }
    };
    
    sendSuccess(res, hierarchyData, 'District hierarchy retrieved successfully');
  })
);

router.get('/hierarchy/municipality/:municipalityCode',
  validate({ params: commonSchemas.municipalityCode }),
  asyncHandler(async (req, res) => {
    const { municipalityCode } = req.params;
    
    const municipality = await GeographicModel.getMunicipalityByCode(municipalityCode);
    if (!municipality) {
      throw new NotFoundError(`Municipality with code '${municipalityCode}' not found`);
    }
    
    const wards = await GeographicModel.getWardsByMunicipality(municipalityCode);
    
    const hierarchyData = {
      municipality,
      wards,
      summary: {
        totalWards: wards.length
      }
    };
    
    sendSuccess(res, hierarchyData, 'Municipality hierarchy retrieved successfully');
  })
);

// Summary statistics
router.get('/summary', asyncHandler(async (_req, res) => {
  const [provinces, districts, municipalities] = await Promise.all([
    GeographicModel.getAllProvinces(),
    GeographicModel.getAllDistricts(),
    GeographicModel.getAllMunicipalities()
  ]);
  
  const totalWards = await GeographicModel.getWardsCount();
  
  const summary = {
    totals: {
      provinces: provinces.length,
      districts: districts.length,
      municipalities: municipalities.length,
      wards: totalWards
    },
    municipalityTypes: {
      local: municipalities.filter(m => m.municipality_type === 'Local').length,
      metropolitan: municipalities.filter(m => m.municipality_type === 'Metropolitan').length,
      district: municipalities.filter(m => m.municipality_type === 'District').length
    },
    byProvince: provinces.map(province => ({
      code: province.province_code,
      name: province.province_name,
      districts: districts.filter(d => d.province_code === province.province_code).length,
      municipalities: municipalities.filter(m => m.province_code === province.province_code).length
    }))
  };
  
  sendSuccess(res, summary, 'Geographic summary retrieved successfully');
}));

// Mount voting districts routes
router.use('/voting-districts', votingDistrictsRouter);

export default router;
