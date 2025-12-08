import { Router, Request, Response, NextFunction } from 'express';
import { LeadershipService } from '../services/leadershipService';
import { LeadershipModel } from '../models/leadership';
import { ElectionModel } from '../models/elections';
import { ValidationError, NotFoundError, sendPaginatedSuccess } from '../middleware/errorHandler';
import { authenticate, requireLeadershipManagementPermission, requireWarCouncilManagementPermission } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createAppointmentSchema = Joi.object({
  position_id: Joi.number().integer().positive().required(),
  member_id: Joi.number().integer().positive().required(),
  hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').required(),
  entity_id: Joi.number().integer().positive().required(),
  appointment_type: Joi.string().valid('Elected', 'Appointed', 'Acting', 'Interim').required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().optional(),
  appointment_notes: Joi.string().max(1000).optional()
});

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

const castVoteSchema = Joi.object({
  candidate_id: Joi.number().integer().positive().required()
});

const terminateAppointmentSchema = Joi.object({
  termination_reason: Joi.string().min(10).max(500).required(),
  end_date: Joi.date().iso().optional()
});

// Get organizational structures
router.get('/structures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const structures = await LeadershipModel.getLeadershipStructures();

    res.json({
      success: true,
      message: 'Leadership structures retrieved successfully',
      data: {
        structures
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get leadership structure analytics
router.get('/structures/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await LeadershipModel.getLeadershipStructureAnalytics();

    res.json({
      success: true,
      message: 'Leadership structure analytics retrieved successfully',
      data: {
        analytics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get leadership positions
router.get('/positions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyLevel = req.query.hierarchy_level as string;
    const entityId = req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined;
    const positions = await LeadershipModel.getPositions(hierarchyLevel, entityId);

    res.json({
      success: true,
      message: 'Leadership positions retrieved successfully',
      data: {
        positions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get current appointments
router.get('/appointments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: any = {};
    if (req.query.hierarchy_level) filters.hierarchy_level = req.query.hierarchy_level as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.position_id) filters.position_id = parseInt(req.query.position_id as string);
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    if (req.query.appointment_type) filters.appointment_type = req.query.appointment_type as string;

    const [appointments, totalCount] = await Promise.all([
      LeadershipModel.getCurrentAppointments(limit, offset, filters),
      LeadershipModel.getAppointmentsCount({ ...filters, appointment_status: 'Active' })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Current appointments retrieved successfully',
      data: {
        appointments,
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

// Get appointment history
router.get('/appointments/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: any = {};
    if (req.query.hierarchy_level) filters.hierarchy_level = req.query.hierarchy_level as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.position_id) filters.position_id = parseInt(req.query.position_id as string);
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    if (req.query.appointment_status) filters.appointment_status = req.query.appointment_status as string;
    if (req.query.appointment_type) filters.appointment_type = req.query.appointment_type as string;

    const [appointments, totalCount] = await Promise.all([
      LeadershipModel.getAppointmentHistory(limit, offset, filters),
      LeadershipModel.getAppointmentsCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Appointment history retrieved successfully',
      data: {
        appointments,
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

// Create new appointment
router.post('/appointments',
  authenticate,
  requireLeadershipManagementPermission(),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createAppointmentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const appointmentData = {
      ...value,
      appointed_by: req.user?.id || 8571 // Use authenticated user ID or default to first admin
    };

    const appointmentId = await LeadershipService.createAppointment(appointmentData);

    // Audit logging removed for development

    res.status(201).json({
      success: true,
      message: 'Leadership appointment created successfully',
      data: {
        appointment_id: appointmentId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get appointment by ID
router.get('/appointments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new ValidationError('Invalid appointment ID');
    }

    const appointment = await LeadershipModel.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    res.json({
      success: true,
      message: 'Appointment retrieved successfully',
      data: {
        appointment
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete appointment (hard delete - for testing/cleanup purposes)
router.delete('/appointments/:id',
  authenticate,
  requireLeadershipManagementPermission(),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new ValidationError('Invalid appointment ID');
    }

    const success = await LeadershipService.deleteAppointment(appointmentId);

    res.json({
      success: true,
      message: 'Appointment deleted successfully',
      data: {
        deleted: success
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Terminate appointment
router.post('/appointments/:id/terminate',
  authenticate,
  requireLeadershipManagementPermission(),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new ValidationError('Invalid appointment ID');
    }

    const { error, value } = terminateAppointmentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const success = await LeadershipService.terminateAppointment(
      appointmentId,
      1, // Default system user for development
      value.termination_reason,
      value.end_date
    );

    if (!success) {
      throw new NotFoundError('Appointment not found or could not be terminated');
    }

    // Audit logging removed for development

    res.json({
      success: true,
      message: 'Leadership appointment terminated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Remove member from leadership position (makes position vacant)
router.post('/appointments/:id/remove',
  authenticate,
  requireLeadershipManagementPermission(),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new ValidationError('Invalid appointment ID');
    }

    const { error, value } = Joi.object({
      removal_reason: Joi.string().min(5).max(500).required()
    }).validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const success = await LeadershipService.removeFromPosition(
      appointmentId,
      1, // Default system user for development
      value.removal_reason
    );

    if (!success) {
      throw new NotFoundError('Appointment not found or could not be removed');
    }

    res.json({
      success: true,
      message: 'Member removed from leadership position successfully. Position is now vacant.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get leadership structure for an entity
router.get('/structure/:hierarchyLevel/:entityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyLevel = req.params.hierarchyLevel;
    const entityId = parseInt(req.params.entityId);

    if (isNaN(entityId)) {
      throw new ValidationError('Invalid entity ID');
    }

    const validLevels = ['National', 'Province', 'Region', 'Municipality', 'Ward'];
    if (!validLevels.includes(hierarchyLevel)) {
      throw new ValidationError('Invalid hierarchy level');
    }

    const structure = await LeadershipModel.getLeadershipStructure(hierarchyLevel, entityId);

    res.json({
      success: true,
      message: 'Leadership structure retrieved successfully',
      data: {
        hierarchy_level: hierarchyLevel,
        entity_id: entityId,
        leadership_structure: structure
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's leadership history
router.get('/members/:memberId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      throw new ValidationError('Invalid member ID');
    }

    const history = await LeadershipModel.getMemberLeadershipHistory(memberId);

    res.json({
      success: true,
      message: 'Member leadership history retrieved successfully',
      data: {
        member_id: memberId,
        leadership_history: history
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's leadership eligibility
router.get('/members/:memberId/eligibility', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      throw new ValidationError('Invalid member ID');
    }

    const eligibility = await LeadershipService.getMemberLeadershipEligibility(memberId);

    res.json({
      success: true,
      message: 'Member leadership eligibility retrieved successfully',
      data: eligibility,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all members eligible for leadership positions
router.get('/eligible-members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const hierarchyLevel = req.query.hierarchy_level as string;
    const entityId = req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined;

    const eligibleMembers = await LeadershipService.getEligibleLeadershipMembers({
      page,
      limit,
      hierarchy_level: hierarchyLevel,
      entity_id: entityId
    });

    sendPaginatedSuccess(res, eligibleMembers.members, eligibleMembers.pagination, 'Eligible leadership members retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Get leadership dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyLevel = req.query.hierarchy_level as string;
    const entityId = req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined;

    const dashboard = await LeadershipService.getLeadershipDashboard(hierarchyLevel, entityId);

    res.json({
      success: true,
      message: 'Leadership dashboard retrieved successfully',
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ==================== GEOGRAPHIC HIERARCHY ROUTES ====================

// Get all provinces
router.get('/geographic/provinces', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provinces = await LeadershipService.getProvinces();

    res.json({
      success: true,
      message: 'Provinces retrieved successfully',
      data: { provinces },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get municipalities by province (ID)
router.get('/geographic/municipalities/:provinceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provinceId = parseInt(req.params.provinceId);
    if (isNaN(provinceId)) {
      throw new ValidationError('Invalid province ID');
    }

    const municipalities = await LeadershipService.getMunicipalitiesByProvince(provinceId);

    res.json({
      success: true,
      message: 'Municipalities retrieved successfully',
      data: { municipalities },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get municipalities by province CODE
router.get('/geographic/municipalities/code/:provinceCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provinceCode } = req.params;
    if (!provinceCode || typeof provinceCode !== 'string') {
      throw new ValidationError('Invalid province code');
    }

    const municipalities = await LeadershipService.getMunicipalitiesByProvinceCode(provinceCode);

    res.json({
      success: true,
      message: 'Municipalities retrieved successfully',
      data: { municipalities },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get wards by municipality
router.get('/geographic/wards/:municipalityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const municipalityId = parseInt(req.params.municipalityId);
    if (isNaN(municipalityId)) {
      throw new ValidationError('Invalid municipality ID');
    }

    const wards = await LeadershipService.getWardsByMunicipality(municipalityId);

    res.json({
      success: true,
      message: 'Wards retrieved successfully',
      data: { wards },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ELECTION MANAGEMENT ROUTES ====================

// Get all elections
router.get('/elections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      hierarchy_level: req.query.hierarchy_level as string,
      entity_id: req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined,
      position_id: req.query.position_id ? parseInt(req.query.position_id as string) : undefined,
      election_status: req.query.election_status as string,
      election_date_from: req.query.election_date_from as string,
      election_date_to: req.query.election_date_to as string,
      created_by: req.query.created_by ? parseInt(req.query.created_by as string) : undefined
    };

    const elections = await LeadershipModel.getElections(filters);

    res.json({
      success: true,
      message: 'Elections retrieved successfully',
      data: {
        elections,
        total: elections.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get election by ID
router.get('/elections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const election = await LeadershipModel.getElectionById(electionId);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'Election retrieved successfully',
      data: { election },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

// Create new election
router.post('/elections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionData = {
      ...req.body,
      created_by: 1 // Default admin user for development
    };

    const electionId = await LeadershipModel.createElection(electionData);
    const election = await LeadershipModel.getElectionById(electionId);

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: { election },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update election status
router.patch('/elections/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const { status } = req.body;

    const success = await LeadershipModel.updateElectionStatus(electionId, status);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Election not found',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'Election status updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

// Get election candidates
router.get('/elections/:id/candidates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const candidates = await LeadershipModel.getElectionCandidates(electionId);

    res.json({
      success: true,
      message: 'Election candidates retrieved successfully',
      data: { candidates },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Add candidate to election
router.post('/elections/:id/candidates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const { member_id, nomination_statement } = req.body;

    const candidateId = await LeadershipModel.addCandidate(electionId, member_id, nomination_statement);

    res.status(201).json({
      success: true,
      message: 'Candidate added successfully',
      data: { candidate_id: candidateId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Cast vote
router.post('/elections/:id/vote', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const { candidate_id, voter_member_id } = req.body;

    const voteId = await LeadershipModel.castVote(electionId, candidate_id, voter_member_id);

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: { vote_id: voteId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get election results
router.get('/elections/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const results = await LeadershipModel.getElectionResults(electionId);

    res.json({
      success: true,
      message: 'Election results retrieved successfully',
      data: { results },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Finalize election
router.post('/elections/:id/finalize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const electionId = parseInt(req.params.id);
    const success = await LeadershipModel.finalizeElection(electionId);

    res.json({
      success: true,
      message: 'Election finalized successfully',
      data: { finalized: success },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get eligible voters
router.get('/elections/voters/:hierarchyLevel/:entityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hierarchyLevel, entityId } = req.params;
    const voters = await LeadershipModel.getEligibleVoters(hierarchyLevel, parseInt(entityId));

    res.json({
      success: true,
      message: 'Eligible voters retrieved successfully',
      data: { voters },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ==================== WAR COUNCIL STRUCTURE ENDPOINTS ====================

// Get War Council Structure
router.get('/war-council/structure', authenticate, requireLeadershipManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const structure = await LeadershipService.getWarCouncilStructure();

    res.json({
      success: true,
      message: 'War Council Structure retrieved successfully',
      data: structure,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get War Council Dashboard
router.get('/war-council/dashboard', authenticate, requireLeadershipManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await LeadershipService.getWarCouncilDashboard();

    res.json({
      success: true,
      message: 'War Council Dashboard retrieved successfully',
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get available War Council positions
router.get('/war-council/positions/available', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const positions = await LeadershipService.getAvailableWarCouncilPositions();

    res.json({
      success: true,
      message: 'Available War Council positions retrieved successfully',
      data: { positions },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all War Council positions
router.get('/war-council/positions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const positions = await LeadershipModel.getWarCouncilPositions();

    res.json({
      success: true,
      message: 'War Council positions retrieved successfully',
      data: { positions },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get eligible members for a War Council position
router.get('/war-council/positions/:positionId/eligible-members', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const positionId = parseInt(req.params.positionId);
    const members = await LeadershipService.getEligibleMembersForWarCouncilPosition(positionId);

    res.json({
      success: true,
      message: 'Eligible members for War Council position retrieved successfully',
      data: { members },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Create War Council appointment
router.post('/war-council/appointments', authenticate, requireWarCouncilManagementPermission(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = createAppointmentSchema.validate(req.body);
    if (error) {
      throw new ValidationError(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    // Ensure this is for National level (War Council is national)
    if (value.hierarchy_level !== 'National' || value.entity_id !== 1) {
      throw new ValidationError('War Council appointments must be at National level with entity_id = 1');
    }

    // Add appointed_by from authenticated user
    const appointmentData = {
      ...value,
      appointed_by: req.user?.id || 0
    };

    const appointmentId = await LeadershipService.createWarCouncilAppointment(appointmentData);

    res.status(201).json({
      success: true,
      message: 'War Council appointment created successfully',
      data: { appointment_id: appointmentId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Validate War Council appointment (check before creating)
router.post('/war-council/appointments/validate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { position_id, member_id } = req.body;

    if (!position_id || !member_id) {
      throw new ValidationError('position_id and member_id are required');
    }

    const validation = await LeadershipModel.validateWarCouncilAppointment(
      parseInt(position_id),
      parseInt(member_id)
    );

    res.json({
      success: true,
      message: 'War Council appointment validation completed',
      data: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Check if War Council position is vacant
router.get('/war-council/positions/:positionId/vacancy', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const positionId = parseInt(req.params.positionId);
    const isVacant = await LeadershipModel.isWarCouncilPositionVacant(positionId);

    res.json({
      success: true,
      message: 'War Council position vacancy status retrieved successfully',
      data: {
        position_id: positionId,
        is_vacant: isVacant,
        status: isVacant ? 'Vacant' : 'Filled'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
