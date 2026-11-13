import { executeQuery } from '../config/database';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';

export interface MeetingDocumentTemplate {
  id?: number;
  template_id?: number;
  template_name: string;
  template_type: 'agenda' | 'minutes' | 'action_items' | 'attendance';
  meeting_type_id?: number;
  hierarchy_level?: 'National' | 'Provincial' | 'Municipal' | 'Ward';
  template_content: any;
  is_default?: boolean;
  is_active?: boolean;
  created_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingDocument {
  id?: number;
  document_id?: number;
  meeting_id: number;
  document_type: 'agenda' | 'minutes' | 'action_items' | 'attendance' | 'other';
  document_title: string;
  document_content: any;
  template_id?: number | null;
  version_number?: number;
  document_status?: 'draft' | 'review' | 'approved' | 'published';
  created_by: number;
  approved_by?: number | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  template_name?: string;
  created_by_name?: string;
  creator_name?: string;
  approved_by_name?: string;
  approver_name?: string;
}

export interface ActionItem {
  id?: number;
  action_item_id?: number;
  meeting_id: number;
  document_id?: number | null;
  action_title: string;
  action_description?: string;
  assigned_to?: number | null;
  assigned_role?: string;
  due_date?: string | Date | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  completion_notes?: string;
  created_by: number;
  completed_by?: number | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  assignee_name?: string;
  created_by_name?: string;
}

export interface MeetingDecision {
  id?: number;
  decision_id?: number;
  meeting_id: number;
  document_id?: number | null;
  decision_title: string;
  decision_description: string;
  decision_type: 'resolution' | 'motion' | 'policy' | 'appointment' | 'other';
  voting_result?: any;
  decision_status: 'proposed' | 'approved' | 'rejected' | 'deferred';
  proposed_by?: number | null;
  seconded_by?: number | null;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  proposer_name?: string;
  seconder_name?: string;
  created_by_name?: string;
}

const ALLOWED_DOCUMENT_UPDATE_COLUMNS = new Set([
  'document_title',
  'document_type',
  'document_content',
  'template_id',
  'version_number',
  'document_status',
  'approved_by',
  'approved_at',
]);

function parseJsonField(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export class MeetingDocumentModel {
  // Template Management
  static async getTemplates(filters: {
    template_type?: string;
    hierarchy_level?: string;
    meeting_type_id?: number;
    is_active?: boolean;
  } = {}): Promise<MeetingDocumentTemplate[]> {
    try {
      let query = `
        SELECT t.template_id AS id, t.*, mt.type_name AS meeting_type_name
        FROM meeting_document_templates t
        LEFT JOIN meeting_types mt ON t.meeting_type_id = mt.type_id
        WHERE TRUE
      `;
      const params: any[] = [];

      if (filters.template_type) {
        params.push(filters.template_type);
        query += ` AND t.template_type = $${params.length}`;
      }

      if (filters.hierarchy_level) {
        params.push(filters.hierarchy_level);
        query += ` AND t.hierarchy_level = $${params.length}`;
      }

      if (filters.meeting_type_id) {
        params.push(filters.meeting_type_id);
        query += ` AND t.meeting_type_id = $${params.length}`;
      }

      if (filters.is_active !== undefined) {
        params.push(filters.is_active);
        query += ` AND t.is_active = $${params.length}`;
      }

      query += ' ORDER BY t.hierarchy_level, t.template_type, t.template_name';

      const templates = await executeQuery(query, params);
      return templates.map((template: any) => ({
        ...template,
        id: template.id ?? template.template_id,
        template_content: parseJsonField(template.template_content),
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch document templates');
    }
  }

  static async getTemplateById(id: number): Promise<MeetingDocumentTemplate | null> {
    try {
      const query = `
        SELECT t.template_id AS id, t.*, mt.type_name AS meeting_type_name
        FROM meeting_document_templates t
        LEFT JOIN meeting_types mt ON t.meeting_type_id = mt.type_id
        WHERE t.template_id = $1
      `;
      const [template] = await executeQuery(query, [id]);

      if (!template) return null;

      return {
        ...template,
        id: template.id ?? template.template_id,
        template_content: parseJsonField(template.template_content),
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch document template');
    }
  }

  private static async resolveCreatorUserId(candidateId?: number): Promise<number> {
    if (candidateId) {
      const rows = await executeQuery(
        'SELECT user_id FROM users WHERE user_id = $1 OR id = $2 ORDER BY CASE WHEN user_id = $3 THEN 0 ELSE 1 END LIMIT 1',
        [candidateId, candidateId, candidateId]
      );
      if (rows[0]?.user_id) {
        return Number(rows[0].user_id);
      }
    }
    const fallbackRows = await executeQuery(
      'SELECT user_id FROM users WHERE is_active = TRUE ORDER BY user_id ASC LIMIT 1'
    );
    return Number(fallbackRows[0]?.user_id || candidateId || 8571);
  }

  // Document Management
  static async createDocument(documentData: MeetingDocument): Promise<number> {
    try {
      let versionNumber = documentData.version_number;
      if (!versionNumber) {
        const versionRows = await executeQuery(
          'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM meeting_documents WHERE meeting_id = $1 AND document_type = $2',
          [documentData.meeting_id, documentData.document_type]
        );
        versionNumber = Number(versionRows[0]?.next_version) || 1;
      }

      const createdByUserId = await this.resolveCreatorUserId(documentData.created_by);

      const query = `
        INSERT INTO meeting_documents (
          meeting_id, document_type, document_title, document_content,
          template_id, version_number, document_status, created_by
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
        RETURNING document_id
      `;

      const serializedContent =
        typeof documentData.document_content === 'string'
          ? documentData.document_content
          : JSON.stringify(documentData.document_content ?? {});

      const result = await executeQuery(query, [
        documentData.meeting_id,
        documentData.document_type,
        documentData.document_title,
        serializedContent,
        documentData.template_id || null,
        versionNumber,
        documentData.document_status || 'draft',
        createdByUserId,
      ]);

      return result[0]?.document_id;
    } catch (error) {
      throw new DatabaseError('Failed to create meeting document');
    }
  }

  static async getDocumentById(documentId: number): Promise<MeetingDocument | null> {
    try {
      const query = `
        SELECT
          d.document_id AS id,
          d.*,
          t.template_name,
          u.name AS created_by_name,
          u.name AS creator_name,
          a.name AS approved_by_name,
          a.name AS approver_name
        FROM meeting_documents d
        LEFT JOIN meeting_document_templates t ON d.template_id = t.template_id
        LEFT JOIN users u ON d.created_by = u.user_id
        LEFT JOIN users a ON d.approved_by = a.user_id
        WHERE d.document_id = $1
      `;

      const documents = await executeQuery(query, [documentId]);

      if (documents.length === 0) {
        return null;
      }

      const doc = documents[0];

      return {
        ...doc,
        id: doc.id ?? doc.document_id,
        document_content: parseJsonField(doc.document_content),
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve document');
    }
  }

  static async getDocumentsByMeeting(meetingId: number): Promise<MeetingDocument[]> {
    try {
      const query = `
        SELECT
          d.document_id AS id,
          d.*,
          t.template_name,
          u.name AS created_by_name,
          u.name AS creator_name,
          a.name AS approved_by_name,
          a.name AS approver_name
        FROM meeting_documents d
        LEFT JOIN meeting_document_templates t ON d.template_id = t.template_id
        LEFT JOIN users u ON d.created_by = u.user_id
        LEFT JOIN users a ON d.approved_by = a.user_id
        WHERE d.meeting_id = $1
        ORDER BY d.document_type, d.version_number DESC
      `;

      const documents = await executeQuery(query, [meetingId]);
      return documents.map((doc: any) => ({
        ...doc,
        id: doc.id ?? doc.document_id,
        document_content: parseJsonField(doc.document_content),
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch meeting documents');
    }
  }

  static async updateDocument(id: number, updates: Partial<MeetingDocument>): Promise<boolean> {
    try {
      const normalizedUpdates: Partial<MeetingDocument> = { ...updates };
      if (typeof normalizedUpdates.approved_by === 'number') {
        normalizedUpdates.approved_by = await this.resolveCreatorUserId(normalizedUpdates.approved_by);
      }

      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(normalizedUpdates).forEach(([key, value]) => {
        if (value !== undefined && ALLOWED_DOCUMENT_UPDATE_COLUMNS.has(key)) {
          if (key === 'document_content') {
            values.push(typeof value === 'string' ? value : JSON.stringify(value));
            fields.push(`${key} = $${values.length}::jsonb`);
          } else {
            values.push(value);
            fields.push(`${key} = $${values.length}`);
          }
        }
      });

      if (fields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE meeting_documents SET ${fields.join(', ')} WHERE document_id = $${values.length} RETURNING document_id`;
      const result = await executeQuery(query, values);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update meeting document');
    }
  }

  static async deleteDocument(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM meeting_documents WHERE document_id = $1 RETURNING document_id';
      const result = await executeQuery(query, [id]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete meeting document');
    }
  }

  // Action Items Management
  static async createActionItem(actionData: ActionItem): Promise<number> {
    try {
      const formattedDueDate =
        actionData.due_date instanceof Date
          ? actionData.due_date.toISOString().split('T')[0]
          : actionData.due_date || null;

      const createdByUserId = await this.resolveCreatorUserId(actionData.created_by);

      const query = `
        INSERT INTO meeting_action_items (
          meeting_id, document_id, action_title, action_description,
          assigned_to, assigned_role, due_date, priority, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING action_item_id
      `;

      const result = await executeQuery(query, [
        actionData.meeting_id,
        actionData.document_id || null,
        actionData.action_title,
        actionData.action_description || null,
        actionData.assigned_to || null,
        actionData.assigned_role || null,
        formattedDueDate,
        actionData.priority || 'medium',
        actionData.status || 'pending',
        createdByUserId,
      ]);

      return result[0]?.action_item_id;
    } catch (error) {
      throw new DatabaseError('Failed to create action item');
    }
  }

  static async getActionItemsByMeeting(meetingId: number): Promise<ActionItem[]> {
    try {
      const query = `
        SELECT
          a.action_item_id AS id,
          a.*,
          m.firstname,
          m.surname,
          NULLIF(TRIM(COALESCE(m.firstname, '') || ' ' || COALESCE(m.surname, '')), '') AS assignee_name,
          u.name AS created_by_name
        FROM meeting_action_items a
        LEFT JOIN members_consolidated m ON a.assigned_to = m.member_id
        LEFT JOIN users u ON a.created_by = u.user_id
        WHERE a.meeting_id = $1
        ORDER BY a.priority DESC, a.due_date ASC
      `;

      const items = await executeQuery(query, [meetingId]);
      return items.map((item: any) => ({
        ...item,
        id: item.id ?? item.action_item_id,
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch action items');
    }
  }

  // Meeting Decisions Management
  static async createDecision(decisionData: MeetingDecision): Promise<number> {
    try {
      const createdByUserId = await this.resolveCreatorUserId(decisionData.created_by);

      const query = `
        INSERT INTO meeting_decisions (
          meeting_id, document_id, decision_title, decision_description,
          decision_type, voting_result, decision_status, proposed_by,
          seconded_by, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
        RETURNING decision_id
      `;

      const serializedVoting = decisionData.voting_result
        ? typeof decisionData.voting_result === 'string'
          ? decisionData.voting_result
          : JSON.stringify(decisionData.voting_result)
        : null;

      const result = await executeQuery(query, [
        decisionData.meeting_id,
        decisionData.document_id || null,
        decisionData.decision_title,
        decisionData.decision_description,
        decisionData.decision_type,
        serializedVoting,
        decisionData.decision_status,
        decisionData.proposed_by || null,
        decisionData.seconded_by || null,
        createdByUserId,
      ]);

      return result[0]?.decision_id;
    } catch (error) {
      throw new DatabaseError('Failed to create meeting decision');
    }
  }

  static async getDecisionsByMeeting(meetingId: number): Promise<MeetingDecision[]> {
    try {
      const query = `
        SELECT
          d.decision_id AS id,
          d.*,
          p.firstname AS proposed_by_firstname,
          p.surname AS proposed_by_surname,
          NULLIF(TRIM(COALESCE(p.firstname, '') || ' ' || COALESCE(p.surname, '')), '') AS proposer_name,
          s.firstname AS seconded_by_firstname,
          s.surname AS seconded_by_surname,
          NULLIF(TRIM(COALESCE(s.firstname, '') || ' ' || COALESCE(s.surname, '')), '') AS seconder_name,
          u.name AS created_by_name
        FROM meeting_decisions d
        LEFT JOIN members_consolidated p ON d.proposed_by = p.member_id
        LEFT JOIN members_consolidated s ON d.seconded_by = s.member_id
        LEFT JOIN users u ON d.created_by = u.user_id
        WHERE d.meeting_id = $1
        ORDER BY d.created_at DESC
      `;

      const decisions = await executeQuery(query, [meetingId]);
      return decisions.map((decision: any) => ({
        ...decision,
        id: decision.id ?? decision.decision_id,
        voting_result: decision.voting_result ? parseJsonField(decision.voting_result) : null,
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch meeting decisions');
    }
  }
}
