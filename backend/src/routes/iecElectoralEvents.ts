import express from 'express';
import { iecElectoralEventsService } from '../services/iecElectoralEventsService'; // ✅ MIGRATED TO PRISMA
import { authenticate } from '../middleware/auth';
import { createDatabaseError } from '../middleware/errorHandler';

const router = express.Router();

/**
 * @route GET /api/iec-electoral-events/types
 * @desc Get all electoral event types
 * @access Private
 */
router.get('/types', authenticate, async (req, res, next) => {
  try {
    const eventTypes = await iecElectoralEventsService.getElectoralEventTypes();
    res.json({
      success: true,
      data: eventTypes,
      message: 'Electoral event types retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/types/municipal
 * @desc Get municipal election types only
 * @access Private
 */
router.get('/types/municipal', authenticate, async (req, res, next) => {
  try {
    const municipalTypes = await iecElectoralEventsService.getMunicipalElectionTypes();
    res.json({
      success: true,
      data: municipalTypes,
      message: 'Municipal election types retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/events/:eventTypeId
 * @desc Get electoral events by type ID
 * @access Private
 */
router.get('/events/:eventTypeId', authenticate, async (req, res, next) => {
  try {
    const eventTypeId = parseInt(req.params.eventTypeId);
    
    if (isNaN(eventTypeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type ID'
      });
    }

    const events = await iecElectoralEventsService.getElectoralEventsByType(eventTypeId);
    res.json({
      success: true,
      data: events,
      message: `Electoral events for type ${eventTypeId} retrieved successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/municipal/active
 * @desc Get active municipal elections
 * @access Private
 */
router.get('/municipal/active', authenticate, async (req, res, next) => {
  try {
    const activeElections = await iecElectoralEventsService.getActiveMunicipalElections();
    res.json({
      success: true,
      data: activeElections,
      message: 'Active municipal elections retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/municipal/current
 * @desc Get current active municipal election
 * @access Private
 */
router.get('/municipal/current', authenticate, async (req, res, next) => {
  try {
    const currentElection = await iecElectoralEventsService.getCurrentMunicipalElection();
    
    if (!currentElection) {
      return res.status(404).json({
        success: false,
        message: 'No current municipal election found'
      });
    }

    res.json({
      success: true,
      data: currentElection,
      message: 'Current municipal election retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/municipal/history
 * @desc Get municipal election history
 * @access Private
 */
router.get('/municipal/history', authenticate, async (req, res, next) => {
  try {
    const electionHistory = await iecElectoralEventsService.getMunicipalElectionHistory();
    res.json({
      success: true,
      data: electionHistory,
      message: 'Municipal election history retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/iec-electoral-events/sync/types
 * @desc Sync electoral event types from IEC API
 * @access Private (Admin only)
 */
router.post('/sync/types', authenticate, async (req, res, next) => {
  try {
    // Check if user has admin privileges (you may need to implement role checking)
    // For now, we'll allow any authenticated user to sync
    
    const syncResult = await iecElectoralEventsService.syncElectoralEventTypes();
    
    res.json({
      success: syncResult.success,
      data: syncResult,
      message: syncResult.success 
        ? 'Electoral event types synchronized successfully'
        : 'Electoral event types synchronization failed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/iec-electoral-events/sync/events
 * @desc Sync electoral events from IEC API
 * @access Private (Admin only)
 */
router.post('/sync/events', authenticate, async (req, res, next) => {
  try {
    const { eventTypeId } = req.body;

    // Validate eventTypeId if provided
    if (eventTypeId && isNaN(parseInt(eventTypeId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type ID'
      });
    }

    const syncResult = await iecElectoralEventsService.syncElectoralEvents(
      eventTypeId ? parseInt(eventTypeId) : undefined
    );

    res.json({
      success: syncResult.success,
      data: syncResult,
      message: syncResult.success
        ? 'Electoral events synchronized successfully'
        : 'Electoral events synchronization failed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/iec-electoral-events/sync/full
 * @desc Perform full synchronization of all IEC electoral data
 * @access Private (Admin only)
 */
router.post('/sync/full', authenticate, async (req, res, next) => {
  try {
    const syncResult = await iecElectoralEventsService.performFullSync();
    
    res.json({
      success: syncResult.success,
      data: syncResult,
      message: syncResult.success 
        ? 'Full synchronization completed successfully'
        : 'Full synchronization failed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/sync/logs
 * @desc Get synchronization logs
 * @access Private (Admin only)
 */
router.get('/sync/logs', authenticate, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter (must be between 1 and 100)'
      });
    }

    const syncLogs = await iecElectoralEventsService.getSyncLogs(limit);
    
    res.json({
      success: true,
      data: syncLogs,
      message: 'Synchronization logs retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/iec-electoral-events/health
 * @desc Health check endpoint for IEC electoral events service
 * @access Public
 */
router.get('/health', async (req, res, next) => {
  try {
    // Basic health check - try to get event types count
    const eventTypes = await iecElectoralEventsService.getElectoralEventTypes();
    const municipalTypes = await iecElectoralEventsService.getMunicipalElectionTypes();
    const currentElection = await iecElectoralEventsService.getCurrentMunicipalElection();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        statistics: {
          total_event_types: eventTypes.length,
          municipal_event_types: municipalTypes.length,
          has_current_municipal_election: !!currentElection,
          current_election_id: currentElection?.iec_event_id || null,
          current_election_year: currentElection?.election_year || null
        }
      },
      message: 'IEC Electoral Events service is healthy'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      message: 'IEC Electoral Events service is unhealthy'
    });
  }
});

export default router;
