import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import {
  MeetingModel,
  MeetingType,
  OrganizationalRole,
  MemberRole,
  AutoInvitationRequest,
  InvitationTarget,
  MeetingAttendance
} from '../models/meetings';
import { MemberModel } from '../models/members';

/**
 * Hierarchical Meeting Service
 * Handles automatic invitation logic based on organizational hierarchy and meeting types
 */
export class HierarchicalMeetingService {

  private static expandHierarchyLevelAliases(hierarchyLevel: string): string[] {
    switch (hierarchyLevel) {
      case 'Provincial':
      case 'Province':
        return ['Provincial', 'Province'];
      case 'Municipal':
      case 'Municipality':
        return ['Municipal', 'Municipality'];
      case 'Regional':
      case 'Region':
        return ['Regional', 'Region'];
      case 'Ward':
      case 'Branch':
        return ['Ward', 'Branch'];
      default:
        return [hierarchyLevel];
    }
  }

  /**
   * Get all meeting types with hierarchical information
   */
  static async getMeetingTypes(hierarchyLevel?: string): Promise<MeetingType[]> {
    try {
      let query = `
        SELECT
          type_id,
          type_name,
          type_code,
          description,
          hierarchy_level,
          meeting_category,
          frequency_type,
          default_duration_minutes,
          requires_quorum,
          min_notice_days,
          max_notice_days,
          auto_invite_rules,
          is_active
        FROM meeting_types
        WHERE is_active = TRUE
      `;

      const params: any[] = [];

      if (hierarchyLevel) {
        const aliases = this.expandHierarchyLevelAliases(hierarchyLevel);
        if (aliases.length === 1) {
          query += ` AND hierarchy_level = $${params.length + 1}`;
          params.push(aliases[0]);
        } else {
          const placeholders = aliases.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
          query += ` AND hierarchy_level IN (${placeholders})`;
          params.push(...aliases);
        }
      }

      query += ` ORDER BY
        CASE hierarchy_level
          WHEN 'National' THEN 1
          WHEN 'Provincial' THEN 2
          WHEN 'Province' THEN 2
          WHEN 'Regional' THEN 3
          WHEN 'Region' THEN 3
          WHEN 'Municipal' THEN 4
          WHEN 'Municipality' THEN 4
          WHEN 'Ward' THEN 5
          WHEN 'Branch' THEN 5
          ELSE 6
        END,
        type_name
      `;

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get meeting types', error);
    }
  }

  /**
   * Generate automatic invitations based on meeting type and hierarchy
   */
  static async generateAutomaticInvitations(meetingTypeId: number, entityId?: number, entityType?: string): Promise<any[]> {
    try {
      // Get meeting type with invitation rules
      const meetingType = await executeQuery(`
        SELECT type_id, type_name, type_code, hierarchy_level, auto_invite_rules
        FROM meeting_types
        WHERE type_id = $1 AND is_active = TRUE
      `, [meetingTypeId]);

      if (!meetingType || meetingType.length === 0) {
        throw new Error('Meeting type not found');
      }

      const type = meetingType[0];
      const unifiedTypeCodes = new Set([
        'cct_national',
        'cct_nec_quarterly',
        'war_council',
        'pct_provincial',
        'pct_ordinary',
        'provincial_agm',
        'pga',
        'special_pga',
        'ppa',
        'provincial_elective',
        'srct_municipal',
        'srct_ordinary',
        'sub_regional',
        'bct_branch',
        'bct_ordinary',
        'bga_branch',
        'bga',
        'bpa_branch',
        'bpa',
        'branch_general_meeting',
        'branch_meeting',
      ]);

      if (unifiedTypeCodes.has(type.type_code)) {
        return await this.generateAutoInvitations({
          meeting_id: 0,
          meeting_type_id: meetingTypeId,
          hierarchy_level: type.hierarchy_level,
          entity_id: entityId,
          entity_type: entityType,
        });
      }

      const inviteRules = type.auto_invite_rules;

      if (!inviteRules || !inviteRules.invitation_rules) {
        return [];
      }

      const invitations: any[] = [];

      // Process each invitation rule
      for (const rule of inviteRules.invitation_rules) {
        const ruleInvitations = await this.processInvitationRule(rule, type.hierarchy_level, entityId, entityType);
        invitations.push(...ruleInvitations);
      }

      // Remove duplicates based on member_id
      const uniqueInvitations = invitations.filter((invitation, index, self) =>
        index === self.findIndex(inv => inv.member_id === invitation.member_id)
      );

      return uniqueInvitations;
    } catch (error) {
      throw createDatabaseError('Failed to generate automatic invitations', error);
    }
  }

  /**
   * Process a single invitation rule
   */
  private static async processInvitationRule(rule: any, meetingHierarchyLevel: string, entityId?: number, entityType?: string): Promise<any[]> {
    try {
      const invitations: any[] = [];

      switch (rule.type) {
        case 'position_based':
          return await this.getPositionBasedInvitations(rule, meetingHierarchyLevel, entityId, entityType);

        case 'all_members':
          return await this.getAllMembersInvitations(rule, meetingHierarchyLevel, entityId, entityType);

        case 'war_council_members':
          return await this.getWarCouncilInvitations();

        default:
          console.warn(`Unknown invitation rule type: ${rule.type}`);
          return [];
      }
    } catch (error) {
      console.error('Error processing invitation rule:', error);
      return [];
    }
  }

  /**
   * Get invitations based on leadership positions
   */
  private static async getPositionBasedInvitations(rule: any, meetingHierarchyLevel: string, entityId?: number, entityType?: string): Promise<any[]> {
    try {
      let query = `
        SELECT DISTINCT
          la.member_id,
          m.firstname,
          m.surname,
          m.email,
          lp.position_name,
          la.hierarchy_level,
          la.entity_id
        FROM leadership_appointments la
        JOIN leadership_positions lp ON la.position_id = lp.id
        JOIN members_consolidated m ON la.member_id = m.member_id
        WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
      `;

      const params: any[] = [];

      // Filter by hierarchy level
      if (rule.hierarchy_level) {
        query += ` AND la.hierarchy_level = $${params.length + 1}`;
        params.push(rule.hierarchy_level);
      }

      // Filter by specific positions
      if (rule.positions && rule.positions.length > 0) {
        const positionPlaceholders = rule.positions.map((_: any, index: number) => `$${params.length + index + 1}`).join(',');
        query += ` AND lp.position_name IN (${positionPlaceholders})`;
        params.push(...rule.positions);
      }

      // Handle entity-specific filtering
      if (rule.entity_specific && entityId) {
        query += ` AND la.entity_id = $${params.length + 1}`;
        params.push(entityId);
      } else if (rule.all_entities) {
        // Include all entities for this hierarchy level (e.g., all provinces for CCT meetings)
        // No additional filtering needed
      }

      const results = await executeQuery(query, params);

      return results.map((row: any) => ({
        member_id: row.member_id,
        member_name: `${row.firstname} ${row.surname || ''}`.trim(),
        member_email: row.email,
        position_name: row.position_name,
        hierarchy_level: row.hierarchy_level,
        entity_id: row.entity_id,
        invitation_priority: this.getInvitationPriority(row.position_name),
        attendance_type: 'Required',
        voting_rights: true
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get position-based invitations', error);
    }
  }

  /**
   * Get invitations for all members in a geographic area
   */
  private static async getAllMembersInvitations(rule: any, meetingHierarchyLevel: string, entityId?: number, entityType?: string): Promise<any[]> {
    try {
      let query = `
        SELECT DISTINCT
          m.member_id,
          m.firstname,
          m.surname,
          m.email
        FROM members_consolidated m
        WHERE m.membership_status = 'Active'
      `;

      const params: any[] = [];

      // Filter by geographic entity
      if (rule.entity_specific && entityId && entityType) {
        switch (entityType.toLowerCase()) {
          case 'province':
            query += ` AND m.province_id = $${params.length + 1}`;
            params.push(entityId);
            break;
          case 'municipality':
            query += ` AND m.municipality_id = $${params.length + 1}`;
            params.push(entityId);
            break;
          case 'ward':
            query += ` AND m.ward_code = $${params.length + 1}`;
            params.push(entityId.toString());
            break;
        }
      }

      query += ` ORDER BY m.surname, m.firstname LIMIT 1000`; // Limit for performance

      const results = await executeQuery(query, params);

      return results.map((row: any) => ({
        member_id: row.member_id,
        member_name: `${row.firstname} ${row.surname || ''}`.trim(),
        member_email: row.email,
        position_name: 'Member',
        hierarchy_level: meetingHierarchyLevel,
        entity_id: entityId,
        invitation_priority: 1,
        attendance_type: 'Optional',
        voting_rights: true
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get all members invitations', error);
    }
  }

  /**
   * Get War Council member invitations
   */
  private static async getWarCouncilInvitations(): Promise<any[]> {
    try {
      const targets: InvitationTarget[] = [];
      await this.addWarCouncilInvitations(targets, {
        meeting_id: 0,
        meeting_type_id: 0,
        hierarchy_level: 'National',
      });
      return this.removeDuplicateInvitations(targets);
    } catch (error) {
      throw createDatabaseError('Failed to get War Council invitations', error);
    }
  }

  /**
   * Get invitation priority based on position
   */
  private static getInvitationPriority(positionName: string): number {
    const priorityMap: { [key: string]: number } = {
      'President': 10,
      'Deputy President': 9,
      'Secretary General': 9,
      'Deputy Secretary General': 8,
      'National Chairperson': 8,
      'Treasurer General': 7,
      'Provincial Chairperson': 6,
      'Provincial Secretary': 5,
      'Municipal Chairperson': 4,
      'Branch Chairperson': 3,
      'Youth President': 6,
      'Youth Secretary General': 5,
      'Women President': 6,
      'Women Secretary General': 5
    };

    return priorityMap[positionName] || 1;
  }

  /**
   * Get organizational roles for a specific hierarchy level
   */
  static async getOrganizationalRoles(hierarchyLevel?: string): Promise<OrganizationalRole[]> {
    try {
      let query = `
        SELECT * FROM organizational_roles
        WHERE is_active = TRUE
      `;
      const params: any[] = [];

      if (hierarchyLevel) {
        query += ` AND hierarchy_level = $${params.length + 1} `;
        params.push(hierarchyLevel);
      }

      query += ` ORDER BY hierarchy_level, meeting_invitation_priority DESC, role_name`;

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get organizational roles', error);
    }
  }

  /**
   * Get members with their roles for invitation targeting
   */
  static async getMembersWithRoles(
    hierarchyLevel: string,
    entityId?: number,
    entityType?: string
  ): Promise<any[]> {
    try {
      let query = `
        SELECT DISTINCT
          m.member_id,
          m.firstname,
          m.surname,
          m.email,
          m.cell_number as phone_number,
          la.id as appointment_id,
          la.entity_id,
          la.hierarchy_level as entity_type,
          lp.id as position_id,
          lp.position_name as role_name,
          lp.position_code as role_code,
          la.hierarchy_level,
          CASE
            WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'DSECGEN', 'TREASGEN', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN 'Executive'
            WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' OR lp.position_code LIKE 'MEC%' OR lp.position_code LIKE 'BCT%' THEN 'Leadership'
            WHEN lp.position_code LIKE 'H%' THEN 'Leadership'
            ELSE 'Member'
          END as role_category,
          CASE
            WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'DSECGEN', 'TREASGEN', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN TRUE
            WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' OR lp.position_code LIKE 'MEC%' OR lp.position_code LIKE 'BCT%' THEN TRUE
            ELSE FALSE
          END as has_voting_rights,
          CASE
            WHEN lp.position_code IN ('PRES', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN TRUE
            ELSE FALSE
          END as can_chair_meetings,
          CASE
            WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'NCHAIR') THEN 1
            WHEN lp.position_code IN ('DSECGEN', 'TREASGEN', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN 2
            WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' THEN 3
            ELSE 4
          END as meeting_invitation_priority
        FROM members_consolidated m
        INNER JOIN leadership_appointments la ON m.member_id = la.member_id
        INNER JOIN leadership_positions lp ON la.position_id = lp.id
        WHERE la.appointment_status = 'Active'
          AND lp.is_active = TRUE

      `;
      const params: any[] = [];

      // Add hierarchy level filter
      if (hierarchyLevel === 'National') {
        query += ` AND lp.hierarchy_level = 'National'`;
      } else {
        query += ` AND (lp.hierarchy_level = $${params.length + 1} OR lp.hierarchy_level = 'National')`;
        params.push(hierarchyLevel);
      }

      // Add entity-specific filters
      if (entityId && entityType) {
        const entityIdParam = params.length + 1;
        const entityTypeParam = params.length + 2;
        query += ` AND (la.entity_id = $${entityIdParam} AND la.hierarchy_level = $${entityTypeParam})`;
        params.push(entityId, entityType);
      }

      query += ` ORDER BY meeting_invitation_priority DESC, m.surname, m.firstname`;

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get members with roles', error);
    }
  }

  /**
   * Generate automatic invitations based on meeting type and hierarchy
   */
  static async generateAutoInvitations(request: AutoInvitationRequest): Promise<InvitationTarget[]> {
    try {
      // Get meeting type details
      const meetingType = await executeQuerySingle(
        'SELECT * FROM meeting_types WHERE type_id = $1',
        [request.meeting_type_id]
      );

      if (!meetingType) {
        throw new Error('Meeting type not found');
      }

      const invitationTargets: InvitationTarget[] = [];

      // Apply invitation logic based on meeting type code
      switch (meetingType.type_code) {
        case 'war_council':
          await this.addWarCouncilInvitations(invitationTargets, request);
          break;
        case 'npa':
          await this.addNPAInvitations(invitationTargets, request);
          break;
        case 'nga':
          await this.addNGAInvitations(invitationTargets, request);
          break;
        case 'cct_national':
        case 'cct_nec_quarterly':
          await this.addNationalCCTInvitations(invitationTargets, request);
          break;
        case 'policy_conference':
        case 'elective_conference':
          await this.addConferenceInvitations(invitationTargets, request);
          break;
        // Provincial Meetings: Provincial Leadership + CCT Deployee + Municipal Chairpersons & Secretaries
        case 'pct_provincial':
        case 'pct_ordinary':
        case 'provincial_agm':
        case 'ppa':
        case 'provincial_elective':
        case 'pga':
        case 'special_pga':
          await this.addProvincialLeadershipAndMunicipalOfficersInvitations(invitationTargets, request);
          break;
        case 'regional_coord':
          await this.addRegionalInvitations(invitationTargets, request);
          break;
        // Municipal / Sub-Regional Meetings: Municipal Leadership + Ward Chairpersons & Secretaries
        case 'srct_municipal':
        case 'srct_ordinary':
        case 'sub_regional':
          await this.addMunicipalLeadershipAndWardOfficersInvitations(invitationTargets, request);
          break;
        // Ward / Branch Leadership Only (BCT)
        case 'bct_branch':
        case 'bct_ordinary':
          await this.addWardLeadershipInvitations(invitationTargets, request);
          break;
        // Ward / Branch General & Assembly Meetings: All Ward Members + Ward Leadership
        case 'bga_branch':
        case 'bga':
        case 'bpa_branch':
        case 'bpa':
        case 'branch_general_meeting':
        case 'branch_meeting':
          await this.addWardMembersAndLeadershipInvitations(invitationTargets, request);
          break;
        default:
          // Generic invitation logic based on hierarchy level
          await this.addGenericHierarchicalInvitations(invitationTargets, request, meetingType.hierarchy_level);
      }

      // Remove duplicates and sort by priority
      const uniqueTargets = this.removeDuplicateInvitations(invitationTargets);
      return uniqueTargets.sort((a, b) => b.invitation_priority - a.invitation_priority);

    } catch (error) {
      throw createDatabaseError('Failed to generate auto invitations', error);
    }
  }

  /**
   * Resolve invitation priority score (higher = higher priority) across National, Provincial, Municipal, and Ward scopes
   */
  private static resolveLeadershipInvitationPriority(
    roleCode: string,
    positionCategory?: string,
    scope: 'National' | 'Provincial' | 'Municipal' | 'Ward' = 'National'
  ): number {
    const code = (roleCode || '').toUpperCase();

    if (scope === 'Provincial') {
      if (code === 'PCHAIR' || code.startsWith('PCHAIR_') || code.startsWith('CCT_') || code.startsWith('CCT-')) return 9;
      if (code === 'PDCHAIR' || code.startsWith('PDCHAIR_') || code === 'PSEC' || code.startsWith('PSEC_')) return 8;
      if (code === 'PDSEC' || code.startsWith('PDSEC_') || code === 'PTREAS' || code.startsWith('PTREAS_')) return 7;
      if (
        positionCategory === 'PCT' ||
        code.startsWith('PCT') ||
        code.startsWith('PEC') ||
        code.startsWith('PYOUTH') ||
        code.startsWith('PWOMEN')
      ) {
        return 6;
      }
      if (code === 'MCHAIR' || code.startsWith('MCHAIR_')) return 5;
      if (code === 'MSEC' || code.startsWith('MSEC_')) return 4;
      return 3;
    }

    if (scope === 'Municipal') {
      if (code === 'MCHAIR' || code.startsWith('MCHAIR_')) return 9;
      if (code === 'MDCHAIR' || code.startsWith('MDCHAIR_') || code === 'MSEC' || code.startsWith('MSEC_')) return 8;
      if (code === 'MDSEC' || code.startsWith('MDSEC_') || code === 'MTREAS' || code.startsWith('MTREAS_')) return 7;
      if (
        positionCategory === 'Additional Member' ||
        code.startsWith('MADD') ||
        code.startsWith('MEC') ||
        code.startsWith('SRCT') ||
        code.startsWith('MORG') ||
        code.startsWith('MYOUTH') ||
        code.startsWith('MWOMEN')
      ) {
        return 6;
      }
      if (code === 'WCHAIR' || code.startsWith('WCHAIR_') || code.endsWith('-BRANCHCHAIRPERSON')) return 5;
      if (code === 'WSEC' || code.startsWith('WSEC_') || code.endsWith('-BRANCHSECRETARY')) return 4;
      return 3;
    }

    if (scope === 'Ward') {
      if (code === 'WCHAIR' || code.startsWith('WCHAIR_') || code.endsWith('-BRANCHCHAIRPERSON')) return 9;
      if (code === 'WDCHAIR' || code.startsWith('WDCHAIR_') || code === 'WSEC' || code.startsWith('WSEC_') || code.endsWith('-BRANCHSECRETARY')) return 8;
      if (code === 'WDSEC' || code.startsWith('WDSEC_') || code === 'WTREAS' || code.startsWith('WTREAS_') || code.endsWith('-BRANCHTREASURER')) return 7;
      if (
        positionCategory === 'BCT' ||
        positionCategory === 'Branch Leadership' ||
        code.startsWith('BCT') ||
        code.startsWith('WORG') ||
        code.startsWith('WYOUTH') ||
        code.startsWith('WWOMEN')
      ) {
        return 6;
      }
      return 5;
    }

    // Default: National scope
    if (code === 'PRES') return 10;
    if (code === 'DPRES' || code === 'SG' || code === 'SECGEN') return 9;
    if (['DSG', 'DSECGEN', 'NCHAIR', 'TG', 'TREASGEN', 'DTREASGEN'].includes(code)) return 8;
    if (
      code.startsWith('CCT_') ||
      code.startsWith('CCT-') ||
      ['HOP', 'HOC', 'NORG', 'PYOUTH', 'PWOMEN', 'NYOUTH_PRES', 'NYOUTH_SG', 'NWOMEN_PRES', 'NWOMEN_SG'].includes(code)
    ) {
      return 7;
    }
    if (positionCategory === 'CCT' || /^CCT\d+$/.test(code) || code.startsWith('NEC')) return 6;
    if (code === 'PCHAIR' || code.startsWith('PCHAIR_')) return 5;
    if (code === 'PSEC' || code.startsWith('PSEC_')) return 4;
    return 3;
  }

  /**
   * Resolve numeric IDs and geographic codes for Province, Municipality, and Ward from request
   */
  private static async resolveGeographicContext(request: AutoInvitationRequest): Promise<{
    provinceId?: number;
    provinceCode?: string;
    municipalityId?: number;
    municipalityCode?: string;
    wardId?: number;
    wardCode?: string;
  }> {
    let provinceId: number | undefined;
    let provinceCode = request.province_code ? request.province_code.trim() : undefined;
    let municipalityId: number | undefined;
    let municipalityCode = request.municipality_code ? request.municipality_code.trim() : undefined;
    let wardId: number | undefined;
    let wardCode = request.ward_code ? request.ward_code.trim() : undefined;

    const rawLevel = (request.entity_type || request.hierarchy_level || '').trim();

    // 1. Resolve Ward context when ward_code or Ward/Branch entity_id is present
    if (wardCode) {
      const wardRow = await executeQuerySingle<any>(
        `SELECT w.ward_id, w.ward_code, w.municipality_code, m.municipality_id, COALESCE(m.province_code, d.province_code) AS province_code
         FROM wards w
         LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
         LEFT JOIN districts d ON m.district_code = d.district_code
         WHERE w.ward_code = $1
         LIMIT 1`,
        [wardCode]
      );
      if (wardRow) {
        wardId = Number(wardRow.ward_id);
        wardCode = wardRow.ward_code;
        municipalityCode = municipalityCode || wardRow.municipality_code || undefined;
        municipalityId = municipalityId || (wardRow.municipality_id ? Number(wardRow.municipality_id) : undefined);
        provinceCode = provinceCode || wardRow.province_code || undefined;
      }
    } else if (request.entity_id && ['Ward', 'Branch'].includes(rawLevel)) {
      const wardRow = await executeQuerySingle<any>(
        `SELECT w.ward_id, w.ward_code, w.municipality_code, m.municipality_id, COALESCE(m.province_code, d.province_code) AS province_code
         FROM wards w
         LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
         LEFT JOIN districts d ON m.district_code = d.district_code
         WHERE w.ward_id = $1
         LIMIT 1`,
        [request.entity_id]
      );
      if (wardRow) {
        wardId = Number(wardRow.ward_id);
        wardCode = wardRow.ward_code;
        municipalityCode = municipalityCode || wardRow.municipality_code || undefined;
        municipalityId = municipalityId || (wardRow.municipality_id ? Number(wardRow.municipality_id) : undefined);
        provinceCode = provinceCode || wardRow.province_code || undefined;
      } else {
        wardId = request.entity_id;
      }
    }

    // 2. Resolve Municipality context when municipality_code or Municipality/Municipal entity_id is present
    if (municipalityCode && !municipalityId) {
      const munRow = await executeQuerySingle<any>(
        `SELECT m.municipality_id, m.municipality_code, COALESCE(m.province_code, d.province_code) AS province_code
         FROM municipalities m
         LEFT JOIN districts d ON m.district_code = d.district_code
         WHERE m.municipality_code = $1
         LIMIT 1`,
        [municipalityCode]
      );
      if (munRow) {
        municipalityId = Number(munRow.municipality_id);
        municipalityCode = munRow.municipality_code;
        provinceCode = provinceCode || munRow.province_code || undefined;
      }
    } else if (request.entity_id && ['Municipality', 'Municipal'].includes(rawLevel) && !municipalityId) {
      const munRow = await executeQuerySingle<any>(
        `SELECT m.municipality_id, m.municipality_code, COALESCE(m.province_code, d.province_code) AS province_code
         FROM municipalities m
         LEFT JOIN districts d ON m.district_code = d.district_code
         WHERE m.municipality_id = $1
         LIMIT 1`,
        [request.entity_id]
      );
      if (munRow) {
        municipalityId = Number(munRow.municipality_id);
        municipalityCode = munRow.municipality_code;
        provinceCode = provinceCode || munRow.province_code || undefined;
      } else {
        municipalityId = request.entity_id;
      }
    }

    // 3. Resolve Province context when province_code or Province/Provincial entity_id is present
    if (provinceCode) {
      const provRow = await executeQuerySingle<any>(
        `SELECT province_id, province_code FROM provinces WHERE province_code = $1 LIMIT 1`,
        [provinceCode]
      );
      if (provRow) {
        provinceId = Number(provRow.province_id);
        provinceCode = provRow.province_code;
      }
    } else if (request.entity_id && ['Province', 'Provincial'].includes(rawLevel)) {
      const provRow = await executeQuerySingle<any>(
        `SELECT province_id, province_code FROM provinces WHERE province_id = $1 LIMIT 1`,
        [request.entity_id]
      );
      if (provRow) {
        provinceId = Number(provRow.province_id);
        provinceCode = provRow.province_code;
      } else {
        provinceId = request.entity_id;
      }
    }

    return {
      provinceId,
      provinceCode,
      municipalityId,
      municipalityCode,
      wardId,
      wardCode,
    };
  }

  /**
   * War Council Meeting Invitations
   * Attendees: Core Top 6 National Officials + 9 Provincial CCT Deployees
   */
  private static async addWarCouncilInvitations(
    targets: InvitationTarget[],
    _request: AutoInvitationRequest
  ): Promise<void> {
    const rows = await executeQuery(`
      SELECT DISTINCT
        m.member_id,
        TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) AS member_name,
        CASE WHEN m.email LIKE '%@%' THEN TRIM(m.email) ELSE '' END AS member_email,
        COALESCE(m.cell_number, '') AS member_phone,
        COALESCE(NULLIF(m.membership_number, ''), 'MEM' || LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')) AS membership_number,
        lp.position_name AS role_name,
        lp.position_code AS role_code,
        lp.position_category,
        lp.position_order
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members_consolidated m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND (
          lp.position_code IN ('PRES', 'DPRES', 'SG', 'SECGEN', 'DSG', 'DSECGEN', 'NCHAIR', 'TG', 'TREASGEN', 'DTREASGEN')
          OR LEFT(lp.position_code, 4) = 'CCT_'
          OR LEFT(lp.position_code, 4) = 'CCT-'
          OR (lp.position_category = 'Deployment' AND LEFT(lp.position_code, 3) = 'CCT')
        )
      ORDER BY lp.position_order ASC, m.member_id ASC
    `);

    for (const row of rows) {
      targets.push({
        member_id: row.member_id,
        member_name: String(row.member_name || '').replace(/\s+/g, ' ').trim() || 'Unknown Member',
        member_email: row.member_email || '',
        member_phone: row.member_phone || '',
        membership_number: row.membership_number || '',
        attendance_type: 'Required',
        role_in_meeting: row.role_name,
        voting_rights: true,
        invitation_priority: this.resolveLeadershipInvitationPriority(row.role_code, row.position_category),
      });
    }
  }

  /**
   * National People's Assembly Invitations
   * Attendees: Representatives from all branches across all nine provinces
   */
  private static async addNPAInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest
  ): Promise<void> {
    // Get all branch delegates from all provinces
    const query = `
      SELECT DISTINCT
        m.member_id,
        m.firstname,
        m.surname,
        lp.position_name as role_name,
        CASE
          WHEN lp.position_code IN ('WCHAIR', 'WSEC', 'WTREAS') THEN TRUE
          ELSE FALSE
        END as has_voting_rights,
        CASE
          WHEN lp.position_code = 'WCHAIR' THEN 1
          WHEN lp.position_code IN ('WSEC', 'WTREAS') THEN 2
          ELSE 3
        END as meeting_invitation_priority,
        la.entity_id,
        la.hierarchy_level as entity_type,
        lp.position_order
      FROM members_consolidated m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND (mst.is_active = TRUE OR mst.status_id IS NULL)
        AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE)
        AND lp.position_code IN ('WCHAIR', 'WSEC', 'WTREAS', 'WORG', 'WYOUTH', 'WWOMEN')
      ORDER BY la.hierarchy_level, la.entity_id, lp.position_order
    `;

    const branchRepresentatives = await executeQuery(query);

    for (const member of branchRepresentatives) {
      targets.push({
        member_id: member.member_id,
        attendance_type: 'Required',
        role_in_meeting: '${member.role_name} - ${member.entity_type} ' + member.entity_id + '',
        voting_rights: member.has_voting_rights,
        invitation_priority: member.meeting_invitation_priority
      });
    }

    // Also include national leadership
    await this.addNationalLeadershipInvitations(targets, request);
  }

  /**
   * National CCT (Central Command Team) Meeting Invitations
   * Attendees:
   * 1. All War Council members (Top 6 National Officials + 9 Provincial CCT Deployees)
   * 2. All CCT Leadership (CCT01–CCT60) & National Executive / Youth / Women Heads
   * 3. All Provincial Chairpersons (PCHAIR_*) & Provincial Secretaries (PSEC_*) across all 9 provinces
   */
  private static async addNationalCCTInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest
  ): Promise<void> {
    // 1. Include all War Council members
    await this.addWarCouncilInvitations(targets, request);

    // 2. Include CCT Leadership (CCT01–CCT60) + National Executive Heads + Provincial Chairpersons & Secretaries
    const rows = await executeQuery(`
      SELECT DISTINCT
        m.member_id,
        TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) AS member_name,
        CASE WHEN m.email LIKE '%@%' THEN TRIM(m.email) ELSE '' END AS member_email,
        COALESCE(m.cell_number, '') AS member_phone,
        COALESCE(NULLIF(m.membership_number, ''), 'MEM' || LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')) AS membership_number,
        lp.position_name AS role_name,
        lp.position_code AS role_code,
        lp.position_category,
        lp.position_order
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members_consolidated m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND (
          (
            lp.hierarchy_level = 'National'
            AND (
              lp.position_category IN ('CCT', 'Executive')
              OR lp.position_code ~ '^CCT[0-9]+$'
              OR LEFT(lp.position_code, 3) = 'NEC'
              OR lp.position_code IN ('HOP', 'HOC', 'NORG', 'PYOUTH', 'PWOMEN', 'NYOUTH_PRES', 'NYOUTH_SG', 'NWOMEN_PRES', 'NWOMEN_SG')
            )
          )
          OR (
            (lp.hierarchy_level IN ('Province', 'Provincial') OR la.hierarchy_level IN ('Province', 'Provincial'))
            AND (
              LEFT(lp.position_code, 7) = 'PCHAIR_'
              OR lp.position_code = 'PCHAIR'
              OR LEFT(lp.position_code, 5) = 'PSEC_'
              OR lp.position_code = 'PSEC'
              OR (
                (lp.position_name ILIKE '%Provincial Chairperson%' OR lp.position_name ILIKE '%Provincial Secretary%')
                AND lp.position_name NOT ILIKE '%Deputy%'
              )
            )
          )
        )
      ORDER BY lp.position_order ASC, m.member_id ASC
    `);

    for (const row of rows) {
      targets.push({
        member_id: row.member_id,
        member_name: String(row.member_name || '').replace(/\s+/g, ' ').trim() || 'Unknown Member',
        member_email: row.member_email || '',
        member_phone: row.member_phone || '',
        membership_number: row.membership_number || '',
        attendance_type: 'Required',
        role_in_meeting: row.role_name,
        voting_rights: true,
        invitation_priority: this.resolveLeadershipInvitationPriority(row.role_code, row.position_category),
      });
    }
  }

  /**
   * Add National Leadership to invitations
   */
  private static async addNationalLeadershipInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest
  ): Promise<void> {
    const nationalLeaders = await this.getMembersWithRoles('National');

    for (const member of nationalLeaders) {
      if (member.role_category === 'Executive' || member.role_category === 'Leadership') {
        targets.push({
          member_id: member.member_id,
          attendance_type: 'Required',
          role_in_meeting: member.role_name,
          voting_rights: member.has_voting_rights,
          invitation_priority: member.meeting_invitation_priority
        });
      }
    }
  }

  /**
   * Provincial Meeting Invitations (PCT, Provincial AGM, PGA, PPA, Provincial Elective)
   * Attendees:
   * 1. Active Provincial Leadership of the selected province (Executive, PCT, Youth/Women, + Provincial CCT Deployee)
   * 2. Active Municipal Chairpersons (MCHAIR_*) & Municipal Secretaries (MSEC_*) across all municipalities in that province
   */
  private static async addProvincialLeadershipAndMunicipalOfficersInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest
  ): Promise<void> {
    const { provinceId, provinceCode } = await this.resolveGeographicContext(request);
    if (!provinceId && !provinceCode) {
      return;
    }

    const provCodeUpper = provinceCode ? provinceCode.toUpperCase() : '__NONE__';
    const provSuffix = provinceCode ? `_${provCodeUpper}` : '__NONE__';
    const cctUnderscore = provinceCode ? `CCT_${provCodeUpper}` : '__NONE__';
    const cctHyphen = provinceCode ? `CCT-${provCodeUpper}` : '__NONE__';

    const rows = await executeQuery(
      `
      SELECT DISTINCT
        m.member_id,
        TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) AS member_name,
        CASE WHEN m.email LIKE '%@%' THEN TRIM(m.email) ELSE '' END AS member_email,
        COALESCE(m.cell_number, '') AS member_phone,
        COALESCE(NULLIF(m.membership_number, ''), 'MEM' || LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')) AS membership_number,
        lp.position_name AS role_name,
        lp.position_code AS role_code,
        lp.position_category,
        lp.position_order
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members_consolidated m ON la.member_id = m.member_id
      LEFT JOIN municipalities mun
        ON la.hierarchy_level IN ('Municipality', 'Municipal')
       AND la.entity_id = mun.municipality_id
      LEFT JOIN districts dist ON mun.district_code = dist.district_code
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND (
          (
            (la.hierarchy_level IN ('Province', 'Provincial') AND la.entity_id = $1)
            OR (lp.hierarchy_level IN ('Province', 'Provincial') AND RIGHT(UPPER(lp.position_code), $2) = $3)
            OR UPPER(lp.position_code) = $4
            OR UPPER(lp.position_code) = $5
          )
          OR (
            (la.hierarchy_level IN ('Municipality', 'Municipal') OR lp.hierarchy_level IN ('Municipality', 'Municipal'))
            AND UPPER(COALESCE(mun.province_code, dist.province_code, '')) = $6
            AND (
              LEFT(UPPER(lp.position_code), 7) = 'MCHAIR_'
              OR UPPER(lp.position_code) = 'MCHAIR'
              OR LEFT(UPPER(lp.position_code), 5) = 'MSEC_'
              OR UPPER(lp.position_code) = 'MSEC'
              OR (
                (lp.position_name ILIKE '%Chairperson%' OR lp.position_name ILIKE '%Secretary%')
                AND lp.position_name NOT ILIKE '%Deputy%'
              )
            )
          )
        )
      ORDER BY lp.position_order ASC, m.member_id ASC
      `,
      [provinceId ?? -1, provSuffix.length, provSuffix, cctUnderscore, cctHyphen, provCodeUpper]
    );

    for (const row of rows) {
      targets.push({
        member_id: row.member_id,
        member_name: String(row.member_name || '').replace(/\s+/g, ' ').trim() || 'Unknown Member',
        member_email: row.member_email || '',
        member_phone: row.member_phone || '',
        membership_number: row.membership_number || '',
        attendance_type: 'Required',
        role_in_meeting: row.role_name,
        voting_rights: true,
        invitation_priority: this.resolveLeadershipInvitationPriority(row.role_code, row.position_category, 'Provincial'),
      });
    }
  }

  /**
   * Municipal / Sub-Regional Meeting Invitations (SRCT)
   * Attendees:
   * 1. Active Municipal Leadership of the selected municipality (Executive + Additional/SRCT members, including sub-regions if a parent metro is selected)
   * 2. Active Ward Chairpersons (WCHAIR_*) & Ward Secretaries (WSEC_*) across all wards in that municipality
   */
  private static async addMunicipalLeadershipAndWardOfficersInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest
  ): Promise<void> {
    const { municipalityId, municipalityCode } = await this.resolveGeographicContext(request);
    if (!municipalityId && !municipalityCode) {
      return;
    }

    const munIdParam = municipalityId ?? -1;
    const munCodeUpper = municipalityCode ? municipalityCode.toUpperCase() : '__NONE__';
    const munSuffix = municipalityCode ? `_${munCodeUpper}` : '__NONE__';

    const rows = await executeQuery(
      `
      SELECT DISTINCT
        m.member_id,
        TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) AS member_name,
        CASE WHEN m.email LIKE '%@%' THEN TRIM(m.email) ELSE '' END AS member_email,
        COALESCE(m.cell_number, '') AS member_phone,
        COALESCE(NULLIF(m.membership_number, ''), 'MEM' || LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')) AS membership_number,
        lp.position_name AS role_name,
        lp.position_code AS role_code,
        lp.position_category,
        lp.position_order
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members_consolidated m ON la.member_id = m.member_id
      LEFT JOIN wards w
        ON la.hierarchy_level IN ('Ward', 'Branch')
       AND la.entity_id = w.ward_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND (
          (
            (
              la.hierarchy_level IN ('Municipality', 'Municipal')
              AND (
                la.entity_id = $1
                OR la.entity_id IN (SELECT sub.municipality_id FROM municipalities sub WHERE sub.parent_municipality_id = $2)
              )
            )
            OR (
              lp.hierarchy_level IN ('Municipality', 'Municipal')
              AND RIGHT(UPPER(lp.position_code), $3) = $4
            )
          )
          OR (
            (la.hierarchy_level IN ('Ward', 'Branch') OR lp.hierarchy_level IN ('Ward', 'Branch'))
            AND (
              UPPER(COALESCE(w.municipality_code, '')) = $5
              OR w.municipality_code IN (SELECT sub2.municipality_code FROM municipalities sub2 WHERE sub2.parent_municipality_id = $6)
            )
            AND (
              LEFT(UPPER(lp.position_code), 7) = 'WCHAIR_'
              OR UPPER(lp.position_code) = 'WCHAIR'
              OR LEFT(UPPER(lp.position_code), 5) = 'WSEC_'
              OR UPPER(lp.position_code) = 'WSEC'
              OR UPPER(lp.position_code) LIKE 'BCT-%-BRANCHCHAIRPERSON'
              OR UPPER(lp.position_code) LIKE 'BCT-%-BRANCHSECRETARY'
              OR (
                (lp.position_name ILIKE '%Chairperson%' OR lp.position_name ILIKE '%Secretary%')
                AND lp.position_name NOT ILIKE '%Deputy%'
              )
            )
          )
        )
      ORDER BY lp.position_order ASC, m.member_id ASC
      `,
      [munIdParam, munIdParam, munSuffix.length, munSuffix, munCodeUpper, munIdParam]
    );

    for (const row of rows) {
      targets.push({
        member_id: row.member_id,
        member_name: String(row.member_name || '').replace(/\s+/g, ' ').trim() || 'Unknown Member',
        member_email: row.member_email || '',
        member_phone: row.member_phone || '',
        membership_number: row.membership_number || '',
        attendance_type: 'Required',
        role_in_meeting: row.role_name,
        voting_rights: true,
        invitation_priority: this.resolveLeadershipInvitationPriority(row.role_code, row.position_category, 'Municipal'),
      });
    }
  }

  /**
   * Ward / Branch Leadership Only Invitations (BCT Meeting)
   * Attendees: Active Ward/Branch Leadership of the selected ward
   */
  private static async addWardLeadershipInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest,
    preResolvedContext?: { wardId?: number; wardCode?: string }
  ): Promise<void> {
    const { wardId, wardCode } = preResolvedContext ?? (await this.resolveGeographicContext(request));
    if (!wardId && !wardCode) {
      return;
    }

    const wardIdParam = wardId ?? -1;
    const wardCodeUpper = wardCode ? wardCode.toUpperCase() : '__NONE__';
    const wardSuffix = wardCode ? `_${wardCodeUpper}` : '__NONE__';
    const bctPrefix = wardCode ? `BCT-${wardCodeUpper}-%` : '__NONE__';

    const rows = await executeQuery(
      `
      SELECT DISTINCT
        m.member_id,
        TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) AS member_name,
        CASE WHEN m.email LIKE '%@%' THEN TRIM(m.email) ELSE '' END AS member_email,
        COALESCE(m.cell_number, '') AS member_phone,
        COALESCE(NULLIF(m.membership_number, ''), 'MEM' || LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')) AS membership_number,
        lp.position_name AS role_name,
        lp.position_code AS role_code,
        lp.position_category,
        lp.position_order
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members_consolidated m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND (
          (la.hierarchy_level IN ('Ward', 'Branch') AND la.entity_id = $1)
          OR (
            lp.hierarchy_level IN ('Ward', 'Branch')
            AND (
              RIGHT(UPPER(lp.position_code), $2) = $3
              OR UPPER(lp.position_code) LIKE $4
            )
          )
        )
      ORDER BY lp.position_order ASC, m.member_id ASC
      `,
      [wardIdParam, wardSuffix.length, wardSuffix, bctPrefix]
    );

    for (const row of rows) {
      targets.push({
        member_id: row.member_id,
        member_name: String(row.member_name || '').replace(/\s+/g, ' ').trim() || 'Unknown Member',
        member_email: row.member_email || '',
        member_phone: row.member_phone || '',
        membership_number: row.membership_number || '',
        attendance_type: 'Required',
        role_in_meeting: row.role_name,
        voting_rights: true,
        invitation_priority: this.resolveLeadershipInvitationPriority(row.role_code, row.position_category, 'Ward'),
      });
    }
  }

  /**
   * Ward / Branch General & Assembly Invitations (BGA, BPA, Branch General Meeting)
   * Attendees:
   * 1. Active Ward/Branch Leadership of the selected ward (retaining leadership role & higher priority)
   * 2. All Ward Members of the selected ward (members_consolidated.ward_code)
   */
  private static async addWardMembersAndLeadershipInvitations(
    targets: InvitationTarget[],
    request: AutoInvitationRequest
  ): Promise<void> {
    const context = await this.resolveGeographicContext(request);
    await this.addWardLeadershipInvitations(targets, request, context);

    const { wardCode } = context;
    if (!wardCode) {
      return;
    }

    const memberRows = await executeQuery(
      `
      SELECT
        m.member_id,
        TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')) AS member_name,
        CASE WHEN m.email LIKE '%@%' THEN TRIM(m.email) ELSE '' END AS member_email,
        COALESCE(m.cell_number, '') AS member_phone,
        COALESCE(NULLIF(m.membership_number, ''), 'MEM' || LPAD(CAST(m.member_id AS TEXT), GREATEST(LENGTH(CAST(m.member_id AS TEXT)), 6), '0')) AS membership_number
      FROM members_consolidated m
      WHERE m.ward_code = $1
        AND COALESCE(m.is_duplicate, FALSE) = FALSE
      ORDER BY m.surname ASC, m.firstname ASC, m.member_id ASC
      `,
      [wardCode]
    );

    for (const row of memberRows) {
      targets.push({
        member_id: row.member_id,
        member_name: String(row.member_name || '').replace(/\s+/g, ' ').trim() || 'Unknown Member',
        member_email: row.member_email || '',
        member_phone: row.member_phone || '',
        membership_number: row.membership_number || '',
        attendance_type: 'Required',
        role_in_meeting: 'Ward Member',
        voting_rights: true,
        invitation_priority: 2,
      });
    }
  }


  /**
   * Remove duplicate invitations (same member_id), retaining the highest-priority role
   */
  private static removeDuplicateInvitations(targets: InvitationTarget[]): InvitationTarget[] {
    const byMember = new Map<number, InvitationTarget>();
    for (const target of targets) {
      const existing = byMember.get(target.member_id);
      if (!existing) {
        byMember.set(target.member_id, { ...target });
      } else {
        const primary = target.invitation_priority > existing.invitation_priority ? target : existing;
        const secondary = primary === target ? existing : target;
        byMember.set(target.member_id, {
          ...primary,
          member_name: primary.member_name || secondary.member_name,
          member_email: primary.member_email || secondary.member_email,
          member_phone: primary.member_phone || secondary.member_phone,
          membership_number: primary.membership_number || secondary.membership_number,
          voting_rights: Boolean(existing.voting_rights || target.voting_rights),
        });
      }
    }
    return Array.from(byMember.values());
  }

  // Additional invitation methods for other meeting types would be implemented here
  // (addPPAInvitations, addProvincialInvitations, etc.)

  /**
   * Generic hierarchical invitations for standard meetings (level-aware fallback)
   */
  private static async addGenericHierarchicalInvitations(
    invitationTargets: InvitationTarget[],
    request: AutoInvitationRequest,
    meetingTypeHierarchyLevel?: string
  ): Promise<void> {
    const level = meetingTypeHierarchyLevel || request.hierarchy_level;
    if (level === 'Provincial' || level === 'Province') {
      await this.addProvincialLeadershipAndMunicipalOfficersInvitations(invitationTargets, request);
      return;
    }
    if (level === 'Municipal' || level === 'Municipality') {
      await this.addMunicipalLeadershipAndWardOfficersInvitations(invitationTargets, request);
      return;
    }
    if (level === 'Ward' || level === 'Branch') {
      await this.addWardLeadershipInvitations(invitationTargets, request);
      return;
    }
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add NGA (National General Assembly) meeting invitations
   */
  private static async addNGAInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic for NGA as they have similar attendance requirements
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add Conference meeting invitations (Policy/Elective)
   */
  private static async addConferenceInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic for conferences as they have broad attendance
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add PPA (Provincial People's Assembly) meeting invitations
   */
  private static async addPPAInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic adapted for provincial level
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add Provincial meeting invitations
   */
  private static async addProvincialInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic adapted for provincial level
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add Regional meeting invitations
   */
  private static async addRegionalInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic adapted for regional level
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add Municipal meeting invitations
   */
  private static async addMunicipalInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic adapted for municipal level
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Add Branch meeting invitations
   */
  private static async addBranchInvitations(
    invitationTargets: any[],
    request: any
  ): Promise<void> {
    // Use NPA logic adapted for branch level
    await this.addNPAInvitations(invitationTargets, request);
  }

  /**
   * Get meetings with filtering and pagination
   */
  static async getMeetings(filters: {
    hierarchy_level?: string;
    meeting_status?: string;
    meeting_category?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    order: 'asc' | 'desc';
  }): Promise<{ meetings: any[]; total: number }> {
    try {
      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (filters.hierarchy_level && filters.hierarchy_level !== 'all') {
        const aliases = this.expandHierarchyLevelAliases(filters.hierarchy_level);
        if (aliases.length === 1) {
          whereConditions.push(`m.hierarchy_level = $${paramIndex++}`);
          params.push(aliases[0]);
        } else {
          const placeholders = aliases.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`m.hierarchy_level IN (${placeholders})`);
          params.push(...aliases);
        }
      }

      if (filters.meeting_status && filters.meeting_status !== 'all') {
        whereConditions.push(`m.meeting_status = $${paramIndex++}`);
        params.push(filters.meeting_status);
      }

      if (filters.meeting_category && filters.meeting_category !== 'all') {
        whereConditions.push(`mt.meeting_category = $${paramIndex++}`);
        params.push(filters.meeting_category);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM meetings m
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        ${whereClause}
      `;

      const countResult = await executeQuerySingle<{ total: number }>(countQuery, params);
      const total = parseInt(countResult?.total?.toString() || '0');

      // Get meetings with details
      const sortColumn = filters.sort || 'meeting_date';
      const sortOrder = filters.order || 'desc';
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const meetingsQuery = `
        SELECT
          m.meeting_id,
          m.meeting_id as id,
          m.meeting_title,
          m.meeting_title as title,
          m.meeting_type_id,
          mt.type_name as meeting_type_name,
          mt.type_name,
          mt.type_name as meeting_type,
          mt.type_code,
          mt.meeting_category,
          m.hierarchy_level,
          m.entity_id,
          CASE
            WHEN m.hierarchy_level = 'National' THEN 'National'
            WHEN m.hierarchy_level = 'Province' OR m.hierarchy_level = 'Provincial' THEN p.province_name
            WHEN m.hierarchy_level = 'Region' OR m.hierarchy_level = 'Regional' THEN d.district_name
            WHEN m.hierarchy_level = 'Municipality' OR m.hierarchy_level = 'Municipal' THEN mu.municipality_name
            WHEN m.hierarchy_level = 'Ward' OR m.hierarchy_level = 'Branch' THEN w.ward_name
            ELSE 'National'
          END as entity_name,
          m.meeting_date::text as meeting_date,
          m.meeting_time,
          m.end_time,
          m.duration_minutes,
          m.location,
          m.virtual_meeting_link,
          m.meeting_platform,
          m.meeting_status,
          m.description,
          m.objectives,
          m.quorum_required,
          m.quorum_achieved,
          m.total_attendees,
          m.created_at,
          m.updated_at,
          (SELECT COUNT(*) FROM meeting_invitations mi WHERE mi.meeting_id = m.meeting_id) as total_invitations,
          (SELECT COUNT(*) FROM meeting_invitations mi WHERE mi.meeting_id = m.meeting_id) as total_invited,
          (SELECT COUNT(*) FROM meeting_invitations mi WHERE mi.meeting_id = m.meeting_id AND mi.invitation_status = 'Accepted') as accepted_count,
          (SELECT COUNT(*) FROM meeting_invitations mi WHERE mi.meeting_id = m.meeting_id AND mi.invitation_status = 'Declined') as declined_count
        FROM meetings m
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        LEFT JOIN provinces p ON (m.hierarchy_level = 'Province' OR m.hierarchy_level = 'Provincial') AND m.entity_id = p.province_id
        LEFT JOIN districts d ON (m.hierarchy_level = 'Region' OR m.hierarchy_level = 'Regional') AND m.entity_id = d.district_id
        LEFT JOIN municipalities mu ON (m.hierarchy_level = 'Municipality' OR m.hierarchy_level = 'Municipal') AND m.entity_id = mu.municipality_id
        LEFT JOIN wards w ON (m.hierarchy_level = 'Ward' OR m.hierarchy_level = 'Branch') AND m.entity_id = w.ward_id
        ${whereClause}
        ORDER BY m.${sortColumn} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);
      const meetings = await executeQuery(meetingsQuery, params);

      return { meetings, total };
    } catch (error) {
      throw createDatabaseError('Failed to get meetings', error);
    }
  }

  /**
   * Get meeting statistics
   */
  static async getMeetingStatistics(): Promise<any[]> {
    try {
      // TODO: Implement proper statistics once hierarchical_meetings table exists
      // For now, return basic statistics from meeting_types
      const query = `
        SELECT
          mt.hierarchy_level,
          mt.meeting_category,
          0 as total_meetings,
          0 as scheduled_meetings,
          0 as completed_meetings,
          0 as cancelled_meetings,
          0 as avg_attendance
        FROM meeting_types mt
        WHERE mt.is_active = TRUE
        GROUP BY mt.hierarchy_level, mt.meeting_category
        ORDER BY mt.hierarchy_level, mt.meeting_category
      `;

      return await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to get meeting statistics', error);
    }
  }

  /**
   * Delete a meeting
   */
  static async deleteMeeting(meetingId: number): Promise<{ deleted: boolean }> {
    try {
      const deleted = await MeetingModel.deleteMeeting(meetingId);
      return { deleted };
    } catch (error) {
      throw createDatabaseError('Failed to delete meeting', error);
    }
  }



}
