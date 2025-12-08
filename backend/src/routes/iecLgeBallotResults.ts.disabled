/**
 * IEC LGE Ballot Results Routes
 * API endpoints for Local Government Election ballot results
 */

import { Router, Request, Response } from 'express';
import { IecLgeBallotResultsService } from '../services/iecLgeBallotResultsService';
import { IecGeographicMappingService } from '../services/iecGeographicMappingService';

const router = Router();
const ballotResultsService = new IecLgeBallotResultsService();
const mappingService = new IecGeographicMappingService();

/**
 * GET /api/v1/lge-ballot-results/province/:provinceCode
 * Get LGE ballot results for a specific province
 */
router.get('/province/:provinceCode', async (req: Request, res: Response) => {
  try {
    const { provinceCode } = req.params;
    
    console.log(`📊 API Request: LGE ballot results for province ${provinceCode}`);

    // Validate province code
    if (!provinceCode || provinceCode.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid province code. Must be 2 characters (e.g., LP, KZN)',
        code: 'INVALID_PROVINCE_CODE'
      });
    }

    const results = await ballotResultsService.getBallotResultsByProvinceCode(provinceCode.toUpperCase());

    res.json({
      success: true,
      data: {
        province_code: provinceCode.toUpperCase(),
        results_count: results.length,
        ballot_results: results
      },
      metadata: {
        request_type: 'province',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in province ballot results endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'PROVINCE_BALLOT_RESULTS_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/municipality/:municipalityCode
 * Get LGE ballot results for a specific municipality
 */
router.get('/municipality/:municipalityCode', async (req: Request, res: Response) => {
  try {
    const { municipalityCode } = req.params;
    
    console.log(`📊 API Request: LGE ballot results for municipality ${municipalityCode}`);

    // Validate municipality code
    if (!municipalityCode || municipalityCode.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid municipality code',
        code: 'INVALID_MUNICIPALITY_CODE'
      });
    }

    const results = await ballotResultsService.getBallotResultsByMunicipalityCode(municipalityCode.toUpperCase());

    res.json({
      success: true,
      data: {
        municipality_code: municipalityCode.toUpperCase(),
        results_count: results.length,
        ballot_results: results
      },
      metadata: {
        request_type: 'municipality',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in municipality ballot results endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'MUNICIPALITY_BALLOT_RESULTS_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/ward/:wardCode
 * Get LGE ballot results for a specific ward
 */
router.get('/ward/:wardCode', async (req: Request, res: Response) => {
  try {
    const { wardCode } = req.params;
    
    console.log(`📊 API Request: LGE ballot results for ward ${wardCode}`);

    // Validate ward code
    if (!wardCode || wardCode.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ward code',
        code: 'INVALID_WARD_CODE'
      });
    }

    const results = await ballotResultsService.getBallotResultsByWardCode(wardCode);

    res.json({
      success: true,
      data: {
        ward_code: wardCode,
        results_count: results.length,
        ballot_results: results
      },
      metadata: {
        request_type: 'ward',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in ward ballot results endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'WARD_BALLOT_RESULTS_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/statistics
 * Get ballot results statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    console.log('📊 API Request: LGE ballot results statistics');

    const stats = await ballotResultsService.getBallotResultsStatistics();

    res.json({
      success: true,
      data: stats,
      metadata: {
        request_type: 'statistics',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in ballot results statistics endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'BALLOT_RESULTS_STATISTICS_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/mappings/discover
 * Discover and populate IEC geographic ID mappings
 */
router.post('/mappings/discover', async (req: Request, res: Response) => {
  try {
    console.log('🔍 API Request: Discover IEC geographic mappings');

    const results = await mappingService.discoverAndPopulateAllMappings();

    res.json({
      success: true,
      data: {
        discovery_results: results,
        message: 'Geographic ID discovery completed'
      },
      metadata: {
        request_type: 'mapping_discovery',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in mapping discovery endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'MAPPING_DISCOVERY_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/mappings/statistics
 * Get mapping statistics
 */
router.get('/mappings/statistics', async (req: Request, res: Response) => {
  try {
    console.log('📊 API Request: Mapping statistics');

    const stats = await mappingService.getMappingStatistics();

    res.json({
      success: true,
      data: stats,
      metadata: {
        request_type: 'mapping_statistics',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in mapping statistics endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'MAPPING_STATISTICS_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/mappings/province/:provinceCode
 * Get IEC Province ID for a province code
 */
router.get('/mappings/province/:provinceCode', async (req: Request, res: Response) => {
  try {
    const { provinceCode } = req.params;
    
    console.log(`🔍 API Request: IEC Province ID for ${provinceCode}`);

    const iecProvinceId = await mappingService.getIecProvinceId(provinceCode.toUpperCase());

    if (iecProvinceId === null) {
      return res.status(404).json({
        success: false,
        error: `No IEC Province ID mapping found for province code: ${provinceCode}`,
        code: 'PROVINCE_MAPPING_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        province_code: provinceCode.toUpperCase(),
        iec_province_id: iecProvinceId
      },
      metadata: {
        request_type: 'province_mapping',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in province mapping endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'PROVINCE_MAPPING_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/mappings/municipality/:municipalityCode
 * Get IEC Municipality ID for a municipality code
 */
router.get('/mappings/municipality/:municipalityCode', async (req: Request, res: Response) => {
  try {
    const { municipalityCode } = req.params;
    
    console.log(`🔍 API Request: IEC Municipality ID for ${municipalityCode}`);

    const iecMunicipalityId = await mappingService.getIecMunicipalityId(municipalityCode.toUpperCase());

    if (iecMunicipalityId === null) {
      return res.status(404).json({
        success: false,
        error: `No IEC Municipality ID mapping found for municipality code: ${municipalityCode}`,
        code: 'MUNICIPALITY_MAPPING_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        municipality_code: municipalityCode.toUpperCase(),
        iec_municipality_id: iecMunicipalityId
      },
      metadata: {
        request_type: 'municipality_mapping',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in municipality mapping endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'MUNICIPALITY_MAPPING_ERROR'
    });
  }
});

/**
 * GET /api/v1/lge-ballot-results/mappings/ward/:wardCode
 * Get IEC Ward ID for a ward code
 */
router.get('/mappings/ward/:wardCode', async (req: Request, res: Response) => {
  try {
    const { wardCode } = req.params;
    
    console.log(`🔍 API Request: IEC Ward ID for ${wardCode}`);

    const iecWardId = await mappingService.getIecWardId(wardCode);

    if (iecWardId === null) {
      return res.status(404).json({
        success: false,
        error: `No IEC Ward ID mapping found for ward code: ${wardCode}`,
        code: 'WARD_MAPPING_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        ward_code: wardCode,
        iec_ward_id: iecWardId
      },
      metadata: {
        request_type: 'ward_mapping',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in ward mapping endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'WARD_MAPPING_ERROR'
    });
  }
});

export default router;
