import { Router, Request, Response, NextFunction } from 'express';
import { LeadershipService } from '../services/leadershipService';
import { ElectionModel } from '../models/elections';
import { authenticate, requirePermission, requireAdminLevel, requireElectionManagementPermission } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createElectionSchema = Joi.object({
  election_name: Joi.string().min(3).max(255).required(),
  position_id: Joi.number().integer().positive().required(),
  hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').required(),
  entity_id: Joi.number().integer().positive().required(),
  election_date: Joi.date().iso().required(),
  nomination_start_date: Joi.date().iso().required(),
  nomination_end_date: Joi.date().iso().required(),
  voting_start_datetime: Joi.date().iso().required(),
  voting_end_datetime: Joi.date().iso().required()
});

const addCandidateSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
  nomination_statement: Joi.string().max(2000).optional()
});

const updateCandidateSchema = Joi.object({
  candidate_status: Joi.string().valid('Nominated', 'Approved', 'Rejected', 'Withdrawn').optional(),
  nomination_statement: Joi.string().max(2000).optional()
});

const castVoteSchema = Joi.object({
  candidate_id: Joi.number().integer().positive().required()
});

const finalizeElectionSchema = Joi.object({
  winner_candidate_id: Joi.number().integer().positive().required(),
  appointment_start_date: Joi.date().iso().required(),
  appointment_end_date: Joi.date().iso().optional(),
  appointment_notes: Joi.string().max(1000).optional()
});

// Get elections
router.get('/', authenticate, requirePermission('elections.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: any = {};
    if (req.query.hierarchy_level) filters.hierarchy_level = req.query.hierarchy_level as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.position_id) filters.position_id = parseInt(req.query.position_id as string);
    if (req.query.election_status) filters.election_status = req.query.election_status as string;
    if (req.query.election_date_from) filters.election_date_from = req.query.election_date_from as string;
    if (req.query.election_date_to) filters.election_date_to = req.query.election_date_to as string;

    const [elections, totalCount] = await Promise.all([
      ElectionModel.getElections(limit, offset, filters),
      ElectionModel.getElectionsCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Elections retrieved successfully',
      data: {
        elections,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Create new election
router.post('/', authenticate, requireElectionManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createElectionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const electionData = {
      ...value,
      created_by: req.user!.id
    };

    const electionId = await LeadershipService.createElection(electionData);

    // Log the election creation
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      electionId,
      undefined,
      {
        action: 'create_election',
        election_name: value.election_name,
        position_id: value.position_id,
        hierarchy_level: value.hierarchy_level,
        entity_id: value.entity_id
      },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: {
        election_id: electionId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get election by ID
router.get('/:id', authenticate, requirePermission('elections.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const election = await ElectionModel.getElectionById(electionId);
    if (!election) {
      throw new NotFoundError('Election not found');
    }

    res.json({
      success: true,
      message: 'Election retrieved successfully',
      data: {
        election
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update election status
router.patch('/:id/status', authenticate, requireElectionManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const { status } = req.body;
    const validStatuses = ['Planned', 'Nominations Open', 'Nominations Closed', 'Voting Open', 'Voting Closed', 'Completed', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid election status');
    }

    const success = await ElectionModel.updateElectionStatus(electionId, status);
    if (!success) {
      throw new NotFoundError('Election not found');
    }

    // Log the status update
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      electionId,
      undefined,
      {
        action: 'update_election_status',
        new_status: status
      },
      req
    );

    res.json({
      success: true,
      message: 'Election status updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get election candidates
router.get('/:id/candidates', authenticate, requirePermission('elections.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const candidates = await ElectionModel.getElectionCandidates(electionId);

    res.json({
      success: true,
      message: 'Election candidates retrieved successfully',
      data: {
        election_id: electionId,
        candidates
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Add candidate to election
router.post('/:id/candidates', authenticate, requirePermission('elections.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const { error, value } = addCandidateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const candidateData = {
      election_id: electionId,
      ...value
    };

    const candidateId = await LeadershipService.addCandidateToElection(candidateData);

    // Log the candidate addition
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      candidateId,
      undefined,
      {
        action: 'add_election_candidate',
        election_id: electionId,
        member_id: value.member_id
      },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Candidate added to election successfully',
      data: {
        candidate_id: candidateId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update candidate
router.put('/:electionId/candidates/:candidateId', authenticate, requireElectionManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.electionId);
    const candidateId = parseInt(req.params.candidateId);
    
    if (isNaN(electionId) || isNaN(candidateId)) {
      throw new ValidationError('Invalid election or candidate ID');
    }

    const { error, value } = updateCandidateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const success = await ElectionModel.updateCandidate(candidateId, value);
    if (!success) {
      throw new NotFoundError('Candidate not found');
    }

    // Log the candidate update
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      candidateId,
      undefined,
      {
        action: 'update_election_candidate',
        election_id: electionId,
        changes: value
      },
      req
    );

    res.json({
      success: true,
      message: 'Candidate updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Cast vote
router.post('/:id/vote', authenticate, requirePermission('elections.vote'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const { error, value } = castVoteSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Use the authenticated user's member ID for voting
    const voterMemberId = req.user!.member_id;
    if (!voterMemberId) {
      throw new ValidationError('User must be associated with a member to vote');
    }

    const success = await LeadershipService.castVote(electionId, value.candidate_id, voterMemberId);

    // Log the vote (without revealing the candidate choice for privacy)
    await logAudit(
      req.user!.id,
      AuditAction.CREATE,
      EntityType.SYSTEM,
      electionId,
      undefined,
      {
        action: 'cast_vote',
        election_id: electionId,
        voter_member_id: voterMemberId
      },
      req
    );

    res.json({
      success: true,
      message: 'Vote cast successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get election results
router.get('/:id/results', authenticate, requirePermission('elections.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const results = await ElectionModel.getElectionResults(electionId);
    if (!results) {
      throw new NotFoundError('Election not found');
    }

    res.json({
      success: true,
      message: 'Election results retrieved successfully',
      data: {
        results
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Finalize election and create appointment
router.post('/:id/finalize', authenticate, requireElectionManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    if (isNaN(electionId)) {
      throw new ValidationError('Invalid election ID');
    }

    const { error, value } = finalizeElectionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const appointmentData = {
      election_id: electionId,
      winner_candidate_id: value.winner_candidate_id,
      appointed_by: req.user!.id,
      start_date: value.appointment_start_date,
      end_date: value.appointment_end_date,
      appointment_notes: value.appointment_notes
    };

    const result = await LeadershipService.finalizeElectionAndCreateAppointment(electionId, appointmentData);

    // Log the election finalization
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.SYSTEM,
      electionId,
      undefined,
      {
        action: 'finalize_election',
        winner_candidate_id: value.winner_candidate_id,
        appointment_id: result.appointmentId
      },
      req
    );

    res.json({
      success: true,
      message: 'Election finalized and appointment created successfully',
      data: {
        election_finalized: result.electionFinalized,
        appointment_id: result.appointmentId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
