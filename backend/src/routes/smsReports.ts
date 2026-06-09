import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { checkResourcePermission } from '../middleware/auth';
import { SMSReportService, SMSReportFilters } from '../services/smsReportService';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes in this file
router.use(authenticate as any);

/**
 * GET /api/v1/sms/reports/messages
 * Retrieves paginated SMS messages based on filters.
 */
router.get('/messages', checkResourcePermission('sms', 'read') as any, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: SMSReportFilters = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            category: req.query.category as string,
            status: req.query.status as string,
            provinceCode: req.query.provinceCode as string,
            search: req.query.search as string,
            page: parseInt(req.query.page as string, 10) || 1,
            limit: parseInt(req.query.limit as string, 10) || 50
        };

        const result = await SMSReportService.getMessagesReport(filters);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error fetching SMS messages report:', { error: error instanceof Error ? error.message : String(error) });
        next(error);
    }
});

/**
 * GET /api/v1/sms/reports/summary
 * Retrieves aggregated statistics for SMS messages.
 */
router.get('/summary', checkResourcePermission('sms', 'read') as any, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: SMSReportFilters = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            category: req.query.category as string,
            status: req.query.status as string,
            provinceCode: req.query.provinceCode as string,
            search: req.query.search as string
        };

        const result = await SMSReportService.getReportSummary(filters);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error fetching SMS report summary:', { error: error instanceof Error ? error.message : String(error) });
        next(error);
    }
});

/**
 * GET /api/v1/sms/reports/duplicates
 * Detects duplicate phone numbers and returns stats.
 */
router.get('/duplicates', checkResourcePermission('sms', 'read') as any, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = {
            search: req.query.search as string,
            page: parseInt(req.query.page as string, 10) || 1,
            limit: parseInt(req.query.limit as string, 10) || 50
        };

        const result = await SMSReportService.getDuplicateNumbersReport(filters);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Error fetching duplicate phone numbers report:', { error: error instanceof Error ? error.message : String(error) });
        next(error);
    }
});

/**
 * GET /api/v1/sms/reports/export
 * Exports filtered SMS messages as a CSV file.
 */
router.get('/export', checkResourcePermission('sms', 'read') as any, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: SMSReportFilters = {
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            category: req.query.category as string,
            status: req.query.status as string,
            search: req.query.search as string,
        };

        const csvContent = await SMSReportService.generateCsvExport(filters);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sms_report.csv');
        res.status(200).send(csvContent);
    } catch (error) {
        logger.error('Error exporting SMS messages report to CSV:', { error: error instanceof Error ? error.message : String(error) });
        next(error);
    }
});

export default router;
