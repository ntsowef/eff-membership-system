import { Router, Request, Response } from 'express';
import { VoterRegistrationSMSService } from '../services/voterRegistrationSMSService';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get voter registration SMS statistics
router.get('/stats', authenticate, async (_req: Request, res: Response): Promise<void> => {
    try {
        const stats = await VoterRegistrationSMSService.getStatistics();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        console.error('Failed to get voter registration SMS stats:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to retrieve statistics', details: error.message },
        });
    }
});

// List unregistered voter members (paginated)
router.get('/unregistered-members', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const { members, total } = await VoterRegistrationSMSService.getUnregisteredVoters(page, limit);

        res.json({
            success: true,
            data: {
                members,
                pagination: {
                    page,
                    limit,
                    total,
                    total_pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error: any) {
        console.error('Failed to list unregistered voters:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to retrieve unregistered voters', details: error.message },
        });
    }
});

// Send voter registration reminder to a single member
router.post('/send-single/:memberId', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const memberId = parseInt(req.params.memberId);
        if (isNaN(memberId)) {
            res.status(400).json({ success: false, error: { message: 'Invalid member ID' } });
            return;
        }

        const result = await VoterRegistrationSMSService.sendSingleReminder(memberId);

        if (result.success) {
            res.json({ success: true, data: { message: result.message } });
        } else {
            res.status(400).json({ success: false, error: { message: result.error } });
        }
    } catch (error: any) {
        console.error('Failed to send single voter registration SMS:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to send voter registration SMS', details: error.message },
        });
    }
});

// Send voter registration reminders to all unregistered members (bulk)
router.post('/send-reminders', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const batchSize = parseInt(req.body.batchSize as string) || 50;

        const result = await VoterRegistrationSMSService.sendBulkReminders(batchSize);

        res.json({
            success: true,
            data: {
                message: `Voter registration SMS campaign completed`,
                total_targeted: result.total_targeted,
                sent: result.sent,
                failed: result.failed,
                skipped: result.skipped,
            },
        });
    } catch (error: any) {
        console.error('Failed to send bulk voter registration SMS:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to send bulk voter registration SMS', details: error.message },
        });
    }
});

export default router;
