import express, { Request, Response } from 'express';
import { MembershipRenewalSMSService, RenewalSMSTargetGroup } from '../services/membershipRenewalSMSService';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /api/v1/membership-renewal-sms/stats:
 *   get:
 *     summary: Get statistics for membership renewal SMS campaigns
 *     tags: [Membership Renewal SMS]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authenticate, authorize('SUPER_ADMIN', 'NATIONAL_ADMIN', 'PROVINCIAL_ADMIN'), async (req: Request, res: Response) => {
    try {
        const stats = await MembershipRenewalSMSService.getStatistics();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        logger.error('Error fetching renewal SMS stats', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

/**
 * @swagger
 * /api/v1/membership-renewal-sms/eligible:
 *   get:
 *     summary: Get list of members eligible for renewal SMS
 *     tags: [Membership Renewal SMS]
 *     parameters:
 *       - in: query
 *         name: targetGroup
 *         required: true
 *         schema:
 *           type: string
 *           enum: [expiring_30_days, expiring_14_days, expiring_7_days, expired_recently, expired_30_plus]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 */
router.get('/eligible', authenticate, authorize('SUPER_ADMIN', 'NATIONAL_ADMIN', 'PROVINCIAL_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { targetGroup, page = 1, limit = 50 } = req.query;

        if (!targetGroup) {
            return res.status(400).json({ success: false, message: 'targetGroup is required' });
        }

        const data = await MembershipRenewalSMSService.getEligibleMembers(
            targetGroup as RenewalSMSTargetGroup,
            Number(page),
            Number(limit)
        );

        res.json({ success: true, ...data });
    } catch (error: any) {
        logger.error('Error fetching eligible members', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch members' });
    }
});

/**
 * @swagger
 * /api/v1/membership-renewal-sms/send-bulk:
 *   post:
 *     summary: Send bulk renewal SMS to a target group
 *     tags: [Membership Renewal SMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetGroup
 *             properties:
 *               targetGroup:
 *                 type: string
 *                 enum: [expiring_30_days, expiring_14_days, expiring_7_days, expired_recently, expired_30_plus]
 */
router.post('/send-bulk', authenticate, authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { targetGroup } = req.body;

        if (!targetGroup) {
            return res.status(400).json({ success: false, message: 'targetGroup is required' });
        }

        const result = await MembershipRenewalSMSService.sendBulkReminders(
            targetGroup as RenewalSMSTargetGroup
        );

        res.json({ success: true, ...result });
    } catch (error: any) {
        logger.error('Error sending bulk renewal SMS', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to send bulk SMS messages' });
    }
});

/**
 * @swagger
 * /api/v1/membership-renewal-sms/send-single/{memberId}:
 *   post:
 *     summary: Send a single renewal SMS to a member
 *     tags: [Membership Renewal SMS]
 */
router.post('/send-single/:memberId', authenticate, authorize('SUPER_ADMIN', 'NATIONAL_ADMIN', 'PROVINCIAL_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { memberId } = req.params;
        const { targetGroup } = req.body;

        if (!memberId || !targetGroup) {
            return res.status(400).json({ success: false, message: 'memberId and targetGroup are required' });
        }

        const result = await MembershipRenewalSMSService.sendSingleReminder(
            Number(memberId),
            targetGroup as RenewalSMSTargetGroup
        );

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error || 'Failed to send SMS' });
        }

        res.json({ success: true, message: result.message });
    } catch (error: any) {
        logger.error('Error sending single renewal SMS', { error: error.message });
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
