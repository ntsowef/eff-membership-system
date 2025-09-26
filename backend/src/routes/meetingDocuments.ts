import { Router, Request, Response, NextFunction } from 'express';
import { MeetingDocumentModel } from '../models/meetingDocuments';
import { ValidationError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();

// Validation schemas for meeting documents
const createDocumentSchema = Joi.object({
  meeting_id: Joi.number().integer().positive().required(),
  document_type: Joi.string().valid('agenda', 'minutes', 'action_items', 'attendance', 'other').required(),
  document_title: Joi.string().min(1).max(200).required(),
  document_content: Joi.object().required(),
  template_id: Joi.number().integer().positive().optional(),
  document_status: Joi.string().valid('draft', 'review', 'approved', 'published').default('draft')
});

const createActionItemSchema = Joi.object({
  meeting_id: Joi.number().integer().positive().required(),
  document_id: Joi.number().integer().positive().optional(),
  action_title: Joi.string().min(1).max(200).required(),
  action_description: Joi.string().optional(),
  assigned_to: Joi.number().integer().positive().optional(),
  assigned_role: Joi.string().max(100).optional(),
  due_date: Joi.date().optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
});

const createDecisionSchema = Joi.object({
  meeting_id: Joi.number().integer().positive().required(),
  document_id: Joi.number().integer().positive().optional(),
  decision_title: Joi.string().min(1).max(200).required(),
  decision_description: Joi.string().required(),
  decision_type: Joi.string().valid('resolution', 'motion', 'policy', 'appointment', 'other').required(),
  voting_result: Joi.object().optional(),
  decision_status: Joi.string().valid('proposed', 'approved', 'rejected', 'deferred').required(),
  proposed_by: Joi.number().integer().positive().optional(),
  seconded_by: Joi.number().integer().positive().optional()
});

/**
 * Get document templates
 * GET /meeting-documents/templates
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      template_type: req.query.template_type as string,
      hierarchy_level: req.query.hierarchy_level as string,
      meeting_type_id: req.query.meeting_type_id ? parseInt(req.query.meeting_type_id as string) : undefined,
      is_active: req.query.is_active ? req.query.is_active === 'true' : undefined
    };

    const templates = await MeetingDocumentModel.getTemplates(filters);

    res.json({
      success: true,
      message: 'Document templates retrieved successfully',
      data: {
        templates,
        total: templates.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get template by ID
 * GET /meeting-documents/templates/:id
 */
router.get('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      throw new ValidationError('Invalid template ID');
    }

    const template = await MeetingDocumentModel.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Document template not found',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'Document template retrieved successfully',
      data: { template },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Create meeting document
 * POST /meeting-documents
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createDocumentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const documentData = {
      ...value,
      created_by: 1 // TODO: Get from authenticated user
    };

    const documentId = await MeetingDocumentModel.createDocument(documentData);

    res.status(201).json({
      success: true,
      message: 'Meeting document created successfully',
      data: {
        document_id: documentId,
        document_type: value.document_type,
        document_title: value.document_title
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get single document by ID
 * GET /meeting-documents/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID');
    }

    const document = await MeetingDocumentModel.getDocumentById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        }
      });
    }

    return res.json({
      success: true,
      message: 'Document retrieved successfully',
      data: {
        document
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get documents by meeting ID
 * GET /meeting-documents/meeting/:meetingId
 */
router.get('/meeting/:meetingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const documents = await MeetingDocumentModel.getDocumentsByMeeting(meetingId);

    res.json({
      success: true,
      message: 'Meeting documents retrieved successfully',
      data: {
        meeting_id: meetingId,
        documents,
        total: documents.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update meeting document
 * PUT /meeting-documents/:id
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      throw new ValidationError('Invalid document ID');
    }

    const allowedUpdates = ['document_title', 'document_content', 'document_status', 'approved_by', 'approved_at'];
    const updates: any = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    await MeetingDocumentModel.updateDocument(documentId, updates);

    res.json({
      success: true,
      message: 'Meeting document updated successfully',
      data: { document_id: documentId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create action item
 * POST /meeting-documents/action-items
 */
router.post('/action-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createActionItemSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const actionData = {
      ...value,
      created_by: 1 // TODO: Get from authenticated user
    };

    const actionId = await MeetingDocumentModel.createActionItem(actionData);

    res.status(201).json({
      success: true,
      message: 'Action item created successfully',
      data: {
        action_id: actionId,
        action_title: value.action_title
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get action items by meeting ID
 * GET /meeting-documents/action-items/meeting/:meetingId
 */
router.get('/action-items/meeting/:meetingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const actionItems = await MeetingDocumentModel.getActionItemsByMeeting(meetingId);

    res.json({
      success: true,
      message: 'Action items retrieved successfully',
      data: {
        meeting_id: meetingId,
        action_items: actionItems,
        total: actionItems.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create meeting decision
 * POST /meeting-documents/decisions
 */
router.post('/decisions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createDecisionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const decisionData = {
      ...value,
      created_by: 1 // TODO: Get from authenticated user
    };

    const decisionId = await MeetingDocumentModel.createDecision(decisionData);

    res.status(201).json({
      success: true,
      message: 'Meeting decision created successfully',
      data: {
        decision_id: decisionId,
        decision_title: value.decision_title
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get decisions by meeting ID
 * GET /meeting-documents/decisions/meeting/:meetingId
 */
router.get('/decisions/meeting/:meetingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const decisions = await MeetingDocumentModel.getDecisionsByMeeting(meetingId);

    res.json({
      success: true,
      message: 'Meeting decisions retrieved successfully',
      data: {
        meeting_id: meetingId,
        decisions,
        total: decisions.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
