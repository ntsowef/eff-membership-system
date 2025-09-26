import { Router, Request, Response, NextFunction } from 'express';
import { SessionManagementService } from '../services/sessionManagementService';
import { asyncHandler, sendSuccess, ValidationError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const extendSessionSchema = Joi.object({
  session_id: Joi.string().required()
});

// Get current session status
router.get('/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const status = await SessionManagementService.getSessionStatus(sessionId);
    
    sendSuccess(res, status, 'Session status retrieved successfully');
  })
);

// Check if session needs warning
router.get('/warning',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const warning = await SessionManagementService.checkSessionWarning(sessionId);
    
    sendSuccess(res, warning, 'Session warning status retrieved successfully');
  })
);

// Extend session
router.post('/extend',
  authenticate,
  validate({ body: extendSessionSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { session_id } = req.body;
    
    const result = await SessionManagementService.extendSession(session_id);
    
    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to extend session');
    }

    sendSuccess(res, {
      extended: true,
      new_expiry: result.newExpiryTime,
      message: 'Session extended successfully'
    }, 'Session extended successfully');
  })
);

// Get user's active sessions
router.get('/active',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    const sessions = await SessionManagementService.getUserActiveSessions(userId);
    
    sendSuccess(res, { sessions }, 'Active sessions retrieved successfully');
  })
);

// Terminate specific session
router.delete('/:sessionId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    
    const result = await SessionManagementService.terminateUserSession(sessionId, userId);

    if (!result.success) {
      throw new ValidationError('Failed to terminate session');
    }

    sendSuccess(res, { terminated: true }, 'Session terminated successfully');
  })
);

// Terminate all other sessions (keep current)
router.post('/terminate-others',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const currentSessionId = req.headers['x-session-id'] as string;
    
    if (!currentSessionId) {
      throw new ValidationError('Current session ID is required');
    }

    const result = await SessionManagementService.terminateAllOtherUserSessions(userId, currentSessionId);
    
    sendSuccess(res, { 
      terminated: result.terminated_count,
      message: `Terminated ${result.terminated_count} other sessions`
    }, 'Other sessions terminated successfully');
  })
);

export default router;
