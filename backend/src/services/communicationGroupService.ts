import { executeQuery, executeQuerySingle } from '../config/database';

export interface CommunicationGroup {
    id: number;
    name: string;
    description: string;
    group_type: 'STATIC' | 'DYNAMIC';
    query_config: any;
    created_by: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    member_count?: number;
}

export class CommunicationGroupService {

    /**
     * Create a new communication group
     */
    static async createGroup(data: {
        name: string;
        description?: string;
        group_type: 'STATIC' | 'DYNAMIC';
        query_config?: any;
        created_by: number;
    }): Promise<CommunicationGroup> {
        const query = `
      INSERT INTO communication_groups (name, description, group_type, query_config, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const params = [
            data.name,
            data.description || null,
            data.group_type,
            data.query_config ? JSON.stringify(data.query_config) : null,
            data.created_by
        ];

        return await executeQuerySingle<CommunicationGroup>(query, params) as CommunicationGroup;
    }

    /**
     * Get all groups (with member counts)
     */
    static async getAllGroups(): Promise<CommunicationGroup[]> {
        const query = `
      SELECT g.*, 
        (SELECT COUNT(*) FROM communication_group_members gm WHERE gm.group_id = g.id) as static_member_count
      FROM communication_groups g
      WHERE g.is_active = true
      ORDER BY g.created_at DESC
    `;
        const groups = await executeQuery<CommunicationGroup>(query);

        // For dynamic groups, we might want to estimate count, but for now returned count is mainly for static.
        // We could calculate dynamic counts here if needed, but might be expensive.
        return groups;
    }

    /**
     * Add members to a static group
     */
    static async addMembersToGroup(groupId: number, memberIds: number[]): Promise<void> {
        if (memberIds.length === 0) return;

        // Build bulk insert query
        const values = memberIds.map(id => `(${groupId}, ${id})`).join(',');
        const query = `
      INSERT INTO communication_group_members (group_id, member_id)
      VALUES ${values}
      ON CONFLICT (group_id, member_id) DO NOTHING
    `;

        await executeQuery(query);
    }

    /**
     * Remove member from group
     */
    static async removeMemberFromGroup(groupId: number, memberId: number): Promise<void> {
        await executeQuery(
            `DELETE FROM communication_group_members WHERE group_id = $1 AND member_id = $2`,
            [groupId, memberId]
        );
    }

    /**
     * Get members in a group (resolving dynamic queries if needed)
     * Returns list of members with phone numbers
     */
    static async getGroupMembers(groupId: number): Promise<any[]> {
        const group = await executeQuerySingle<CommunicationGroup>(
            `SELECT * FROM communication_groups WHERE id = $1`,
            [groupId]
        );

        if (!group) throw new Error('Group not found');

        if (group.group_type === 'STATIC') {
            return await executeQuery(`
        SELECT m.member_id, m.firstname as name, m.surname, m.cell_number, m.membership_number
        FROM members_consolidated m
        JOIN communication_group_members gm ON m.member_id = gm.member_id
        WHERE gm.group_id = $1 AND m.cell_number IS NOT NULL
      `, [groupId]);
        }
        else if (group.group_type === 'DYNAMIC') {
            return await this.resolveDynamicGroupMembers(group.query_config);
        }

        return [];
    }

    /**
     * Resolve members for dynamic groups
     */
    private static async resolveDynamicGroupMembers(config: any): Promise<any[]> {
        if (!config) return [];

        // Case 1: Leadership Context (e.g., "Ward Chairpersons")
        if (config.type === 'LEADERSHIP') {
            /*
              Expected config: { type: 'LEADERSHIP', position_id: number, level: string, location_id: number }
              OR simply all of a certain position: { type: 'LEADERSHIP', position_name: 'Chairperson', level: 'Ward' }
            */

            let baseQuery = `
          SELECT m.member_id, m.firstname as name, m.surname, m.cell_number, m.membership_number, p.position_name, la.hierarchy_level
          FROM members_consolidated m
          JOIN leadership_appointments la ON m.member_id = la.member_id
          JOIN leadership_positions p ON la.position_id = p.id
          WHERE la.is_active = true AND m.cell_number IS NOT NULL
       `;
            const params: any[] = [];
            let paramIdx = 1;

            if (config.hierarchy_level) {
                baseQuery += ` AND la.hierarchy_level = $${paramIdx}`;
                params.push(config.hierarchy_level);
                paramIdx++;
            }

            if (config.position_name) {
                baseQuery += ` AND p.position_name ILIKE $${paramIdx}`;
                params.push(`%${config.position_name}%`);
                paramIdx++;
            }

            if (config.position_id) {
                baseQuery += ` AND p.id = $${paramIdx}`;
                params.push(config.position_id);
                paramIdx++;
            }

            return await executeQuery(baseQuery, params);
        }

        // Case 2: Geographic Context (e.g., "All members in Gauteng")
        if (config.type === 'GEOGRAPHIC') {
            /*
              Expected config: { type: 'GEOGRAPHIC', province_code: string, region_code: string }
            */
            let baseQuery = `
          SELECT m.member_id, m.firstname as name, m.surname, m.cell_number, m.membership_number, m.province_name
          FROM members_consolidated m
          WHERE m.cell_number IS NOT NULL
       `;
            const params: any[] = [];
            let paramIdx = 1;

            if (config.province_code) {
                baseQuery += ` AND m.province_code = $${paramIdx}`;
                params.push(config.province_code);
                paramIdx++;
            }

            if (config.region_code) {
                baseQuery += ` AND m.district_code = $${paramIdx}`;
                params.push(config.region_code);
                paramIdx++;
            }

            // Limit to prevent sending to millions
            baseQuery += ` LIMIT 10000`;

            return await executeQuery(baseQuery, params);
        }

        return [];
    }

    /**
     * Get available leadership positions for UI selection
     */
    static async getLeadershipPositions(): Promise<any[]> {
        return await executeQuery(`
        SELECT DISTINCT position_name, hierarchy_level, id
        FROM leadership_positions
        WHERE is_active = true
        ORDER BY hierarchy_level, position_name
      `);
    }
}
