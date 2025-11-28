"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadershipService = void 0;
const leadership_1 = require("../models/leadership");
const elections_1 = require("../models/elections");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = require("../config/database");
class LeadershipService {
    // Create new leadership appointment
    static async createAppointment(appointmentData) {
        try {
            // Validate position exists
            const position = await leadership_1.LeadershipModel.getPositionById(appointmentData.position_id);
            if (!position) {
                throw new errorHandler_1.NotFoundError('Leadership position not found');
            }
            // Check if position is already filled
            const isVacant = await leadership_1.LeadershipModel.isPositionVacant(appointmentData.position_id, appointmentData.hierarchy_level, appointmentData.entity_id);
            if (!isVacant) {
                throw new errorHandler_1.ValidationError('Position is already filled. Please terminate the current appointment first.');
            }
            // Validate member exists - ALL MEMBERS ARE NOW ELIGIBLE
            // Skip member validation for now since everyone is eligible
            // const member = await executeQuerySingle(
            //   'SELECT id FROM members WHERE id = ? ',
            //   [appointmentData.member_id]
            // );
            //
            // if (!member) {
            //   throw new NotFoundError('Member not found');
            // }
            // All members are now eligible regardless of status
            // Create the appointment
            const appointmentId = await leadership_1.LeadershipModel.createAppointment(appointmentData);
            return appointmentId;
        }
        catch (error) {
            throw error;
        }
    }
    // Terminate leadership appointment
    static async terminateAppointment(appointmentId, terminatedBy, terminationReason, endDate) {
        try {
            const appointment = await leadership_1.LeadershipModel.getAppointmentById(appointmentId);
            if (!appointment) {
                throw new errorHandler_1.NotFoundError('Appointment not found');
            }
            if (appointment.appointment_status !== 'Active') {
                throw new errorHandler_1.ValidationError('Only active appointments can be terminated');
            }
            const updateData = {
                appointment_status: 'Terminated',
                end_date: endDate || new Date().toISOString().split('T')[0],
                termination_reason: terminationReason,
                terminated_by: terminatedBy
            };
            return await leadership_1.LeadershipModel.updateAppointment(appointmentId, updateData);
        }
        catch (error) {
            throw error;
        }
    }
    // Remove member from leadership position (makes position vacant)
    static async removeFromPosition(appointmentId, removedBy, removalReason) {
        try {
            const appointment = await leadership_1.LeadershipModel.getAppointmentById(appointmentId);
            if (!appointment) {
                throw new errorHandler_1.NotFoundError('Appointment not found');
            }
            if (appointment.appointment_status !== 'Active') {
                throw new errorHandler_1.ValidationError('Only active appointments can be removed');
            }
            const updateData = {
                appointment_status: 'Completed',
                end_date: new Date().toISOString().split('T')[0],
                termination_reason: removalReason,
                terminated_by: removedBy
            };
            return await leadership_1.LeadershipModel.updateAppointment(appointmentId, updateData);
        }
        catch (error) {
            throw error;
        }
    }
    // Create new election
    static async createElection(electionData) {
        try {
            // Validate position exists
            const position = await leadership_1.LeadershipModel.getPositionById(electionData.position_id);
            if (!position) {
                throw new errorHandler_1.NotFoundError('Leadership position not found');
            }
            // Validate dates
            const nominationStart = new Date(electionData.nomination_start_date);
            const nominationEnd = new Date(electionData.nomination_end_date);
            const votingStart = new Date(electionData.voting_start_datetime);
            const votingEnd = new Date(electionData.voting_end_datetime);
            const electionDate = new Date(electionData.election_date);
            if (nominationStart >= nominationEnd) {
                throw new errorHandler_1.ValidationError('Nomination end date must be after start date');
            }
            if (votingStart >= votingEnd) {
                throw new errorHandler_1.ValidationError('Voting end time must be after start time');
            }
            if (nominationEnd >= votingStart) {
                throw new errorHandler_1.ValidationError('Voting must start after nominations close');
            }
            if (votingEnd.toDateString() !== electionDate.toDateString()) {
                throw new errorHandler_1.ValidationError('Election date must match the voting end date');
            }
            // Calculate eligible voters based on hierarchy level and entity
            const eligibleVoters = await this.calculateEligibleVoters(electionData.hierarchy_level, electionData.entity_id);
            const electionDataWithVoters = {
                ...electionData,
                total_eligible_voters: eligibleVoters
            };
            return await elections_1.ElectionModel.createElection(electionDataWithVoters);
        }
        catch (error) {
            throw error;
        }
    }
    // Add candidate to election
    static async addCandidateToElection(candidateData) {
        try {
            // Validate election exists and is in nomination phase
            const election = await elections_1.ElectionModel.getElectionById(candidateData.election_id);
            if (!election) {
                throw new errorHandler_1.NotFoundError('Election not found');
            }
            if (election.election_status !== 'Nominations Open') {
                throw new errorHandler_1.ValidationError('Nominations are not currently open for this election');
            }
            // Validate member exists and is eligible
            const member = await (0, database_1.executeQuerySingle)('SELECT member_id, membership_status FROM members WHERE member_id = ? ', [candidateData.member_id]);
            if (!member) {
                throw new errorHandler_1.NotFoundError('Member not found');
            }
            if (member.membership_status !== 'Active') {
                throw new errorHandler_1.ValidationError('Only active members can be candidates');
            }
            // Check if member is already a candidate in this election
            const existingCandidate = await (0, database_1.executeQuerySingle)('SELECT id FROM election_candidates WHERE election_id = $1 AND member_id = ', [candidateData.election_id, candidateData.member_id]);
            if (existingCandidate) {
                throw new errorHandler_1.ValidationError('Member is already a candidate in this election');
            }
            return await elections_1.ElectionModel.addCandidate(candidateData);
        }
        catch (error) {
            throw error;
        }
    }
    // Cast vote in election
    static async castVote(electionId, candidateId, voterMemberId) {
        try {
            // Validate election is in voting phase
            const election = await elections_1.ElectionModel.getElectionById(electionId);
            if (!election) {
                throw new errorHandler_1.NotFoundError('Election not found');
            }
            if (election.election_status !== 'Voting Open') {
                throw new errorHandler_1.ValidationError('Voting is not currently open for this election');
            }
            // Check if voter is eligible
            const canVote = await elections_1.ElectionModel.canMemberVote(electionId, voterMemberId);
            if (!canVote) {
                throw new errorHandler_1.ValidationError('Member is not eligible to vote or has already voted');
            }
            // Validate candidate exists and is approved
            const candidate = await (0, database_1.executeQuerySingle)('SELECT id, candidate_status FROM election_candidates WHERE id = ? AND election_id = ', [candidateId, electionId]);
            if (!candidate) {
                throw new errorHandler_1.NotFoundError('Candidate not found in this election');
            }
            if (candidate.candidate_status !== 'Approved') {
                throw new errorHandler_1.ValidationError('Can only vote for approved candidates');
            }
            await elections_1.ElectionModel.castVote(electionId, candidateId, voterMemberId);
            return true;
        }
        catch (error) {
            throw error;
        }
    }
    // Finalize election and create appointment for winner
    static async finalizeElectionAndCreateAppointment(electionId, appointmentData) {
        try {
            // Validate election exists and can be finalized
            const election = await elections_1.ElectionModel.getElectionById(electionId);
            if (!election) {
                throw new errorHandler_1.NotFoundError('Election not found');
            }
            if (election.election_status !== 'Voting Closed') {
                throw new errorHandler_1.ValidationError('Election must be in "Voting Closed" status to be finalized');
            }
            // Finalize the election
            const electionFinalized = await elections_1.ElectionModel.finalizeElection(electionId);
            if (!electionFinalized) {
                throw new Error('Failed to finalize election');
            }
            // Get the winner candidate details
            const winner = await (0, database_1.executeQuerySingle)(`SELECT ec.member_id, le.position_id, le.hierarchy_level, le.entity_id
         FROM election_candidates ec
         LEFT JOIN leadership_elections le ON ec.election_id = le.id
         WHERE ec.id = ? AND ec.is_winner = TRUE`, [appointmentData.winner_candidate_id]);
            if (!winner) {
                throw new errorHandler_1.NotFoundError('Winner candidate not found');
            }
            // Create appointment for the winner
            const appointmentCreateData = {
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
        }
        catch (error) {
            throw error;
        }
    }
    // Get leadership dashboard data
    static async getLeadershipDashboard(hierarchyLevel, entityId) {
        try {
            const filters = {};
            if (hierarchyLevel)
                filters.hierarchy_level = hierarchyLevel;
            if (entityId)
                filters.entity_id = entityId;
            // Get current appointments
            const currentAppointments = await leadership_1.LeadershipModel.getCurrentAppointments(50, 0, filters);
            // Get recent elections
            const recentElections = await elections_1.ElectionModel.getElections(10, 0, {
                hierarchy_level: hierarchyLevel,
                entity_id: entityId
            });
            // Get positions with status information
            const allPositions = await leadership_1.LeadershipModel.getPositions(hierarchyLevel, entityId);
            const vacantPositions = allPositions.filter((position) => position.position_status === 'Vacant');
            // Get statistics
            const totalAppointments = await leadership_1.LeadershipModel.getAppointmentsCount(filters);
            const activeAppointments = await leadership_1.LeadershipModel.getAppointmentsCount({
                ...filters,
                appointment_status: 'Active'
            });
            const totalElections = await elections_1.ElectionModel.getElectionsCount({
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
        }
        catch (error) {
            throw error;
        }
    }
    // Calculate eligible voters for an election
    static async calculateEligibleVoters(hierarchyLevel, entityId) {
        try {
            let query = '';
            let params = [];
            switch (hierarchyLevel) {
                case 'National':
                    query = 'SELECT COUNT(*) as count FROM members WHERE membership_status = "Active"';
                    break;
                case 'Province':
                    query = 'SELECT COUNT(*) as count FROM members WHERE membership_status = "Active" AND province_id = ? ';
                    params = [entityId];
                    break;
                case 'Region':
                    query = 'SELECT COUNT(*) as count FROM members WHERE membership_status = "Active" AND region_id = $1';
                    params = [entityId];
                    break;
                case 'Municipality':
                    query = 'SELECT COUNT(*) as count FROM members WHERE membership_status = "Active" AND municipality_id = ? ';
                    params = [entityId];
                    break;
                case 'Ward':
                    query = 'SELECT COUNT(*) as count FROM members WHERE membership_status = "Active" AND ward_id = $1';
                    params = [entityId];
                    break;
                default:
                    return 0;
            }
            const result = await (0, database_1.executeQuerySingle)(query, params);
            return result?.count || 0;
        }
        catch (error) {
            return 0;
        }
    }
    // Update election status based on current date/time
    static async updateElectionStatuses() {
        try {
            const now = new Date();
            const currentDate = now.toISOString().split('T')[0];
            const currentDateTime = now.toISOString();
            // Update elections to "Nominations Open"
            await (0, database_1.executeQuery)(`UPDATE leadership_elections 
         SET election_status = 'Nominations Open'
        WHERE election_status = 'Planned' 
         AND nomination_start_date <= ? `, [currentDate]);
            // Update elections to "Nominations Closed"
            await (0, database_1.executeQuery)(`UPDATE leadership_elections 
         SET election_status = 'Nominations Closed'
        WHERE election_status = 'Nominations Open' 
         AND nomination_end_date < $1`, [currentDate]);
            // Update elections to "Voting Open"
            await (0, database_1.executeQuery)(`UPDATE leadership_elections 
         SET election_status = 'Voting Open'
        WHERE election_status = 'Nominations Closed' 
         AND voting_start_datetime <= $1`, [currentDateTime]);
            // Update elections to "Voting Closed"
            await (0, database_1.executeQuery)(`UPDATE leadership_elections 
         SET election_status = 'Voting Closed'
        WHERE election_status = 'Voting Open' 
         AND voting_end_datetime <= $1`, [currentDateTime]);
        }
        catch (error) {
            console.error('Failed to update election statuses : ', error);
        }
    }
    // Get member's leadership eligibility
    static async getMemberLeadershipEligibility(memberId) {
        try {
            // Skip member validation since everyone is eligible
            const member = {
                member_id: memberId,
                membership_date: new Date().toISOString() // Default date
            };
            // Get current leadership positions
            const currentPositions = await leadership_1.LeadershipModel.getCurrentAppointments(10, 0, { member_id: memberId });
            // Get leadership history
            const leadershipHistory = await leadership_1.LeadershipModel.getMemberLeadershipHistory(memberId);
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
        }
        catch (error) {
            throw error;
        }
    }
    // Get all members eligible for leadership positions
    static async getEligibleLeadershipMembers(filters = {}) {
        try {
            const page = filters.page || 1;
            const limit = Math.min(filters.limit || 50, 100);
            const offset = (page - 1) * limit;
            // Base query for eligible members (ALL MEMBERS ARE NOW ELIGIBLE)
            // Use the existing vw_member_details view to avoid schema issues
            let query = `
        SELECT
          m.member_id,
          'MEM' || LPAD(m.member_id || 6 || '0') as membership_number,
          m.firstname as first_name,
          COALESCE(m.surname, '') as last_name,
          m.firstname || ' ' || COALESCE(m.surname || '') as full_name,
          m.id_number,
          COALESCE(m.email, '') as email,
          COALESCE(m.cell_number, '') as phone,
          COALESCE(m.cell_number, '') as cell_number,
          'Active' as membership_status,
          COALESCE(m.province_name, 'Unknown') as province_name,
          COALESCE(m.municipality_name, 'Unknown') as municipality_name,
          COALESCE(m.ward_name, 'Unknown') as ward_name,
          COALESCE(m.ward_number, 'Unknown') as ward_number,
          COALESCE(m.member_created_at, CURRENT_TIMESTAMP) as membership_date,
          COALESCE(TIMESTAMPDIFF(MONTH, m.member_created_at, CURRENT_TIMESTAMP), 0) as membership_duration_months,
          'Eligible' as eligibility_status,
          'All members are eligible for leadership positions' as eligibility_notes
        FROM vw_member_details m
        WHERE m.member_id IS NOT NULL
      `;
            const params = [];
            // Add geographic filtering if specified
            if (filters.hierarchy_level && filters.entity_id) {
                switch (filters.hierarchy_level) {
                    case 'Province':
                        query += ' AND m.province_code = (SELECT province_code FROM provinces WHERE id = ? )';
                        params.push(filters.entity_id);
                        break;
                    case 'District':
                        query += ' AND m.district_code = (SELECT district_code FROM districts WHERE id = $1)';
                        params.push(filters.entity_id);
                        break;
                    case 'Municipality':
                        query += ' AND m.municipality_code = (SELECT municipality_code FROM municipalities WHERE id = ? )';
                        params.push(filters.entity_id);
                        break;
                    case 'Ward':
                        query += ' AND m.ward_code = (SELECT ward_code FROM wards WHERE id = $1)';
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
            const members = await (0, database_1.executeQuery)(query, params);
            // Get total count for pagination
            let countQuery = `
        SELECT COUNT(*) as total
        FROM vw_member_details m
        WHERE m.member_id IS NOT NULL
      `;
            const countParams = [];
            // Add same geographic filtering for count
            if (filters.hierarchy_level && filters.entity_id) {
                switch (filters.hierarchy_level) {
                    case 'Province':
                        countQuery += ' AND m.province_code = (SELECT province_code FROM provinces WHERE id = ? )';
                        countParams.push(filters.entity_id);
                        break;
                    case 'District':
                        countQuery += ' AND m.district_code = (SELECT district_code FROM districts WHERE id = $1)';
                        countParams.push(filters.entity_id);
                        break;
                    case 'Municipality':
                        countQuery += ' AND m.municipality_code = (SELECT municipality_code FROM municipalities WHERE id = ? )';
                        countParams.push(filters.entity_id);
                        break;
                    case 'Ward':
                        countQuery += ' AND m.ward_code = (SELECT ward_code FROM wards WHERE id = $1)';
                        countParams.push(filters.entity_id);
                        break;
                }
            }
            const countResult = await (0, database_1.executeQuerySingle)(countQuery, countParams);
            const total = countResult?.total || 0;
            const pagination = {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            };
            return { members, pagination };
        }
        catch (error) {
            throw error;
        }
    }
    // ==================== GEOGRAPHIC HIERARCHY METHODS ====================
    // Get all provinces
    static async getProvinces() {
        try {
            const query = `
        SELECT DISTINCT
          p.province_id,
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
            return await (0, database_1.executeQuery)(query, []);
        }
        catch (error) {
            throw error;
        }
    }
    // Get municipalities by province
    static async getMunicipalitiesByProvince(provinceId) {
        try {
            const query = `
        SELECT DISTINCT
          mu.municipality_id,
          mu.municipality_code,
          mu.municipality_name,
          mu.district_code,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          COUNT(DISTINCT la.id) as leadership_appointments
        FROM municipalities mu
        JOIN districts d ON mu.district_code = d.district_code
        JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN vw_member_details m ON mu.municipality_code = m.municipality_code
        LEFT JOIN leadership_appointments la ON la.hierarchy_level = 'Municipality'
          AND la.entity_id = mu.municipality_id
          AND la.appointment_status = 'Active'
        WHERE p.province_id = ? AND mu.municipality_name IS NOT NULL
        GROUP BY mu.municipality_id, mu.municipality_code, mu.municipality_name, mu.district_code, p.province_name
        ORDER BY mu.municipality_name
      `;
            return await (0, database_1.executeQuery)(query, [provinceId]);
        }
        catch (error) {
            throw error;
        }
    }
    // Get municipalities by province CODE
    static async getMunicipalitiesByProvinceCode(provinceCode) {
        try {
            const query = `
        SELECT DISTINCT
          mu.id,
          mu.municipality_code,
          mu.municipality_name,
          mu.province_code,
          p.province_name,
          COUNT(DISTINCT m.member_id) as member_count,
          COUNT(DISTINCT la.id) as leadership_appointments
        FROM municipalities mu
        JOIN provinces p ON mu.province_code = p.province_code
        LEFT JOIN vw_member_details m ON mu.municipality_code = m.municipality_code
        LEFT JOIN leadership_appointments la ON la.hierarchy_level = 'Municipality'
          AND la.entity_id = mu.id
          AND la.appointment_status = 'Active'
        WHERE p.province_code = ? AND mu.municipality_name IS NOT NULL
        GROUP BY mu.id, mu.municipality_code, mu.municipality_name, mu.province_code, p.province_name
        ORDER BY mu.municipality_name
      `;
            return await (0, database_1.executeQuery)(query, [provinceCode]);
        }
        catch (error) {
            throw error;
        }
    }
    // Get wards by municipality
    static async getWardsByMunicipality(municipalityId) {
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
            return await (0, database_1.executeQuery)(query, [municipalityId]);
        }
        catch (error) {
            throw error;
        }
    }
    // ==================== WAR COUNCIL STRUCTURE METHODS ====================
    // Get War Council Structure with all positions and appointments
    static async getWarCouncilStructure() {
        try {
            const structure = await leadership_1.LeadershipModel.getWarCouncilStructure();
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
        }
        catch (error) {
            throw error;
        }
    }
    // Create War Council appointment with validation
    static async createWarCouncilAppointment(appointmentData) {
        try {
            // Validate the appointment
            const validation = await leadership_1.LeadershipModel.validateWarCouncilAppointment(appointmentData.position_id, appointmentData.member_id);
            if (!validation.isValid) {
                throw new errorHandler_1.ValidationError('War Council appointment validation failed: ' + validation.errors.join(', ') + '');
            }
            // Create the appointment
            const appointmentId = await leadership_1.LeadershipModel.createAppointment(appointmentData);
            return appointmentId;
        }
        catch (error) {
            throw error;
        }
    }
    // Get War Council positions available for appointment
    static async getAvailableWarCouncilPositions() {
        try {
            const positions = await leadership_1.LeadershipModel.getWarCouncilPositions();
            const availablePositions = [];
            for (const position of positions) {
                const isVacant = await leadership_1.LeadershipModel.isWarCouncilPositionVacant(position.id);
                if (isVacant) {
                    availablePositions.push({
                        ...position,
                        position_status: 'Vacant'
                    });
                }
            }
            return availablePositions;
        }
        catch (error) {
            throw error;
        }
    }
    // Get eligible members for a specific War Council position
    static async getEligibleMembersForWarCouncilPosition(positionId) {
        try {
            // Get position details
            const positions = await leadership_1.LeadershipModel.getWarCouncilPositions();
            const position = positions.find(p => p.id === positionId);
            if (!position) {
                throw new errorHandler_1.NotFoundError('War Council position not found');
            }
            // Get all eligible members
            const allMembers = await this.getEligibleLeadershipMembers({
                page: 1,
                limit: 1000 // Get all members for filtering
            });
            let eligibleMembers = allMembers.members;
            // Filter by province if position is province-specific
            if (position.province_specific && position.province_code) {
                eligibleMembers = eligibleMembers.filter(member => member.province_code === position.province_code);
            }
            // Filter out members already in War Council
            const warCouncilMembers = await (0, database_1.executeQuery)(`
        SELECT DISTINCT la.member_id
        FROM leadership_appointments la
        JOIN leadership_positions lp ON la.position_id = lp.id
        JOIN leadership_structures ls ON lp.structure_id = ls.id
        WHERE ls.structure_code = 'WCS'
          AND la.appointment_status = 'Active'
          AND la.hierarchy_level = 'National'
          AND la.entity_id = 1
      `);
            const warCouncilMemberIds = warCouncilMembers.map(m => m.member_id);
            eligibleMembers = eligibleMembers.filter(member => !warCouncilMemberIds.includes(member.member_id));
            return eligibleMembers;
        }
        catch (error) {
            throw error;
        }
    }
    // Get War Council dashboard data
    static async getWarCouncilDashboard() {
        try {
            const structure = await this.getWarCouncilStructure();
            // Get recent appointments
            const recentAppointments = await leadership_1.LeadershipModel.getCurrentAppointments(10, 0, {
                hierarchy_level: 'National',
                entity_id: 1
            });
            // Filter for War Council appointments only
            const warCouncilAppointments = recentAppointments.filter(appointment => ['PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG'].includes(appointment.position_code) ||
                appointment.position_code?.startsWith('CCT-'));
            return {
                structure: structure.structure,
                statistics: structure.statistics,
                recent_appointments: warCouncilAppointments.slice(0, 5),
                vacant_positions: structure.structure.all_positions.filter(pos => pos.position_status === 'Vacant')
            };
        }
        catch (error) {
            throw error;
        }
    }
}
exports.LeadershipService = LeadershipService;
