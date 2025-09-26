import express from 'express';
import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

const router = express.Router();

// Interface definitions
interface Language {
  language_id: number;
  language_name: string;
  language_code?: string;
}

interface Occupation {
  occupation_id: number;
  occupation_name: string;
  category_id?: number;
}

interface Qualification {
  qualification_id: number;
  qualification_name: string;
  qualification_code?: string;
  level_order: number;
}

/**
 * GET /api/v1/reference/languages
 * Get all available languages
 */
router.get('/languages', async (req, res) => {
  try {
    const query = `
      SELECT 
        language_id,
        language_name,
        language_code
      FROM languages 
      ORDER BY language_name ASC
    `;

    const languages = await executeQuery<Language>(query);
    
    return res.json({
      success: true,
      data: languages,
      message: `Retrieved ${languages.length} languages`
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch languages', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

/**
 * GET /api/v1/reference/occupations
 * Get all available occupations
 */
router.get('/occupations', async (req, res) => {
  try {
    const query = `
      SELECT 
        occupation_id,
        occupation_name,
        category_id
      FROM occupations 
      ORDER BY occupation_name ASC
    `;

    const occupations = await executeQuery<Occupation>(query);
    
    return res.json({
      success: true,
      data: occupations,
      message: `Retrieved ${occupations.length} occupations`
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch occupations', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

/**
 * GET /api/v1/reference/qualifications
 * Get all available qualifications
 */
router.get('/qualifications', async (req, res) => {
  try {
    const query = `
      SELECT 
        qualification_id,
        qualification_name,
        qualification_code,
        level_order
      FROM qualifications 
      ORDER BY level_order ASC, qualification_name ASC
    `;

    const qualifications = await executeQuery<Qualification>(query);
    
    return res.json({
      success: true,
      data: qualifications,
      message: `Retrieved ${qualifications.length} qualifications`
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch qualifications', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

/**
 * GET /api/v1/reference/all
 * Get all reference data in a single request
 */
router.get('/all', async (req, res) => {
  try {
    // Fetch all reference data in parallel
    const [languages, occupations, qualifications] = await Promise.all([
      executeQuery<Language>(`
        SELECT language_id, language_name, language_code
        FROM languages 
        ORDER BY language_name ASC
      `),
      executeQuery<Occupation>(`
        SELECT occupation_id, occupation_name, category_id
        FROM occupations 
        ORDER BY occupation_name ASC
      `),
      executeQuery<Qualification>(`
        SELECT qualification_id, qualification_name, qualification_code, level_order
        FROM qualifications 
        ORDER BY level_order ASC, qualification_name ASC
      `)
    ]);

    return res.json({
      success: true,
      data: {
        languages,
        occupations,
        qualifications
      },
      message: `Retrieved ${languages.length} languages, ${occupations.length} occupations, and ${qualifications.length} qualifications`
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch reference data', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

/**
 * GET /api/v1/reference/languages/:id
 * Get specific language by ID
 */
router.get('/languages/:id', async (req, res) => {
  try {
    const languageId = parseInt(req.params.id);
    
    if (isNaN(languageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language ID'
      });
    }

    const query = `
      SELECT language_id, language_name, language_code
      FROM languages 
      WHERE language_id = ?
    `;

    const languages = await executeQuery<Language>(query, [languageId]);
    
    if (languages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    return res.json({
      success: true,
      data: languages[0],
      message: 'Language retrieved successfully'
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch language', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

/**
 * GET /api/v1/reference/occupations/:id
 * Get specific occupation by ID
 */
router.get('/occupations/:id', async (req, res) => {
  try {
    const occupationId = parseInt(req.params.id);
    
    if (isNaN(occupationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid occupation ID'
      });
    }

    const query = `
      SELECT occupation_id, occupation_name, category_id
      FROM occupations 
      WHERE occupation_id = ?
    `;

    const occupations = await executeQuery<Occupation>(query, [occupationId]);
    
    if (occupations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Occupation not found'
      });
    }

    return res.json({
      success: true,
      data: occupations[0],
      message: 'Occupation retrieved successfully'
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch occupation', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

/**
 * GET /api/v1/reference/qualifications/:id
 * Get specific qualification by ID
 */
router.get('/qualifications/:id', async (req, res) => {
  try {
    const qualificationId = parseInt(req.params.id);
    
    if (isNaN(qualificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid qualification ID'
      });
    }

    const query = `
      SELECT qualification_id, qualification_name, qualification_code, level_order
      FROM qualifications 
      WHERE qualification_id = ?
    `;

    const qualifications = await executeQuery<Qualification>(query, [qualificationId]);
    
    if (qualifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Qualification not found'
      });
    }

    return res.json({
      success: true,
      data: qualifications[0],
      message: 'Qualification retrieved successfully'
    });
  } catch (error) {
    const dbError = createDatabaseError('Failed to fetch qualification', error);
    return res.status(500).json({
      success: false,
      message: dbError.message,
      error: process.env.NODE_ENV === 'development' ? dbError.details : undefined
    });
  }
});

export default router;
