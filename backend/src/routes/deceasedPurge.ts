/**
 * Deceased Member Purge Routes
 *
 * Admin endpoints for triggering and monitoring the monthly IEC deceased-member purge.
 *
 * All routes require SUPER_ADMIN or NATIONAL_ADMIN role.
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { DeceasedPurgeService } from '../services/deceasedPurgeService';
import logger from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/v1/deceased-purge/start
// Kick off (or resume) the monthly purge run.
// ---------------------------------------------------------------------------
router.post(
  '/start',
  authenticate,
  authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const triggeredBy = (req as any).user?.id as number | undefined;
      const result = await DeceasedPurgeService.startRun(triggeredBy);
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('POST /deceased-purge/start error:', { error: err });
      res.status(500).json({ success: false, error: 'Failed to start purge run' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/deceased-purge/pause/:runId
// Request a graceful pause of a running purge.
// ---------------------------------------------------------------------------
router.post(
  '/pause/:runId',
  authenticate,
  authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const runId = parseInt(req.params.runId, 10);
      if (isNaN(runId)) {
        res.status(400).json({ success: false, error: 'Invalid run ID' });
        return;
      }
      await DeceasedPurgeService.pauseRun(runId);
      res.json({ success: true, message: `Pause requested for run #${runId}. It will stop after the current batch.` });
    } catch (err) {
      logger.error('POST /deceased-purge/pause error:', { error: err });
      res.status(500).json({ success: false, error: 'Failed to pause run' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/deceased-purge/runs
// List recent purge runs.
// ---------------------------------------------------------------------------
router.get(
  '/runs',
  authenticate,
  authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'),
  async (_req: Request, res: Response) => {
    try {
      const runs = await DeceasedPurgeService.listRuns(24);
      res.json({ success: true, data: runs });
    } catch (err) {
      logger.error('GET /deceased-purge/runs error:', { error: err });
      res.status(500).json({ success: false, error: 'Failed to fetch runs' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/deceased-purge/runs/current
// Get run progress for the current calendar month.
// ---------------------------------------------------------------------------
router.get(
  '/runs/current',
  authenticate,
  authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'),
  async (_req: Request, res: Response) => {
    try {
      const run = await DeceasedPurgeService.getRunForCurrentMonth();
      if (!run) {
        res.json({ success: true, data: null, message: 'No purge run found for this month.' });
        return;
      }
      const progress = await DeceasedPurgeService.getRunProgress(run.run_id);
      res.json({ success: true, data: progress });
    } catch (err) {
      logger.error('GET /deceased-purge/runs/current error:', { error: err });
      res.status(500).json({ success: false, error: 'Failed to fetch current run' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/deceased-purge/runs/:runId
// Get full progress for a specific run.
// ---------------------------------------------------------------------------
router.get(
  '/runs/:runId',
  authenticate,
  authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const runId = parseInt(req.params.runId, 10);
      if (isNaN(runId)) {
        res.status(400).json({ success: false, error: 'Invalid run ID' });
        return;
      }
      const progress = await DeceasedPurgeService.getRunProgress(runId);
      if (!progress) {
        res.status(404).json({ success: false, error: `Run #${runId} not found` });
        return;
      }
      res.json({ success: true, data: progress });
    } catch (err) {
      logger.error('GET /deceased-purge/runs/:runId error:', { error: err });
      res.status(500).json({ success: false, error: 'Failed to fetch run' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/deceased-purge/archived
// List archived deceased members.
// Query params: run_id, province_code, limit, offset
// ---------------------------------------------------------------------------
router.get(
  '/archived',
  authenticate,
  authorize('SUPER_ADMIN', 'NATIONAL_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const run_id = req.query.run_id ? parseInt(String(req.query.run_id), 10) : undefined;
      const province_code = req.query.province_code ? String(req.query.province_code) : undefined;
      const limit = req.query.limit ? Math.min(parseInt(String(req.query.limit), 10), 500) : 100;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

      const result = await DeceasedPurgeService.listArchived({ run_id, province_code, limit, offset });
      res.json({ success: true, data: result.rows, total: result.total, limit, offset });
    } catch (err) {
      logger.error('GET /deceased-purge/archived error:', { error: err });
      res.status(500).json({ success: false, error: 'Failed to fetch archived members' });
    }
  }
);

export default router;
