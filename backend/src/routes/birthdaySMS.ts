import { Router, Request, Response } from 'express';
import BirthdaySMSService from '../services/birthdaySMSService';
import BirthdayScheduler from '../services/birthdayScheduler';
import BirthdayReportService from '../services/birthdayReportService';
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
      ORDER BY sent_at DESC
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
        MIN(scheduled_for) as earliest_date,
        MAX(scheduled_for) as latest_date
      FROM birthday_sms_queue 
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'queued' THEN 1 
          WHEN 'processing' THEN 2 
          WHEN 'completed' THEN 3 
          WHEN 'failed' THEN 4 
          WHEN 'cancelled' THEN 5 
        END
    `);

    const queueStatus = Array.isArray(statusResult) ? statusResult : statusResult[0] || [];

    // Get recent queue items
    const recentResult = await executeQuery(`
      SELECT * FROM birthday_sms_queue 
      ORDER BY queued_at DESC 
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

// ============================================================================
// MONTHLY BIRTHDAY STATISTICS ENDPOINTS
// ============================================================================

// Get monthly birthday statistics for active/good standing members
router.get('/monthly-stats', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Monthly Stats API] Request received');
    // Query the view for monthly statistics
    // Note: executeQuery returns an array directly, not { rows: [] }
    const rows = await executeQuery(`
      SELECT
        birth_month,
        month_name,
        total_birthdays::INTEGER,
        good_standing_count::INTEGER,
        sms_eligible_count::INTEGER,
        not_good_standing_count::INTEGER,
        no_phone_count::INTEGER,
        good_standing_percentage::FLOAT,
        sms_eligible_percentage::FLOAT
      FROM vw_birthday_monthly_stats
      ORDER BY birth_month
    `);
    console.log('[Monthly Stats API] Query returned', rows.length, 'rows');

    // Calculate totals
    const totals = {
      total_birthdays: 0,
      good_standing_count: 0,
      sms_eligible_count: 0,
      not_good_standing_count: 0,
      no_phone_count: 0
    };

    rows.forEach((row: any) => {
      totals.total_birthdays += row.total_birthdays;
      totals.good_standing_count += row.good_standing_count;
      totals.sms_eligible_count += row.sms_eligible_count;
      totals.not_good_standing_count += row.not_good_standing_count;
      totals.no_phone_count += row.no_phone_count;
    });

    res.json({
      success: true,
      data: {
        monthly_stats: rows,
        totals: {
          ...totals,
          good_standing_percentage: totals.total_birthdays > 0
            ? Math.round((totals.good_standing_count / totals.total_birthdays) * 10000) / 100
            : 0,
          sms_eligible_percentage: totals.total_birthdays > 0
            ? Math.round((totals.sms_eligible_count / totals.total_birthdays) * 10000) / 100
            : 0
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get monthly birthday stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve monthly birthday statistics',
        details: error.message
      }
    });
  }
});

// Get active members with birthdays in current month
router.get('/current-month-birthdays', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get total count - executeQuery returns array directly
    const countRows = await executeQuery(`
      SELECT COUNT(*) as total FROM vw_birthday_active_members_current_month
    `);
    const total = parseInt(countRows[0].total);

    // Get paginated results - executeQuery returns array directly
    const members = await executeQuery(`
      SELECT
        member_id,
        membership_number,
        firstname,
        surname,
        full_name,
        cell_number,
        date_of_birth,
        birth_day,
        current_age,
        province_code,
        province_name,
        municipality_name,
        ward_code,
        membership_status,
        expiry_date,
        message_sent_this_year
      FROM vw_birthday_active_members_current_month
      ORDER BY birth_day, firstname, surname
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        month: currentMonth,
        year: currentYear
      }
    });
  } catch (error: any) {
    console.error('Failed to get current month birthdays:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve current month birthdays',
        details: error.message
      }
    });
  }
});

// Get birthday statistics for a specific month
router.get('/monthly-stats/:month', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const month = parseInt(req.params.month);
    if (isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid month parameter. Must be between 1 and 12.'
        }
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get monthly stat summary - executeQuery returns array directly
    const statsRows = await executeQuery(`
      SELECT
        birth_month,
        month_name,
        total_birthdays::INTEGER,
        good_standing_count::INTEGER,
        sms_eligible_count::INTEGER,
        not_good_standing_count::INTEGER,
        no_phone_count::INTEGER,
        good_standing_percentage::FLOAT,
        sms_eligible_percentage::FLOAT
      FROM vw_birthday_monthly_stats
      WHERE birth_month = $1
    `, [month]);

    if (statsRows.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'No statistics found for the specified month'
        }
      });
      return;
    }

    // Get member list for that month (good standing only) - executeQuery returns array directly
    const countRows = await executeQuery(`
      SELECT COUNT(*) as total
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE EXTRACT(MONTH FROM m.date_of_birth) = $1
        AND m.date_of_birth IS NOT NULL
        AND mst.is_active = true
        AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
        AND m.cell_number IS NOT NULL
        AND m.cell_number != ''
        AND LENGTH(TRIM(m.cell_number)) >= 10
    `, [month]);
    const total = parseInt(countRows[0].total);

    const members = await executeQuery(`
      SELECT
        m.member_id,
        COALESCE(m.membership_number, 'MEM' || LPAD(m.member_id::TEXT, 6, '0')) AS membership_number,
        m.firstname,
        m.surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
        m.cell_number,
        m.date_of_birth,
        EXTRACT(DAY FROM m.date_of_birth)::INTEGER AS birth_day,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::INTEGER AS current_age,
        m.province_code,
        m.province_name,
        m.municipality_name,
        m.ward_code,
        COALESCE(mst.status_name, 'Unknown') AS membership_status,
        m.expiry_date
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE EXTRACT(MONTH FROM m.date_of_birth) = $1
        AND m.date_of_birth IS NOT NULL
        AND mst.is_active = true
        AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
        AND m.cell_number IS NOT NULL
        AND m.cell_number != ''
        AND LENGTH(TRIM(m.cell_number)) >= 10
      ORDER BY EXTRACT(DAY FROM m.date_of_birth), m.firstname, m.surname
      LIMIT $2 OFFSET $3
    `, [month, limit, offset]);

    res.json({
      success: true,
      data: {
        stats: statsRows[0],
        members,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get monthly birthday stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve monthly birthday statistics',
        details: error.message
      }
    });
  }
});

// =============================================================================
// DELIVERY TRACKING ENDPOINTS
// =============================================================================

// Get birthday SMS delivery report with filtering
router.get('/delivery-report', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Filter parameters
    const status = req.query.status as string;
    const month = req.query.month ? parseInt(req.query.month as string) : null;
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`bms.delivery_status = $${paramIndex++}`);
      params.push(status);
    }

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM bms.sent_at) = $${paramIndex++}`);
      params.push(month);
    }

    if (year) {
      conditions.push(`bms.birthday_year = $${paramIndex++}`);
      params.push(year);
    }

    if (startDate) {
      conditions.push(`bms.sent_at >= $${paramIndex++}::timestamp`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`bms.sent_at <= $${paramIndex++}::timestamp + INTERVAL '1 day'`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM birthday_messages_sent bms
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0');

    // Get delivery report records with optional join to sms_delivery_tracking for more details
    const dataQuery = `
      SELECT
        bms.id,
        bms.member_id,
        bms.membership_number,
        bms.member_name,
        bms.phone_number,
        bms.message_text,
        bms.sms_message_id,
        bms.delivery_status,
        bms.sent_at,
        bms.delivered_at,
        bms.error_message,
        bms.birthday_year,
        bms.member_age,
        sdt.provider_name,
        sdt.provider_message_id,
        sdt.retry_count,
        sdt.cost,
        sdt.delivery_timestamp as tracking_delivery_timestamp
      FROM birthday_messages_sent bms
      LEFT JOIN sms_delivery_tracking sdt ON bms.sms_message_id = sdt.message_id
      ${whereClause}
      ORDER BY bms.sent_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataParams = [...params, limit, offset];
    const records = await executeQuery(dataQuery, dataParams);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        filters: {
          status: status || 'all',
          month,
          year,
          startDate,
          endDate
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to get delivery report:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve delivery report',
        details: error.message
      }
    });
  }
});

// Get birthday SMS delivery statistics summary
router.get('/delivery-stats', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const timeframe = req.query.timeframe as string || 'month';
    const month = req.query.month ? parseInt(req.query.month as string) : null;
    const year = req.query.year ? parseInt(req.query.year as string) : null;

    // Build time condition
    let timeCondition = '';
    const params: any[] = [];
    let paramIndex = 1;

    switch (timeframe) {
      case 'today':
        timeCondition = 'sent_at >= CURRENT_DATE';
        break;
      case 'week':
        timeCondition = "sent_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        timeCondition = "sent_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        timeCondition = "sent_at >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      case 'all':
        timeCondition = '1=1';
        break;
      default:
        timeCondition = "sent_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    // Add month/year filter if provided
    const conditions: string[] = [timeCondition];

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM sent_at) = $${paramIndex++}`);
      params.push(month);
    }

    if (year) {
      conditions.push(`birthday_year = $${paramIndex++}`);
      params.push(year);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get overall statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_messages,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN delivery_status IN ('pending', 'queued', 'sending', 'sent') THEN 1 ELSE 0 END) as pending,
        ROUND(
          (SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) as delivery_rate
      FROM birthday_messages_sent
      ${whereClause}
    `;

    const statsResult = await executeQuery(statsQuery, params);
    const stats = statsResult[0] || {
      total_messages: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      delivery_rate: 0
    };

    // Get daily breakdown for the last 7 days
    const dailyQuery = `
      SELECT
        DATE(sent_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN delivery_status IN ('pending', 'queued', 'sending', 'sent') THEN 1 ELSE 0 END) as pending
      FROM birthday_messages_sent
      WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(sent_at)
      ORDER BY DATE(sent_at) DESC
    `;

    const dailyBreakdown = await executeQuery(dailyQuery);

    // Get status breakdown
    const statusQuery = `
      SELECT
        delivery_status as status,
        COUNT(*) as count
      FROM birthday_messages_sent
      ${whereClause}
      GROUP BY delivery_status
      ORDER BY count DESC
    `;

    const statusBreakdown = await executeQuery(statusQuery, params);

    res.json({
      success: true,
      data: {
        summary: {
          total_messages: parseInt(stats.total_messages) || 0,
          delivered: parseInt(stats.delivered) || 0,
          failed: parseInt(stats.failed) || 0,
          pending: parseInt(stats.pending) || 0,
          delivery_rate: parseFloat(stats.delivery_rate) || 0
        },
        daily_breakdown: dailyBreakdown,
        status_breakdown: statusBreakdown,
        timeframe,
        filters: { month, year }
      }
    });
  } catch (error: any) {
    console.error('Failed to get delivery stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve delivery statistics',
        details: error.message
      }
    });
  }
});

// Export birthday SMS delivery report to Excel
router.get('/delivery-report/export', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    // Filter parameters
    const status = req.query.status as string;
    const month = req.query.month ? parseInt(req.query.month as string) : null;
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = req.query.format as string || 'json'; // 'json' or 'csv'

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`bms.delivery_status = $${paramIndex++}`);
      params.push(status);
    }

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM bms.sent_at) = $${paramIndex++}`);
      params.push(month);
    }

    if (year) {
      conditions.push(`bms.birthday_year = $${paramIndex++}`);
      params.push(year);
    }

    if (startDate) {
      conditions.push(`bms.sent_at >= $${paramIndex++}::timestamp`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`bms.sent_at <= $${paramIndex++}::timestamp + INTERVAL '1 day'`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get all records (no pagination for export)
    const dataQuery = `
      SELECT
        bms.id,
        bms.membership_number,
        bms.member_name,
        bms.phone_number,
        bms.message_text,
        bms.sms_message_id,
        bms.delivery_status,
        bms.sent_at,
        bms.delivered_at,
        bms.error_message,
        bms.birthday_year,
        bms.member_age,
        sdt.provider_name,
        sdt.retry_count
      FROM birthday_messages_sent bms
      LEFT JOIN sms_delivery_tracking sdt ON bms.sms_message_id = sdt.message_id
      ${whereClause}
      ORDER BY bms.sent_at DESC
      LIMIT 100000
    `;

    const records = await executeQuery(dataQuery, params);

    // Format data for export
    const exportData = records.map((record: any) => ({
      'Member Name': record.member_name || '',
      'Membership Number': record.membership_number || '',
      'Phone Number': record.phone_number || '',
      'Message Content': record.message_text || '',
      'Message ID': record.sms_message_id || '',
      'Delivery Status': record.delivery_status || 'unknown',
      'Sent At': record.sent_at ? new Date(record.sent_at).toLocaleString() : '',
      'Delivered At': record.delivered_at ? new Date(record.delivered_at).toLocaleString() : '',
      'Error Message': record.error_message || '',
      'Birthday Year': record.birthday_year || '',
      'Member Age': record.member_age || '',
      'Provider': record.provider_name || '',
      'Retry Count': record.retry_count || 0
    }));

    if (format === 'csv') {
      // Generate CSV
      if (exportData.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="birthday_sms_delivery_report.csv"');
        res.send('No data found');
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map((row: any) =>
          headers.map(header => {
            const value = String(row[header] || '');
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="birthday_sms_delivery_report.csv"');
      res.send(csvRows.join('\n'));
    } else {
      // Return JSON for frontend to convert to Excel
      res.json({
        success: true,
        data: {
          records: exportData,
          total: exportData.length,
          filters: { status, month, year, startDate, endDate },
          exportedAt: new Date().toISOString()
        }
      });
    }
  } catch (error: any) {
    console.error('Failed to export delivery report:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export delivery report',
        details: error.message
      }
    });
  }
});

// ==========================================
// BIRTHDAY MONTHLY REPORT ENDPOINTS
// ==========================================

// Get monthly birthday report summary only (fast - for initial load)
router.get('/monthly-report/summary', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { province_code, municipality_code, municipality_name } = req.query;

    const filters = {
      province_code: province_code as string | undefined,
      municipality_code: municipality_code as string | undefined,
      municipality_name: municipality_name as string | undefined
    };

    const report = await BirthdayReportService.getMonthlyBirthdayReportSummary(filters);

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Failed to get monthly birthday report summary:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve monthly birthday report summary',
        details: error.message
      }
    });
  }
});

// Get paginated members for a specific category
router.get('/monthly-report/category', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { province_code, municipality_code, municipality_name, category, page, limit } = req.query;

    if (!category) {
      res.status(400).json({
        success: false,
        error: { message: 'Category parameter is required' }
      });
      return;
    }

    const validCategories = ['good_standing_with_phone', 'good_standing_without_phone', 'expired_with_phone', 'expired_without_phone'];
    if (!validCategories.includes(category as string)) {
      res.status(400).json({
        success: false,
        error: { message: `Invalid category. Must be one of: ${validCategories.join(', ')}` }
      });
      return;
    }

    const filters = {
      province_code: province_code as string | undefined,
      municipality_code: municipality_code as string | undefined,
      municipality_name: municipality_name as string | undefined,
      category: category as 'good_standing_with_phone' | 'good_standing_without_phone' | 'expired_with_phone' | 'expired_without_phone',
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50
    };

    const result = await BirthdayReportService.getCategoryMembers(filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Failed to get category members:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve category members',
        details: error.message
      }
    });
  }
});

// Get monthly birthday report (legacy - fetches all data)
// WARNING: This endpoint may be slow for large datasets - use /summary + /category for UI
router.get('/monthly-report', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { province_code, municipality_code, municipality_name, page, limit } = req.query;

    const filters = {
      province_code: province_code as string | undefined,
      municipality_code: municipality_code as string | undefined,
      municipality_name: municipality_name as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 1000
    };

    const report = await BirthdayReportService.getMonthlyBirthdayReport(filters);

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Failed to get monthly birthday report:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve monthly birthday report',
        details: error.message
      }
    });
  }
});

// Export monthly birthday report to Excel
router.get('/monthly-report/export', authenticate, requireSMSPermission(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { province_code, municipality_code, municipality_name } = req.query;

    const filters = {
      province_code: province_code as string | undefined,
      municipality_code: municipality_code as string | undefined,
      municipality_name: municipality_name as string | undefined
    };

    const excelBuffer = await BirthdayReportService.exportBirthdayReportToExcel(filters);

    // Get current month name for filename
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();
    const monthName = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    // Province name mapping for filename
    const provinceNames: Record<string, string> = {
      'EC': 'Eastern_Cape', 'FS': 'Free_State', 'GP': 'Gauteng',
      'KZN': 'KwaZulu_Natal', 'LP': 'Limpopo', 'MP': 'Mpumalanga',
      'NC': 'Northern_Cape', 'NW': 'North_West', 'WC': 'Western_Cape'
    };

    // Add region to filename if filtered
    let filenameExtra = '';
    if (municipality_name) {
      filenameExtra = `_${(municipality_name as string).replace(/[^a-zA-Z0-9]/g, '_')}`;
    } else if (municipality_code) {
      filenameExtra = `_${municipality_code}`;
    } else if (province_code) {
      filenameExtra = `_${provinceNames[province_code as string] || province_code}`;
    }

    const filename = `Birthday_Report_${monthName}_${year}${filenameExtra}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error: any) {
    console.error('Failed to export monthly birthday report:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export monthly birthday report',
        details: error.message
      }
    });
  }
});

export default router;
