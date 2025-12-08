import { Router, Request, Response } from 'express';
import { WebSocketService } from '../services/websocketService';
import { asyncHandler, sendSuccess, ValidationError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();

/**
 * Internal API for Python scripts to send WebSocket notifications
 * This endpoint is NOT authenticated - it's for internal use only
 * In production, you should restrict this to localhost or use an internal API key
 */

const notifySchema = Joi.object({
  event: Joi.string().valid('bulk_upload_progress', 'bulk_upload_complete', 'bulk_upload_error').required(),
  file_id: Joi.number().integer().positive().required(),
  data: Joi.object().required()
});

/**
 * POST /api/v1/internal/websocket/notify
 * Send WebSocket notification from Python scripts
 */
router.post('/websocket/notify',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { error, value } = notifySchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { event, file_id, data } = value;

    // Send WebSocket notification based on event type
    switch (event) {
      case 'bulk_upload_progress':
        WebSocketService.sendBulkUploadProgress(file_id, data);
        break;
      
      case 'bulk_upload_complete':
        WebSocketService.sendBulkUploadComplete(file_id, data);
        break;
      
      case 'bulk_upload_error':
        WebSocketService.sendBulkUploadError(file_id, data.error);
        break;
      
      default:
        throw new ValidationError('Invalid event type');
    }

    sendSuccess(res, { notified: true }, 'WebSocket notification sent');
  })
);

export default router;

