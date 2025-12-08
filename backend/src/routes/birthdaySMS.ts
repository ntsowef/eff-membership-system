import { Router, Request, Response } from 'express';
import BirthdaySMSService from '../services/birthdaySMSService';
import BirthdayScheduler from '../services/birthdayScheduler';
import { executeQuery } from '../config/database';
import { authenticate, requireSMSPermission } from '../middleware/auth';

const router = Router();

// Get birthday SMS configuration
router.get('/config', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await BirthdaySMSService.getBirthdayConfig();
    
    res.json({
      success: true,
      data: { config }
    });
  } catch (error: any) {
    console.error('Failed to get birthday SMS config:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve birthday SMS configuration',
        details: error.message
      }
    });
  }
});

// Get today's birthdays
router.get('/todays-birthdays', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const birthdays = await BirthdaySMSService.getTodaysBirthdays();
    
    res.json({
      success: true,
      data: {
        birthdays,
        count: birthdays.length
      }
    });
  } catch (error: any) {
    console.error('Failed to get today\'s birthdays:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve today\'s birthdays',
        details: error.message
      }
    });
  }
});

// Get upcoming birthdays
router.get('/upcoming-birthdays', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const birthdays = await BirthdaySMSService.getUpcomingBirthdays(days);
    
    res.json({
      success: true,
      data: {
        birthdays,
        count: birthdays.length,
        days_ahead: days
      }
    });
  } catch (error: any) {
    console.error('Failed to get upcoming birthdays:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve upcoming birthdays',
        details: error.message
      }
    });
  }
});

// Queue today's birthday messages
router.post('/queue-todays-messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await BirthdaySMSService.queueTodaysBirthdayMessages();
    
    res.json({
      success: true,
      data: {
        message: 'Birthday messages queued successfully',
        ...result
      }
    });
  } catch (error: any) {
    console.error('Failed to queue birthday messages:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to queue birthday messages',
        details: error.message
      }
    });
  }
});

// Process queued birthday messages
router.post('/process-queue', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.body.limit as string) || 50;
    const result = await BirthdaySMSService.processQueuedMessages(limit);
    
    res.json({
      success: true,
      data: {
        message: 'Queued birthday messages processed',
        ...result
      }
    });
  } catch (error: any) {
    console.error('Failed to process queued messages:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process queued birthday messages',
        details: error.message
      }
    });
  }
});

// Send manual birthday message
router.post('/send-manual/:memberId', async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId);
    const result = await BirthdaySMSService.sendBirthdayMessage(memberId);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          message: result.message,
          messageId: result.messageId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: result.error
        }
      });
    }
  } catch (error: any) {
    console.error('Failed to send manual birthday message:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send birthday message',
        details: error.message
      }
    });
  }
});

// Get birthday statistics
router.get('/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await BirthdaySMSService.getBirthdayStatistics();
    
    res.json({
      success: true,
      data: { statistics: stats }
    });
  } catch (error: any) {
    console.error('Failed to get birthday statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve birthday statistics',
        details: error.message
      }
    });
  }
});

// Get birthday message history
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM birthday_messages_sent
    `);
    const countData = Array.isArray(countResult) ? countResult : countResult[0] || [];
    const total = countData[0]?.total || 0;

    // Get history records
    const historyResult = await executeQuery(`
      SELECT * FROM birthday_messages_sent
      ORDER BY sent_at DESC, created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const history = Array.isArray(historyResult) ? historyResult : historyResult[0] || [];

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get birthday message history:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve birthday message history',
        details: error.message
      }
    });
  }
});

// Get birthday queue status
router.get('/queue-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const statusResult = await executeQuery(`
      SELECT
        status,
        COUNT(*) as count,
        MIN(scheduled_at) as earliest_date,
        MAX(scheduled_at) as latest_date
      FROM sms_queue
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'Pending' THEN 1
          WHEN 'Processing' THEN 2
          WHEN 'Completed' THEN 3
          WHEN 'Failed' THEN 4
          WHEN 'Cancelled' THEN 5
        END
    `);

    const queueStatus = Array.isArray(statusResult) ? statusResult : statusResult[0] || [];

    // Get recent queue items
    const recentResult = await executeQuery(`
      SELECT * FROM sms_queue
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const recentItems = Array.isArray(recentResult) ? recentResult : recentResult[0] || [];

    res.json({
      success: true,
      data: {
        queue_status: queueStatus,
        recent_items: recentItems
      }
    });
  } catch (error: any) {
    console.error('Failed to get queue status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve queue status',
        details: error.message
      }
    });
  }
});

// Update birthday SMS configuration
router.put('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      is_enabled,
      template_id,
      send_time,
      timezone,
      include_age,
      include_organization_name,
      max_daily_sends
    } = req.body;

    const updateResult = await executeQuery(`
      UPDATE birthday_sms_config
      SET
        is_enabled = COALESCE(?, is_enabled),
        template_id = COALESCE(?, template_id),
        send_time = COALESCE(?, send_time),
        timezone = COALESCE(?, timezone),
        include_age = COALESCE(?, include_age),
        include_organization_name = COALESCE(?, include_organization_name),
        max_daily_sends = COALESCE(?, max_daily_sends),
        updated_at = NOW()
      WHERE id = (SELECT id FROM (SELECT id FROM birthday_sms_config ORDER BY created_at DESC LIMIT 1) as temp)
    `, [
      is_enabled ?? null,
      template_id ?? null,
      send_time ?? null,
      timezone ?? null,
      include_age ?? null,
      include_organization_name ?? null,
      max_daily_sends ?? null
    ]);

    const result = Array.isArray(updateResult) ? updateResult[0] : updateResult;
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        data: {
          message: 'Birthday SMS configuration updated successfully'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          message: 'Birthday SMS configuration not found'
        }
      });
    }
  } catch (error: any) {
    console.error('Failed to update birthday SMS config:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update birthday SMS configuration',
        details: error.message
      }
    });
  }
});

// Scheduler control endpoints

// Get scheduler status
router.get('/scheduler/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = BirthdayScheduler.getStatus();

    res.json({
      success: true,
      data: { scheduler_status: status }
    });
  } catch (error: any) {
    console.error('Failed to get scheduler status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get scheduler status',
        details: error.message
      }
    });
  }
});

// Start scheduler
router.post('/scheduler/start', async (req: Request, res: Response): Promise<void> => {
  try {
    BirthdayScheduler.start();

    res.json({
      success: true,
      data: {
        message: 'Birthday SMS scheduler started successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to start scheduler:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to start scheduler',
        details: error.message
      }
    });
  }
});

// Stop scheduler
router.post('/scheduler/stop', async (req: Request, res: Response): Promise<void> => {
  try {
    BirthdayScheduler.stop();

    res.json({
      success: true,
      data: {
        message: 'Birthday SMS scheduler stopped successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to stop scheduler:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to stop scheduler',
        details: error.message
      }
    });
  }
});

// Run birthday workflow immediately
router.post('/scheduler/run-now', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await BirthdayScheduler.runImmediately();

    res.json({
      success: true,
      data: {
        message: 'Birthday workflow executed successfully',
        ...result
      }
    });
  } catch (error: any) {
    console.error('Failed to run birthday workflow:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to run birthday workflow',
        details: error.message
      }
    });
  }
});

export default router;
