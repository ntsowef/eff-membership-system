import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError, createValidationError } from '../middleware/errorHandler';

// =====================================================
// Type Definitions
// =====================================================

export type Lge2026CandidateStatus = 'nominated' | 'approved' | 'withdrawn';

export interface Lge2026Candidate {
  candidate_id: number;
  ward_code: string;
  member_id: number;
  status: Lge2026CandidateStatus;
  nominated_by?: number | null;
  nominated_at: string;
  decided_by?: number | null;
  decided_at?: string | null;
  notes?: string | null;
  campaign_statement?: string | null;
  cv_path?: string | null;
  cv_original_name?: string | null;
  iec_form_c2_path?: string | null;
  iec_form_c2_original_name?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields (member + nominator)
  member_name?: string;
  member_firstname?: string;
  member_surname?: string;
  id_number?: string;
  cell_number?: string;
  email?: string;
  membership_status?: string;
  voting_district_code?: string;
  voting_district_name?: string;
  ward_name?: string;
  nominated_by_name?: string;
  decided_by_name?: string;
}

// =====================================================
// Model
// =====================================================

const CANDIDATE_SELECT_COLS = `
  c.candidate_id,
  c.ward_code,
  c.member_id,
  c.status,
  c.nominated_by,
  c.nominated_at,
  c.decided_by,
  c.decided_at,
  c.notes,
  c.campaign_statement,
  c.cv_path,
  c.cv_original_name,
  c.iec_form_c2_path,
  c.iec_form_c2_original_name,
  c.created_at,
  c.updated_at,
  CONCAT(m.firstname, ' ', m.surname) AS member_name,
  m.firstname AS member_firstname,
  m.surname AS member_surname,
  m.id_number,
  m.cell_number,
  m.email,
  m.voting_district_code,
  vd.voting_district_name,
  w.ward_name,
  COALESCE(ms.status_name, 'Unknown') AS membership_status,
  un.name AS nominated_by_name,
  ud.name AS decided_by_name
`;

const CANDIDATE_JOINS = `
  FROM lge2026_candidates c
  JOIN members_consolidated m ON c.member_id = m.member_id
  JOIN wards w ON c.ward_code = w.ward_code
  LEFT JOIN voting_districts vd
         ON m.voting_district_code = vd.voting_district_code
        AND vd.ward_code = c.ward_code
  LEFT JOIN memberships mb ON m.member_id = mb.member_id
  LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
  LEFT JOIN users un ON c.nominated_by = un.user_id
  LEFT JOIN users ud ON c.decided_by = ud.user_id
`;

export class Lge2026Model {
  static async getCandidatesByWard(wardCode: string): Promise<Lge2026Candidate[]> {
    try {
      const query = `
        SELECT ${CANDIDATE_SELECT_COLS}
        ${CANDIDATE_JOINS}
        WHERE c.ward_code = $1
        ORDER BY
          CASE c.status WHEN 'approved' THEN 0 WHEN 'nominated' THEN 1 ELSE 2 END,
          c.nominated_at DESC
      `;
      return await executeQuery<Lge2026Candidate>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch LGE2026 candidates for ward', error);
    }
  }

  static async getActiveCandidateByWard(wardCode: string): Promise<Lge2026Candidate | null> {
    try {
      const query = `
        SELECT ${CANDIDATE_SELECT_COLS}
        ${CANDIDATE_JOINS}
        WHERE c.ward_code = $1
          AND c.status IN ('nominated', 'approved')
        ORDER BY
          CASE c.status WHEN 'approved' THEN 0 WHEN 'nominated' THEN 1 END,
          c.nominated_at DESC
        LIMIT 1
      `;
      return await executeQuerySingle<Lge2026Candidate>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch active LGE2026 candidate for ward', error);
    }
  }

  static async getCandidateById(candidateId: number): Promise<Lge2026Candidate | null> {
    try {
      const query = `
        SELECT ${CANDIDATE_SELECT_COLS}
        ${CANDIDATE_JOINS}
        WHERE c.candidate_id = $1
      `;
      return await executeQuerySingle<Lge2026Candidate>(query, [candidateId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch LGE2026 candidate', error);
    }
  }

  /**
   * Eligible members for nomination in a ward. Mirrors WardAuditModel.getWardMembers
   * but reports any existing LGE2026 candidacy rather than legacy delegate counts.
   */
  static async getEligibleWardMembers(wardCode: string): Promise<any[]> {
    try {
      const query = `
        SELECT
          m.member_id,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', m.surname) AS full_name,
          m.id_number,
          m.cell_number,
          m.email,
          m.ward_code,
          m.voting_district_code,
          vd.voting_district_name,
          COALESCE(ms.status_name, 'Unknown') AS membership_status,
          c.candidate_id AS existing_candidate_id,
          c.status AS existing_candidate_status
        FROM members_consolidated m
        LEFT JOIN memberships mb ON m.member_id = mb.member_id
        LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
        LEFT JOIN voting_districts vd
               ON m.voting_district_code = vd.voting_district_code
              AND vd.ward_code = m.ward_code
        LEFT JOIN lge2026_candidates c
               ON c.member_id = m.member_id
              AND c.ward_code = m.ward_code
              AND c.status IN ('nominated','approved')
        WHERE m.ward_code = $1
          AND m.firstname IS NOT NULL
          AND m.surname IS NOT NULL
        ORDER BY m.surname, m.firstname
      `;
      return await executeQuery<any>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch eligible ward members', error);
    }
  }

  static async nominateCandidate(data: {
    ward_code: string;
    member_id: number;
    nominated_by: number;
    notes?: string | null;
    campaign_statement?: string | null;
    cv_path?: string | null;
    cv_original_name?: string | null;
    iec_form_c2_path?: string | null;
    iec_form_c2_original_name?: string | null;
  }): Promise<Lge2026Candidate> {
    try {
      // Verify member belongs to this ward (defensive — UI should already enforce this).
      const memberWard = await executeQuerySingle<{ ward_code: string | null }>(
        'SELECT ward_code FROM members_consolidated WHERE member_id = $1',
        [data.member_id]
      );
      if (!memberWard) {
        throw createValidationError('Member not found');
      }
      if (memberWard.ward_code !== data.ward_code) {
        throw createValidationError(
          'Member does not belong to the specified ward and cannot be nominated as its Ward Councillor Candidate'
        );
      }

      // Enforce one-active-per-ward at the application layer too (DB has partial unique index).
      const existing = await this.getActiveCandidateByWard(data.ward_code);
      if (existing) {
        throw createValidationError(
          `Ward ${data.ward_code} already has an active candidate (${existing.member_name}). ` +
          `Withdraw the existing candidate before nominating a new one.`
        );
      }

      const insert = await executeQuerySingle<{ candidate_id: number }>(
        `INSERT INTO lge2026_candidates
           (ward_code, member_id, status, nominated_by, notes, campaign_statement,
            cv_path, cv_original_name, iec_form_c2_path, iec_form_c2_original_name)
         VALUES ($1, $2, 'nominated', $3, $4, $5, $6, $7, $8, $9)
         RETURNING candidate_id`,
        [
          data.ward_code,
          data.member_id,
          data.nominated_by,
          data.notes ?? null,
          data.campaign_statement ?? null,
          data.cv_path ?? null,
          data.cv_original_name ?? null,
          data.iec_form_c2_path ?? null,
          data.iec_form_c2_original_name ?? null,
        ]
      );
      if (!insert) {
        throw createDatabaseError('Failed to insert LGE2026 candidate');
      }
      const candidate = await this.getCandidateById(insert.candidate_id);
      if (!candidate) {
        throw createDatabaseError('Candidate inserted but could not be re-fetched');
      }
      return candidate;
    } catch (error: any) {
      if (error?.name === 'ValidationError') throw error;
      throw createDatabaseError('Failed to nominate LGE2026 candidate', error);
    }
  }

  static async updateCandidateStatus(
    candidateId: number,
    newStatus: Lge2026CandidateStatus,
    decidedBy: number,
    notes?: string | null
  ): Promise<Lge2026Candidate> {
    try {
      const current = await this.getCandidateById(candidateId);
      if (!current) {
        throw createValidationError('Candidate not found');
      }

      // Transitions allowed:
      //   nominated  -> approved | withdrawn
      //   approved   -> withdrawn
      //   withdrawn  -> (terminal)
      const allowed: Record<Lge2026CandidateStatus, Lge2026CandidateStatus[]> = {
        nominated: ['approved', 'withdrawn'],
        approved: ['withdrawn'],
        withdrawn: [],
      };
      if (!allowed[current.status].includes(newStatus)) {
        throw createValidationError(
          `Cannot transition candidate from '${current.status}' to '${newStatus}'`
        );
      }

      await executeQuery(
        `UPDATE lge2026_candidates
            SET status = $1,
                decided_by = $2,
                decided_at = CURRENT_TIMESTAMP,
                notes = COALESCE($3, notes)
          WHERE candidate_id = $4`,
        [newStatus, decidedBy, notes ?? null, candidateId]
      );

      const updated = await this.getCandidateById(candidateId);
      if (!updated) {
        throw createDatabaseError('Candidate updated but could not be re-fetched');
      }
      return updated;
    } catch (error: any) {
      if (error?.name === 'ValidationError') throw error;
      throw createDatabaseError('Failed to update LGE2026 candidate status', error);
    }
  }

  /**
   * Update document paths for an existing candidate (CV / IEC Form C2).
   */
  static async updateCandidateDocuments(
    candidateId: number,
    updates: Record<string, string | null>
  ): Promise<void> {
    try {
      const allowed = ['cv_path', 'cv_original_name', 'iec_form_c2_path', 'iec_form_c2_original_name'];
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const [key, value] of Object.entries(updates)) {
        if (allowed.includes(key)) {
          sets.push(`${key} = $${idx++}`);
          params.push(value);
        }
      }
      if (sets.length === 0) return;
      params.push(candidateId);
      await executeQuery(
        `UPDATE lge2026_candidates SET ${sets.join(', ')} WHERE candidate_id = $${idx}`,
        params
      );
    } catch (error) {
      throw createDatabaseError('Failed to update candidate documents', error);
    }
  }

  /**
   * Update editable member details (name, phone, email) in members_consolidated.
   */
  static async updateMemberDetails(
    memberId: number,
    data: { firstname: string; surname: string; cell_number: string | null; email: string | null }
  ): Promise<void> {
    try {
      await executeQuery(
        `UPDATE members_consolidated
            SET firstname = $1,
                surname = $2,
                cell_number = $3,
                email = $4
          WHERE member_id = $5`,
        [data.firstname, data.surname, data.cell_number, data.email, memberId]
      );
    } catch (error) {
      throw createDatabaseError('Failed to update member details', error);
    }
  }

  static async getAllCandidates(filters: {
    province_code?: string;
    municipality_code?: string;
    ward_code?: string;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ candidates: Lge2026Candidate[]; total: number }> {
    try {
      const limit = filters.limit ?? 200;
      const offset = filters.offset ?? 0;

      const additionalCols = `,
        mu.municipality_name,
        mu.municipality_code,
        COALESCE(d.province_code, pd.province_code) AS province_code,
        COALESCE(p.province_name, pp.province_name) AS province_name`;

      const additionalJoins = `
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN districts pd ON pm.district_code = pd.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN provinces pp ON pd.province_code = pp.province_code`;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (filters.province_code) {
        conditions.push(`COALESCE(d.province_code, pd.province_code) = $${paramIdx++}`);
        params.push(filters.province_code);
      }
      if (filters.municipality_code) {
        conditions.push(`mu.municipality_code = $${paramIdx++}`);
        params.push(filters.municipality_code);
      }
      if (filters.ward_code) {
        conditions.push(`c.ward_code = $${paramIdx++}`);
        params.push(filters.ward_code);
      }
      if (filters.search) {
        const searchParam = `%${filters.search}%`;
        conditions.push(`(LOWER(CONCAT(m.firstname, ' ', m.surname)) LIKE LOWER($${paramIdx}) OR LOWER(m.id_number) LIKE LOWER($${paramIdx}))`);
        paramIdx++;
        params.push(searchParam);
      }
      if (filters.status && filters.status !== 'all') {
        conditions.push(`c.status = $${paramIdx++}`);
        params.push(filters.status);
      }

      const whereClause = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : '';

      const countQuery = `
        SELECT COUNT(*) AS total
        ${CANDIDATE_JOINS}
        ${additionalJoins}
        ${whereClause}
      `;
      const countResult = await executeQuerySingle<{ total: string }>(countQuery, params);
      const total = parseInt(countResult?.total ?? '0', 10);

      const dataQuery = `
        SELECT ${CANDIDATE_SELECT_COLS}${additionalCols}
        ${CANDIDATE_JOINS}
        ${additionalJoins}
        ${whereClause}
        ORDER BY
          CASE c.status WHEN 'approved' THEN 0 WHEN 'nominated' THEN 1 ELSE 2 END,
          m.surname, m.firstname
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;
      const dataParams = [...params, limit, offset];
      const candidates = await executeQuery<Lge2026Candidate>(dataQuery, dataParams);

      return { candidates, total };
    } catch (error) {
      throw createDatabaseError('Failed to fetch all LGE2026 candidates', error);
    }
  }
}

