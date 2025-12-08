import { LeadershipModel, CreateAppointmentData, UpdateAppointmentData, LeadershipFilters } from '../models/leadership';
import { ElectionModel, CreateCandidateData, UpdateCandidateData } from '../models/elections';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { executeQuery, executeQuerySingle } from '../config/database';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ElectionCreationData {
  election_name: string;
  position_id: number;
  hierarchy_level: 'National' | 'Province' | 'Region' | 'Municipality' | 'Ward';
  entity_id: number;
  election_date: string;
  nomination_start_date: string;
  nomination_end_date: string;
  voting_start_datetime: string;
  voting_end_datetime: string;
  created_by: number;
}

export interface AppointmentFromElectionData {
  election_id: number;
  winner_candidate_id: number;
  appointed_by: number;
  start_date: string;
  end_date?: string;
  appointment_notes?: string;
}

export class LeadershipService {
  // Create new leadership appointment
  static async createAppointment(appointmentData: CreateAppointmentData): Promise<number> {
    try {
      // Validate position exists
      const position = await LeadershipModel.getPositionById(appointmentData.position_id);
      if (!position) {
        throw new NotFoundError('Leadership position not found');
      }

      // Check if position is already filled
      const isVacant = await LeadershipModel.isPositionVacant(
        appointmentData.position_id,
        appointmentData.hierarchy_level,
        appointmentData.entity_id
      );

      if (!isVacant) {
        throw new ValidationError('Position is already filled. Please terminate the current appointment first.');
      }

      // Validate member exists - ALL MEMBERS ARE NOW ELIGIBLE
      // Skip member validation for now since everyone is eligible
      // const member = await executeQuerySingle(
      //   'SELECT id FROM members_consolidated WHERE id = ? ',
      //   [appointmentData.member_id]
      // );
      //
      // if (!member) {
      //   throw new NotFoundError('Member not found');
      // }

      // All members are now eligible regardless of status

      // Create the appointment
      const appointmentId = await LeadershipModel.createAppointment(appointmentData);

      return appointmentId;
    } catch (error) {
      throw error;
    }
  }

  // Terminate leadership appointment
  static async terminateAppointment(
    appointmentId : number,
    terminatedBy: number,
    terminationReason: string,
    endDate?: string
  ): Promise<boolean> {
    try {
      const appointment = await LeadershipModel.getAppointmentById(appointmentId);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      if (appointment.appointment_status !== 'Active') {
        throw new ValidationError(
          `Cannot terminate appointment: This appointment is already ${appointment.appointment_status.toLowerCase()}. ` +
          `Only active appointments can be terminated. ` +
          `${appointment.appointment_status === 'Terminated' ? 'This appointment has already been terminated.' : ''}` +
          `${appointment.appointment_status === 'Completed' ? 'This appointment has already been completed/removed.' : ''}`
        );
      }

      const updateData: UpdateAppointmentData = {
        appointment_status: 'Terminated',
        end_date: endDate || new Date().toISOString().split('T')[0],
        termination_reason: terminationReason,
        terminated_by: terminatedBy
      };

      return await LeadershipModel.updateAppointment(appointmentId, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Remove member from leadership position (makes position vacant)
  static async removeFromPosition(
    appointmentId: number,
    removedBy: number,
    removalReason: string
  ): Promise<boolean> {
    try {
      const appointment = await LeadershipModel.getAppointmentById(appointmentId);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      if (appointment.appointment_status !== 'Active') {
        throw new ValidationError(
          `Cannot remove appointment: This appointment is already ${appointment.appointment_status.toLowerCase()}. ` +
          `Only active appointments can be removed. ` +
          `${appointment.appointment_status === 'Completed' ? 'This appointment has already been removed.' : ''}`
        );
      }

      const updateData: UpdateAppointmentData = {
        appointment_status: 'Completed',
        end_date: new Date().toISOString().split('T')[0],
        termination_reason: removalReason,
        terminated_by: removedBy
      };

      return await LeadershipModel.updateAppointment(appointmentId, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Delete appointment (hard delete - for testing/cleanup purposes)
  static async deleteAppointment(appointmentId: number): Promise<boolean> {
    try {
      const appointment = await LeadershipModel.getAppointmentById(appointmentId);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      return await LeadershipModel.deleteAppointment(appointmentId);
    } catch (error) {
      throw error;
    }
  }

  // Create new election
  static async createElection(electionData: ElectionCreationData): Promise<number> {
    try {
      // Validate position exists
      const position = await LeadershipModel.getPositionById(electionData.position_id);
      if (!position) {
        throw new NotFoundError('Leadership position not found');
      }

      // Validate dates
      const nominationStart = new Date(electionData.nomination_start_date);
      const nominationEnd = new Date(electionData.nomination_end_date);
      const votingStart = new Date(electionData.voting_start_datetime);
      const votingEnd = new Date(electionData.voting_end_datetime);
      const electionDate = new Date(electionData.election_date);

      if (nominationStart >= nominationEnd) {
        throw new ValidationError('Nomination end date must be after start date');
      }

      if (votingStart >= votingEnd) {
        throw new ValidationError('Voting end time must be after start time');
      }

      if (nominationEnd >= votingStart) {
        throw new ValidationError('Voting must start after nominations close');
      }

      if (votingEnd.toDateString() !== electionDate.toDateString()) {
        throw new ValidationError('Election date must match the voting end date');
      }

      // Calculate eligible voters based on hierarchy level and entity
      const eligibleVoters = await this.calculateEligibleVoters(
        electionData.hierarchy_level,
        electionData.entity_id
      );

      const electionDataWithVoters = {
        ...electionData,
        total_eligible_voters: eligibleVoters
      };

      return await ElectionModel.createElection(electionDataWithVoters);
    } catch (error) {
      throw error;
    }
  }

  // Add candidate to election
  static async addCandidateToElection(candidateData: CreateCandidateData): Promise<number> {
    try {
      // Validate election exists and is in nomination phase
      const election = await ElectionModel.getElectionById(candidateData.election_id);
      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (election.election_status !== 'Nominations Open') {
        throw new ValidationError('Nominations are not currently open for this election');
      }

      // Validate member exists and is eligible
      const member = await executeQuerySingle(
        'SELECT member_id, membership_status FROM members_consolidated WHERE member_id = ? ',
        [candidateData.member_id]
      );

      if (!member) {
        throw new NotFoundError('Member not found');
      }

      if (member.membership_status !== 'Active') {
        throw new ValidationError('Only active members can be candidates');
      }

      // Check if member is already a candidate in this election
      const existingCandidate = await executeQuerySingle(
        'SELECT id FROM election_candidates WHERE election_id = $1 AND member_id = ',
        [candidateData.election_id, candidateData.member_id]
      );

      if (existingCandidate) {
        throw new ValidationError('Member is already a candidate in this election');
      }

      return await ElectionModel.addCandidate(candidateData);
    } catch (error) {
      throw error;
    }
  }

  // Cast vote in election
  static async castVote(electionId : number, candidateId: number, voterMemberId: number): Promise<boolean> {
    try {
      // Validate election is in voting phase
      const election = await ElectionModel.getElectionById(electionId);
      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (election.election_status !== 'Voting Open') {
        throw new ValidationError('Voting is not currently open for this election');
      }

      // Check if voter is eligible
      const canVote = await ElectionModel.canMemberVote(electionId, voterMemberId);
      if (!canVote) {
        throw new ValidationError('Member is not eligible to vote or has already voted');
      }

      // Validate candidate exists and is approved
      const candidate = await executeQuerySingle(
        'SELECT id, candidate_status FROM election_candidates WHERE id = ? AND election_id = ',
        [candidateId, electionId]
      );

      if (!candidate) {
        throw new NotFoundError('Candidate not found in this election');
      }

      if (candidate.candidate_status !== 'Approved') {
        throw new ValidationError('Can only vote for approved candidates');
      }

      await ElectionModel.castVote(electionId, candidateId, voterMemberId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Finalize election and create appointment for winner
  static async finalizeElectionAndCreateAppointment(
    electionId : number,
    appointmentData: AppointmentFromElectionData
  ): Promise<{ appointmentId: number; electionFinalized: boolean }> {
    try {
      // Validate election exists and can be finalized
      const election = await ElectionModel.getElectionById(electionId);
      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (election.election_status !== 'Voting Closed') {
        throw new ValidationError('Election must be in "Voting Closed" status to be finalized');
      }

      // Finalize the election
      const electionFinalized = await ElectionModel.finalizeElection(electionId);
      if (!electionFinalized) {
        throw new Error('Failed to finalize election');
      }

      // Get the winner candidate details
      const winner = await executeQuerySingle(
        `SELECT ec.member_id, le.position_id, le.hierarchy_level, le.entity_id
         FROM election_candidates ec
         LEFT JOIN leadership_elections le ON ec.election_id = le.id
         WHERE ec.id = ? AND ec.is_winner = TRUE`,
        [appointmentData.winner_candidate_id]
      );

      if (!winner) {
        throw new NotFoundError('Winner candidate not found');
      }

      // Create appointment for the winner
      const appointmentCreateData : CreateAppointmentData = {
        position_id: winner.position_id,
        member_id: winner.member_id,
        hierarchy_level: winner.hierarchy_level,
        entity_id: winner.entity_id,
        appointment_type: 'Elected',
        start_date: appointmentData.start_date,
        end_date: appointmentData.end_date,
        appointed_by: appointmentData.appointed_by,
        appointment_notes: appointmentData.appointment_notes || 'Elected through election: ' + election.election_name + ''
      };

      const appointmentId = await this.createAppointment(appointmentCreateData);

      return {
        appointmentId,
        electionFinalized: true
      };
    } catch (error) {
      throw error;
    }
  }

  // Get leadership dashboard data
  static async getLeadershipDashboard(hierarchyLevel?: string, entityId?: number): Promise<any> {
    try {
      const filters: LeadershipFilters = {};
      if (hierarchyLevel) filters.hierarchy_level = hierarchyLevel;
      if (entityId) filters.entity_id = entityId;

      // Get current appointments
      const currentAppointments = await LeadershipModel.getCurrentAppointments(50, 0, filters);

      // Get recent elections
      const recentElections = await ElectionModel.getElections(10, 0, {
        hierarchy_level: hierarchyLevel,
        entity_id: entityId
      });

      // Get positions with status information
      const allPositions = await LeadershipModel.getPositions(hierarchyLevel, entityId);
      const vacantPositions = allPositions.filter((position: any) => position.position_status === 'Vacant');

      // Get statistics
      const totalAppointments = await LeadershipModel.getAppointmentsCount(filters);
      const activeAppointments = await LeadershipModel.getAppointmentsCount({
        ...filters,
        appointment_status: 'Active'
      });

      const totalElections = await ElectionModel.getElectionsCount({
        hierarchy_level: hierarchyLevel,
        entity_id: entityId
      });

      return {
        current_appointments: currentAppointments,
        recent_elections: recentElections,
        vacant_positions: vacantPositions,
        statistics: {
          total_appointments: totalAppointments,
          active_appointments: activeAppointments,
          vacant_positions: vacantPositions.length,
          total_elections: totalElections
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate eligible voters for an election
  private static async calculateEligibleVoters(hierarchyLevel: string, entityId: number): Promise<number> {
    try {
      let query = '';
      let params: any[] = [];

      switch (hierarchyLevel) {
        case 'National':
          query = 'SELECT COUNT(*) as count FROM members_consolidated WHERE membership_status = "Active"';
          break;
        case 'Province':
          query = 'SELECT COUNT(*) as count FROM members_consolidated WHERE membership_status = "Active" AND province_id = ? ';
          params = [entityId];
          break;
        case 'Region' : query = 'SELECT COUNT(*) as count FROM members_consolidated WHERE membership_status = "Active" AND region_id = $1';
          params = [entityId];
          break;
        case 'Municipality':
          query = 'SELECT COUNT(*) as count FROM members_consolidated WHERE membership_status = "Active" AND municipality_id = ? ';
          params = [entityId];
          break;
        case 'Ward' : query = 'SELECT COUNT(*) as count FROM members_consolidated WHERE membership_status = "Active" AND ward_id = $1';
          params = [entityId];
          break;
        default:
          return 0;
      }

      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // Update election status based on current date/time
  static async updateElectionStatuses(): Promise<void> {
    try {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentDateTime = now.toISOString();

      // Update elections to "Nominations Open"
      await executeQuery(
        `UPDATE leadership_elections 
         SET election_status = 'Nominations Open'
        WHERE election_status = 'Planned' 
         AND nomination_start_date <= ? `,
        [currentDate]
      );

      // Update elections to "Nominations Closed"
      await executeQuery(
        `UPDATE leadership_elections 
         SET election_status = 'Nominations Closed'
        WHERE election_status = 'Nominations Open' 
         AND nomination_end_date < $1`,
        [currentDate]
      );

      // Update elections to "Voting Open"
      await executeQuery(
        `UPDATE leadership_elections 
         SET election_status = 'Voting Open'
        WHERE election_status = 'Nominations Closed' 
         AND voting_start_datetime <= $1`,
        [currentDateTime]
      );

      // Update elections to "Voting Closed"
      await executeQuery(
        `UPDATE leadership_elections 
         SET election_status = 'Voting Closed'
        WHERE election_status = 'Voting Open' 
         AND voting_end_datetime <= $1`,
        [currentDateTime]
      );
    } catch (error) {
      console.error('Failed to update election statuses : ', error);
    }
  }

  // Get member's leadership eligibility
  static async getMemberLeadershipEligibility(memberId: number): Promise<any> {
    try {
      // Skip member validation since everyone is eligible
      const member = {
        member_id: memberId,
        membership_date: new Date().toISOString() // Default date
      };

      // Get current leadership positions
      const currentPositions = await LeadershipModel.getCurrentAppointments(10, 0, { member_id: memberId });

      // Get leadership history
      const leadershipHistory = await LeadershipModel.getMemberLeadershipHistory(memberId);

      // Check eligibility criteria - ALL MEMBERS ARE NOW ELIGIBLE
      const membershipDuration = member.membership_date
        ? Math.floor((Date.now() - new Date(member.membership_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

      const isEligible = true; // Everyone is now eligible

      return {
        member_id: memberId,
        membership_status: 'Active', // Default status for compatibility
        membership_duration_months: membershipDuration,
        is_eligible_for_leadership: isEligible,
        current_positions: currentPositions,
        leadership_history: leadershipHistory,
        eligibility_notes: 'All members are eligible for leadership positions'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all members eligible for leadership positions
  static async getEligibleLeadershipMembers(filters: {
    page?: number;
    limit?: number;
    hierarchy_level?: string;
    entity_id?: number;
  } = {}): Promise<{ members: any[]; pagination: any }> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const offset = (page - 1) * limit;

      // Base query for eligible members (ALL MEMBERS ARE NOW ELIGIBLE)
      // Use the existing vw_member_details view (already fixed for metro members)
      let query = `
        SELECT
          m.member_id,
          'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
          m.firstname as first_name,
          COALESCE(m.surname, '') as last_name,
          m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
          m.id_number,
          COALESCE(m.email, '') as email,
          COALESCE(m.cell_number, '') as phone,
          COALESCE(m.cell_number, '') as cell_number,
          'Active' as membership_status,
          COALESCE(m.province_code, '') as province_code,
          COALESCE(m.province_name, '') as province_name,
          COALESCE(m.district_code, '') as district_code,
          COALESCE(m.district_name, '') as district_name,
          COALESCE(m.municipality_code, '') as municipality_code,
          COALESCE(m.municipality_name, '') as municipality_name,
          COALESCE(m.municipality_type, '') as municipality_type,
          COALESCE(m.ward_code, '') as ward_code,
          COALESCE(m.ward_name, '') as ward_name,
          m.ward_number,
          COALESCE(m.member_created_at, CURRENT_TIMESTAMP) as membership_date,
          COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_TIMESTAMP, m.member_created_at)) * 12 +
                   EXTRACT(MONTH FROM AGE(CURRENT_TIMESTAMP, m.member_created_at)), 0)::INTEGER as membership_duration_months,
          'Eligible' as eligibility_status,
          'All members are eligible for leadership positions' as eligibility_notes
        FROM vw_member_details m
        WHERE m.member_id IS NOT NULL
      `;

      const params: any[] = [];

      // Add geographic filtering if specified
      if (filters.hierarchy_level && filters.entity_id) {
        switch (filters.hierarchy_level) {
          case 'Province':
            query += ' AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = ? )';
            params.push(filters.entity_id);
            break;
          case 'District':
            query += ' AND m.district_code = (SELECT district_code FROM districts WHERE district_id = ? )';
            params.push(filters.entity_id);
            break;
          case 'Municipality':
            // FIXED: Include both the selected municipality AND all its sub-regions (for metros)
            // This handles parent-child municipality relationships via parent_municipality_id
            query += ` AND m.municipality_code IN (
              -- Include the selected municipality itself
              SELECT municipality_code FROM municipalities WHERE municipality_id = ?
              UNION
              -- Include all sub-regions if this is a parent municipality
              SELECT municipality_code FROM municipalities WHERE parent_municipality_id = ?
            )`;
            params.push(filters.entity_id, filters.entity_id);
            break;
          case 'Ward':
            query += ' AND m.ward_code = (SELECT ward_code FROM wards WHERE ward_id = ? )';
            params.push(filters.entity_id);
            break;
          // National level has no geographic restrictions
        }
      }

      // Add ordering and pagination
      query += `
        ORDER BY m.firstname, m.surname
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      // Execute main query
      const members = await executeQuery(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM vw_member_details m
        WHERE m.member_id IS NOT NULL
      `;

      const countParams: any[] = [];

      // Add same geographic filtering for count
      if (filters.hierarchy_level && filters.entity_id) {
        switch (filters.hierarchy_level) {
          case 'Province':
            countQuery += ' AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = ? )';
            countParams.push(filters.entity_id);
            break;
          case 'District':
            countQuery += ' AND m.district_code = (SELECT district_code FROM districts WHERE district_id = ? )';
            countParams.push(filters.entity_id);
            break;
          case 'Municipality':
            // FIXED: Use same logic as main query - include sub-regions
            countQuery += ` AND m.municipality_code IN (
              -- Include the selected municipality itself
              SELECT municipality_code FROM municipalities WHERE municipality_id = ?
              UNION
              -- Include all sub-regions if this is a parent municipality
              SELECT municipality_code FROM municipalities WHERE parent_municipality_id = ?
            )`;
            countParams.push(filters.entity_id, filters.entity_id);
            break;
          case 'Ward':
            countQuery += ' AND m.ward_code = (SELECT ward_code FROM wards WHERE ward_id = ? )';
            countParams.push(filters.entity_id);
            break;
        }
      }

      const countResult = await executeQuerySingle(countQuery, countParams);
      const total = countResult?.total || 0;

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };

      return { members, pagination };
    } catch (error) {
      throw error;
    }
  }

  // ==================== GEOGRAPHIC HIERARCHY METHODS ====================

  // Get all provinces
  static async getProvinces(): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          p.province_id as id,
          p.province_code,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          COUNT(DISTINCT la.id) as leadership_appointments
        FROM provinces p
        LEFT JOIN vw_member_details m ON p.province_code = m.province_code
        LEFT JOIN leadership_appointments la ON la.hierarchy_level = 'Province'
          AND la.entity_id = p.province_id
          AND la.appointment_status = 'Active'
        WHERE p.province_name IS NOT NULL
        GROUP BY p.province_id, p.province_code, p.province_name
        ORDER BY p.province_name
      `;

      return await executeQuery(query, []);
    } catch (error) {
      throw error;
    }
  }

  // Get municipalities by province
  static async getMunicipalitiesByProvince(provinceId: number): Promise<any[]> {
    try {
      // First get the province code from province ID
      const province = await prisma.provinces.findUnique({
        where: { province_id: provinceId },
        select: { province_code: true }
      });

      if (!province) {
        return [];
      }

      // Get all districts for this province
      const districts = await prisma.districts.findMany({
        where: {
          province_code: province.province_code,
          is_active: true
        },
        select: {
          district_code: true
        }
      });

      const districtCodes = districts.map(d => d.district_code);

      // Get municipalities by district codes
      const municipalities = await prisma.municipalities.findMany({
        where: {
          district_code: {
            in: districtCodes
          },
          is_active: true
        },
        select: {
          municipality_id: true,
          municipality_code: true,
          municipality_name: true,
          municipality_type: true,
          district_code: true,
          parent_municipality_id: true
        },
        orderBy: {
          municipality_name: 'asc'
        }
      });

      return municipalities;
    } catch (error) {
      throw error;
    }
  }

  // Get municipalities by province CODE
  static async getMunicipalitiesByProvinceCode(provinceCode : string): Promise<any[]> {
    try {
      // Get all districts for this province
      const districts = await prisma.districts.findMany({
        where: {
          province_code: provinceCode,
          is_active: true
        },
        select: {
          district_code: true
        }
      });

      const districtCodes = districts.map(d => d.district_code);

      // Get municipalities by district codes
      const municipalities = await prisma.municipalities.findMany({
        where: {
          district_code: {
            in: districtCodes
          },
          is_active: true
        },
        select: {
          municipality_id: true,
          municipality_code: true,
          municipality_name: true,
          municipality_type: true,
          district_code: true,
          parent_municipality_id: true
        },
        orderBy: {
          municipality_name: 'asc'
        }
      });

      return municipalities;
    } catch (error) {
      throw error;
    }
  }

  // Get wards by municipality
  static async getWardsByMunicipality(municipalityId : number): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          w.ward_id,
          w.ward_code,
          w.ward_name,
          w.ward_number,
          w.municipality_code,
          mu.municipality_name,
          d.province_code,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          COUNT(DISTINCT la.id) as leadership_appointments
        FROM wards w
        JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        JOIN districts d ON mu.district_code = d.district_code
        JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN vw_member_details m ON w.ward_code = m.ward_code
        LEFT JOIN leadership_appointments la ON la.hierarchy_level = 'Ward'
          AND la.entity_id = w.ward_id
          AND la.appointment_status = 'Active'
        WHERE mu.municipality_id = ? AND w.ward_name IS NOT NULL
        GROUP BY w.ward_id, w.ward_code, w.ward_name, w.ward_number, w.municipality_code,
                 mu.municipality_name, d.province_code, p.province_name
        ORDER BY w.ward_number, w.ward_name
      `;

      return await executeQuery(query, [municipalityId]);
    } catch (error) {
      throw error;
    }
  }

  // ==================== WAR COUNCIL STRUCTURE METHODS ====================

  // Get War Council Structure with all positions and appointments
  static async getWarCouncilStructure() : Promise<any> {
    try {
      const structure = await LeadershipModel.getWarCouncilStructure();

      // Group positions by type
      const corePositions = structure.filter(pos => !pos.province_specific);
      const cctDeployees = structure.filter(pos => pos.province_specific);

      // Calculate statistics
      const totalPositions = structure.length;
      const filledPositions = structure.filter(pos => pos.position_status === 'Filled').length;
      const vacantPositions = totalPositions - filledPositions;
      const fillRate = totalPositions > 0 ? Math.round((filledPositions / totalPositions) * 100) : 0;

      return {
        structure: {
          core_positions: corePositions,
          cct_deployees: cctDeployees,
          all_positions: structure
        },
        statistics: {
          total_positions: totalPositions,
          filled_positions: filledPositions,
          vacant_positions: vacantPositions,
          fill_rate_percentage: fillRate,
          core_positions_filled: corePositions.filter(pos => pos.position_status === 'Filled').length,
          core_positions_total: corePositions.length,
          cct_deployees_filled: cctDeployees.filter(pos => pos.position_status === 'Filled').length,
          cct_deployees_total: cctDeployees.length
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Create War Council appointment with validation
  static async createWarCouncilAppointment(appointmentData: CreateAppointmentData): Promise<number> {
    try {
      // Validate the appointment
      const validation = await LeadershipModel.validateWarCouncilAppointment(
        appointmentData.position_id,
        appointmentData.member_id
      );

      if (!validation.isValid) {
        throw new ValidationError('War Council appointment validation failed: ' + validation.errors.join(', ') + '');
      }

      // Create the appointment
      const appointmentId = await LeadershipModel.createAppointment(appointmentData);

      return appointmentId;
    } catch (error) {
      throw error;
    }
  }

  // Get War Council positions available for appointment
  static async getAvailableWarCouncilPositions(): Promise<any[]> {
    try {
      const positions = await LeadershipModel.getWarCouncilPositions();
      const availablePositions: any[] = [];

      for (const position of positions) {
        const isVacant = await LeadershipModel.isWarCouncilPositionVacant(position.id);
        if (isVacant) {
          availablePositions.push({
            ...position,
            position_status: 'Vacant'
          });
        }
      }

      return availablePositions;
    } catch (error) {
      throw error;
    }
  }

  // Get eligible members for a specific War Council position
  static async getEligibleMembersForWarCouncilPosition(positionId: number): Promise<any[]> {
    try {
      // Get position details
      const positions = await LeadershipModel.getWarCouncilPositions();
      const position = positions.find(p => p.id === positionId);

      if (!position) {
        throw new NotFoundError('War Council position not found');
      }

      // For province-specific positions, use province filtering in the query
      // This is much more efficient than fetching all members and filtering in memory
      let eligibleMembers: any[] = [];

      if (position.province_specific && position.province_code) {
        // Get province ID from province code
        const provinceResult = await executeQuery(
          'SELECT province_id FROM provinces WHERE province_code = ?',
          [position.province_code]
        );

        if (provinceResult.length > 0) {
          const provinceId = provinceResult[0].province_id;

          // Get members from specific province (no limit)
          const provinceMembers = await this.getEligibleLeadershipMembers({
            page: 1,
            limit: 100000, // High limit to get all members
            hierarchy_level: 'Province',
            entity_id: provinceId
          });

          eligibleMembers = provinceMembers.members;
        }
      } else {
        // For core positions, get all members (no province filter)
        const allMembers = await this.getEligibleLeadershipMembers({
          page: 1,
          limit: 100000 // High limit to get all members
        });

        eligibleMembers = allMembers.members;
      }

      // Filter out members already in War Council
      // War Council position IDs: 1, 2, 3, 4, 5, 6, 17, 18, 19, 20, 21, 22, 23, 24, 25
      const warCouncilMembers = await executeQuery(`
        SELECT DISTINCT la.member_id
        FROM leadership_appointments la
        WHERE la.position_id IN (1, 2, 3, 4, 5, 6, 17, 18, 19, 20, 21, 22, 23, 24, 25)
          AND la.appointment_status = 'Active'
      `);

      const warCouncilMemberIds = warCouncilMembers.map(m => m.member_id);
      eligibleMembers = eligibleMembers.filter(member =>
        !warCouncilMemberIds.includes(member.member_id)
      );

      return eligibleMembers;
    } catch (error) {
      throw error;
    }
  }

  // Get War Council dashboard data
  static async getWarCouncilDashboard(): Promise<any> {
    try {
      const structure = await this.getWarCouncilStructure();

      // Get recent appointments
      const recentAppointments = await LeadershipModel.getCurrentAppointments(10, 0, {
        hierarchy_level: 'National',
        entity_id: 1
      });

      // Filter for War Council appointments only
      const warCouncilAppointments = recentAppointments.filter(appointment =>
        ['PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG'].includes(appointment.position_code) ||
        appointment.position_code?.startsWith('CCT-')
      );

      return {
        structure : structure.structure,
        statistics: structure.statistics,
        recent_appointments: warCouncilAppointments.slice(0, 5),
        vacant_positions: structure.structure.all_positions.filter(pos => pos.position_status === 'Vacant')
      };
    } catch (error) {
      throw error;
    }
  }
}
