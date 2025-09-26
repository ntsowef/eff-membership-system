import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Election interfaces
export interface ElectionCandidate {
  id: number;
  election_id: number;
  member_id: number;
  nomination_date: string;
  nomination_statement?: string;
  candidate_status: 'Nominated' | 'Approved' | 'Rejected' | 'Withdrawn';
  votes_received: number;
  is_winner: boolean;
  created_at: string;
  updated_at: string;
}

export interface ElectionVote {
  id: number;
  election_id: number;
  candidate_id: number;
  voter_member_id: number;
  vote_datetime: string;
  created_at: string;
}

export interface ElectionCandidateDetails extends ElectionCandidate {
  member_name: string;
  membership_number: string;
  member_email?: string;
  member_phone?: string;
  election_name: string;
  position_name: string;
}

export interface ElectionResults {
  election_id: number;
  election_name: string;
  position_name: string;
  total_eligible_voters: number;
  total_votes_cast: number;
  voter_turnout_percentage: number;
  candidates: {
    candidate_id: number;
    member_name: string;
    membership_number: string;
    votes_received: number;
    vote_percentage: number;
    is_winner: boolean;
  }[];
  election_status: string;
  voting_completed_at?: string;
}

export interface CreateCandidateData {
  election_id: number;
  member_id: number;
  nomination_statement?: string;
}

export interface UpdateCandidateData {
  candidate_status?: 'Nominated' | 'Approved' | 'Rejected' | 'Withdrawn';
  nomination_statement?: string;
}

export interface CandidateFilters {
  election_id?: number;
  member_id?: number;
  candidate_status?: string;
  is_winner?: boolean;
}

// Election Model
export class ElectionModel {
  // Get elections with details
  static async getElections(
    limit: number = 20,
    offset: number = 0,
    filters: any = {}
  ): Promise<any[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.hierarchy_level) {
        whereClause += ' AND le.hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }

      if (filters.entity_id) {
        whereClause += ' AND le.entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.position_id) {
        whereClause += ' AND le.position_id = ?';
        params.push(filters.position_id);
      }

      if (filters.election_status) {
        whereClause += ' AND le.election_status = ?';
        params.push(filters.election_status);
      }

      if (filters.election_date_from) {
        whereClause += ' AND le.election_date >= ?';
        params.push(filters.election_date_from);
      }

      if (filters.election_date_to) {
        whereClause += ' AND le.election_date <= ?';
        params.push(filters.election_date_to);
      }

      const query = `
        SELECT 
          le.*,
          lp.position_name,
          lp.position_code,
          CONCAT(creator.firstname, ' ', creator.surname) as created_by_name,
          COUNT(ec.id) as candidates_count,
          winner.member_name as winner_name,
          CASE 
            WHEN le.hierarchy_level = 'National' THEN 'National Level'
            WHEN le.hierarchy_level = 'Province' THEN p.province_name
            WHEN le.hierarchy_level = 'Region' THEN r.region_name
            WHEN le.hierarchy_level = 'Municipality' THEN mun.municipality_name
            WHEN le.hierarchy_level = 'Ward' THEN CONCAT('Ward ', w.ward_number)
            ELSE 'Unknown'
          END as entity_name
        FROM leadership_elections le
        LEFT JOIN leadership_positions lp ON le.position_id = lp.id
        LEFT JOIN members creator ON le.created_by = creator.member_id
        LEFT JOIN election_candidates ec ON le.id = ec.election_id
        LEFT JOIN (
          SELECT 
            ec.election_id,
            CONCAT(m.firstname, ' ', m.surname) as member_name
          FROM election_candidates ec
          LEFT JOIN members m ON ec.member_id = m.member_id
          WHERE ec.is_winner = TRUE
        ) winner ON le.id = winner.election_id
        LEFT JOIN provinces p ON le.entity_id = p.province_id AND le.hierarchy_level = 'Province'
        LEFT JOIN regions r ON le.entity_id = r.region_id AND le.hierarchy_level = 'Region'
        LEFT JOIN municipalities mun ON le.entity_id = mun.municipality_id AND le.hierarchy_level = 'Municipality'
        LEFT JOIN wards w ON le.entity_id = w.ward_id AND le.hierarchy_level = 'Ward'
        ${whereClause}
        GROUP BY le.id
        ORDER BY le.election_date DESC, le.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get elections', error);
    }
  }

  // Get election by ID
  static async getElectionById(id: number): Promise<any | null> {
    try {
      const query = `
        SELECT 
          le.*,
          lp.position_name,
          lp.position_code,
          CONCAT(creator.firstname, ' ', creator.surname) as created_by_name,
          CASE 
            WHEN le.hierarchy_level = 'National' THEN 'National Level'
            WHEN le.hierarchy_level = 'Province' THEN p.province_name
            WHEN le.hierarchy_level = 'Region' THEN r.region_name
            WHEN le.hierarchy_level = 'Municipality' THEN mun.municipality_name
            WHEN le.hierarchy_level = 'Ward' THEN CONCAT('Ward ', w.ward_number)
            ELSE 'Unknown'
          END as entity_name
        FROM leadership_elections le
        LEFT JOIN leadership_positions lp ON le.position_id = lp.id
        LEFT JOIN members creator ON le.created_by = creator.member_id
        LEFT JOIN provinces p ON le.entity_id = p.province_id AND le.hierarchy_level = 'Province'
        LEFT JOIN regions r ON le.entity_id = r.region_id AND le.hierarchy_level = 'Region'
        LEFT JOIN municipalities mun ON le.entity_id = mun.municipality_id AND le.hierarchy_level = 'Municipality'
        LEFT JOIN wards w ON le.entity_id = w.ward_id AND le.hierarchy_level = 'Ward'
        WHERE le.id = ?
      `;

      return await executeQuerySingle(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to get election', error);
    }
  }

  // Create election
  static async createElection(electionData: any): Promise<number> {
    try {
      const query = `
        INSERT INTO leadership_elections (
          election_name, position_id, hierarchy_level, entity_id, election_date,
          nomination_start_date, nomination_end_date, voting_start_datetime, 
          voting_end_datetime, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        electionData.election_name,
        electionData.position_id,
        electionData.hierarchy_level,
        electionData.entity_id,
        electionData.election_date,
        electionData.nomination_start_date,
        electionData.nomination_end_date,
        electionData.voting_start_datetime,
        electionData.voting_end_datetime,
        electionData.created_by
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create election', error);
    }
  }

  // Update election status
  static async updateElectionStatus(id: number, status: string): Promise<boolean> {
    try {
      const query = 'UPDATE leadership_elections SET election_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const result = await executeQuery(query, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update election status', error);
    }
  }

  // Get election candidates
  static async getElectionCandidates(electionId: number): Promise<ElectionCandidateDetails[]> {
    try {
      const query = `
        SELECT 
          ec.*,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          m.membership_number,
          m.email as member_email,
          m.phone as member_phone,
          le.election_name,
          lp.position_name
        FROM election_candidates ec
        LEFT JOIN members m ON ec.member_id = m.member_id
        LEFT JOIN leadership_elections le ON ec.election_id = le.id
        LEFT JOIN leadership_positions lp ON le.position_id = lp.id
        WHERE ec.election_id = ?
        ORDER BY ec.votes_received DESC, ec.nomination_date ASC
      `;

      return await executeQuery(query, [electionId]);
    } catch (error) {
      throw createDatabaseError('Failed to get election candidates', error);
    }
  }

  // Add candidate to election
  static async addCandidate(candidateData: CreateCandidateData): Promise<number> {
    try {
      const query = `
        INSERT INTO election_candidates (
          election_id, member_id, nomination_date, nomination_statement
        ) VALUES (?, ?, CURRENT_DATE, ?)
      `;

      const params = [
        candidateData.election_id,
        candidateData.member_id,
        candidateData.nomination_statement || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to add candidate', error);
    }
  }

  // Update candidate
  static async updateCandidate(id: number, updateData: UpdateCandidateData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.candidate_status !== undefined) {
        fields.push('candidate_status = ?');
        params.push(updateData.candidate_status);
      }

      if (updateData.nomination_statement !== undefined) {
        fields.push('nomination_statement = ?');
        params.push(updateData.nomination_statement);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE election_candidates SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update candidate', error);
    }
  }

  // Cast vote
  static async castVote(electionId: number, candidateId: number, voterMemberId: number): Promise<number> {
    try {
      // Check if voter has already voted
      const existingVote = await executeQuerySingle(
        'SELECT id FROM election_votes WHERE election_id = ? AND voter_member_id = ?',
        [electionId, voterMemberId]
      );

      if (existingVote) {
        throw new Error('Voter has already cast a vote in this election');
      }

      // Cast the vote
      const voteQuery = `
        INSERT INTO election_votes (election_id, candidate_id, voter_member_id, vote_datetime)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const voteResult = await executeQuery(voteQuery, [electionId, candidateId, voterMemberId]);

      // Update candidate vote count
      await executeQuery(
        'UPDATE election_candidates SET votes_received = votes_received + 1 WHERE id = ?',
        [candidateId]
      );

      // Update election total votes cast
      await executeQuery(
        'UPDATE leadership_elections SET total_votes_cast = total_votes_cast + 1 WHERE id = ?',
        [electionId]
      );

      return voteResult.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to cast vote', error);
    }
  }

  // Get election results
  static async getElectionResults(electionId: number): Promise<ElectionResults | null> {
    try {
      // Get election details
      const electionQuery = `
        SELECT 
          le.*,
          lp.position_name
        FROM leadership_elections le
        LEFT JOIN leadership_positions lp ON le.position_id = lp.id
        WHERE le.id = ?
      `;

      const election = await executeQuerySingle(electionQuery, [electionId]);
      if (!election) return null;

      // Get candidates with vote counts
      const candidatesQuery = `
        SELECT 
          ec.id as candidate_id,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          m.membership_number,
          ec.votes_received,
          ec.is_winner,
          CASE 
            WHEN ? > 0 THEN ROUND((ec.votes_received / ?) * 100, 2)
            ELSE 0
          END as vote_percentage
        FROM election_candidates ec
        LEFT JOIN members m ON ec.member_id = m.member_id
        WHERE ec.election_id = ? AND ec.candidate_status = 'Approved'
        ORDER BY ec.votes_received DESC
      `;

      const candidates = await executeQuery(candidatesQuery, [
        election.total_votes_cast,
        election.total_votes_cast,
        electionId
      ]);

      const voterTurnout = election.total_eligible_voters > 0 
        ? Math.round((election.total_votes_cast / election.total_eligible_voters) * 100 * 100) / 100
        : 0;

      return {
        election_id: election.id,
        election_name: election.election_name,
        position_name: election.position_name,
        total_eligible_voters: election.total_eligible_voters,
        total_votes_cast: election.total_votes_cast,
        voter_turnout_percentage: voterTurnout,
        candidates,
        election_status: election.election_status,
        voting_completed_at: election.election_status === 'Completed' ? election.updated_at : undefined
      };
    } catch (error) {
      throw createDatabaseError('Failed to get election results', error);
    }
  }

  // Finalize election (determine winner)
  static async finalizeElection(electionId: number): Promise<boolean> {
    try {
      // Get the candidate with the most votes
      const winnerQuery = `
        SELECT id, votes_received
        FROM election_candidates 
        WHERE election_id = ? AND candidate_status = 'Approved'
        ORDER BY votes_received DESC 
        LIMIT 1
      `;

      const winner = await executeQuerySingle(winnerQuery, [electionId]);
      if (!winner) {
        throw new Error('No approved candidates found for this election');
      }

      // Mark the winner
      await executeQuery(
        'UPDATE election_candidates SET is_winner = TRUE WHERE id = ?',
        [winner.id]
      );

      // Update election status
      await executeQuery(
        'UPDATE leadership_elections SET election_status = "Completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [electionId]
      );

      return true;
    } catch (error) {
      throw createDatabaseError('Failed to finalize election', error);
    }
  }

  // Check if member can vote in election
  static async canMemberVote(electionId: number, memberId: number): Promise<boolean> {
    try {
      // Check if member has already voted
      const existingVote = await executeQuerySingle(
        'SELECT id FROM election_votes WHERE election_id = ? AND voter_member_id = ?',
        [electionId, memberId]
      );

      if (existingVote) return false;

      // Check if election is in voting phase
      const election = await executeQuerySingle(
        'SELECT election_status FROM leadership_elections WHERE id = ?',
        [electionId]
      );

      return election?.election_status === 'Voting Open';
    } catch (error) {
      throw createDatabaseError('Failed to check voting eligibility', error);
    }
  }

  // Get elections count
  static async getElectionsCount(filters: any = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.hierarchy_level) {
        whereClause += ' AND hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }

      if (filters.entity_id) {
        whereClause += ' AND entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.election_status) {
        whereClause += ' AND election_status = ?';
        params.push(filters.election_status);
      }

      const query = `SELECT COUNT(*) as count FROM leadership_elections ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);

      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get elections count', error);
    }
  }
}
