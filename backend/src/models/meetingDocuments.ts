import { executeQuery } from '../config/database';
import { DatabaseError, ValidationError } from '../middleware/errorHandler';

export interface MeetingDocumentTemplate {
  id?: number;
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
  meeting_id: number;
  document_type: 'agenda' | 'minutes' | 'action_items' | 'attendance' | 'other';
  document_title: string;
  document_content: any;
  template_id?: number;
  version_number?: number;
  document_status?: 'draft' | 'review' | 'approved' | 'published';
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActionItem {
  id?: number;
  meeting_id: number;
  document_id?: number;
  action_title: string;
  action_description?: string;
  assigned_to?: number;
  assigned_role?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  completion_notes?: string;
  created_by: number;
  completed_by?: number;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingDecision {
  id?: number;
  meeting_id: number;
  document_id?: number;
  decision_title: string;
  decision_description: string;
  decision_type: 'resolution' | 'motion' | 'policy' | 'appointment' | 'other';
  voting_result?: any;
  decision_status: 'proposed' | 'approved' | 'rejected' | 'deferred';
  proposed_by?: number;
  seconded_by?: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
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
        SELECT t.*, mt.type_name as meeting_type_name
        FROM meeting_document_templates t
        LEFT JOIN meeting_types mt ON t.meeting_type_id = mt.type_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.template_type) {
        query += ' AND t.template_type = ?';
        params.push(filters.template_type);
      }

      if (filters.hierarchy_level) {
        query += ' AND t.hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }

      if (filters.meeting_type_id) {
        query += ' AND t.meeting_type_id = ?';
        params.push(filters.meeting_type_id);
      }

      if (filters.is_active !== undefined) {
        query += ' AND t.is_active = ?';
        params.push(filters.is_active);
      }

      query += ' ORDER BY t.hierarchy_level, t.template_type, t.template_name';

      const templates = await executeQuery(query, params);
      return templates.map((template: any) => ({
        ...template,
        template_content: typeof template.template_content === 'string' 
          ? JSON.parse(template.template_content) 
          : template.template_content
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch document templates');
    }
  }

  static async getTemplateById(id: number): Promise<MeetingDocumentTemplate | null> {
    try {
      const query = `
        SELECT t.*, mt.type_name as meeting_type_name
        FROM meeting_document_templates t
        LEFT JOIN meeting_types mt ON t.meeting_type_id = mt.type_id
        WHERE t.id = ?
      `;
      const [template] = await executeQuery(query, [id]);
      
      if (!template) return null;

      return {
        ...template,
        template_content: typeof template.template_content === 'string' 
          ? JSON.parse(template.template_content) 
          : template.template_content
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch document template');
    }
  }

  // Document Management
  static async createDocument(documentData: MeetingDocument): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_documents (
          meeting_id, document_type, document_title, document_content,
          template_id, version_number, document_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await executeQuery(query, [
        documentData.meeting_id,
        documentData.document_type,
        documentData.document_title,
        JSON.stringify(documentData.document_content),
        documentData.template_id || null,
        documentData.version_number || 1,
        documentData.document_status || 'draft',
        documentData.created_by
      ]);

      return result.insertId;
    } catch (error) {
      throw new DatabaseError('Failed to create meeting document');
    }
  }

  static async getDocumentById(documentId: number): Promise<MeetingDocument | null> {
    try {
      const query = `
        SELECT d.*, t.template_name, u.name as created_by_name, a.name as approved_by_name
        FROM meeting_documents d
        LEFT JOIN meeting_document_templates t ON d.template_id = t.id
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN users a ON d.approved_by = a.id
        WHERE d.id = ?
      `;

      const documents = await executeQuery(query, [documentId]);

      if (documents.length === 0) {
        return null;
      }

      const doc = documents[0];

      // Parse JSON content
      return {
        ...doc,
        document_content: typeof doc.document_content === 'string'
          ? JSON.parse(doc.document_content)
          : doc.document_content
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve document');
    }
  }

  static async getDocumentsByMeeting(meetingId: number): Promise<MeetingDocument[]> {
    try {
      const query = `
        SELECT d.*, t.template_name, u.name as created_by_name, a.name as approved_by_name
        FROM meeting_documents d
        LEFT JOIN meeting_document_templates t ON d.template_id = t.id
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN users a ON d.approved_by = a.id
        WHERE d.meeting_id = ?
        ORDER BY d.document_type, d.version_number DESC
      `;
      
      const documents = await executeQuery(query, [meetingId]);
      return documents.map((doc: any) => ({
        ...doc,
        document_content: typeof doc.document_content === 'string' 
          ? JSON.parse(doc.document_content) 
          : doc.document_content
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch meeting documents');
    }
  }

  static async updateDocument(id: number, updates: Partial<MeetingDocument>): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          if (key === 'document_content') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      });

      if (fields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const query = `UPDATE meeting_documents SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);

      await executeQuery(query, values);
    } catch (error) {
      throw new DatabaseError('Failed to update meeting document');
    }
  }

  // Action Items Management
  static async createActionItem(actionData: ActionItem): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_action_items (
          meeting_id, document_id, action_title, action_description,
          assigned_to, assigned_role, due_date, priority, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await executeQuery(query, [
        actionData.meeting_id,
        actionData.document_id || null,
        actionData.action_title,
        actionData.action_description || null,
        actionData.assigned_to || null,
        actionData.assigned_role || null,
        actionData.due_date || null,
        actionData.priority || 'medium',
        actionData.status || 'pending',
        actionData.created_by
      ]);

      return result.insertId;
    } catch (error) {
      throw new DatabaseError('Failed to create action item');
    }
  }

  static async getActionItemsByMeeting(meetingId: number): Promise<ActionItem[]> {
    try {
      const query = `
        SELECT a.*, m.firstname, m.surname, u.name as created_by_name
        FROM meeting_action_items a
        LEFT JOIN members_consolidated m ON a.assigned_to = m.member_id
        LEFT JOIN users u ON a.created_by = u.id
        WHERE a.meeting_id = ?
        ORDER BY a.priority DESC, a.due_date ASC
      `;
      
      return await executeQuery(query, [meetingId]);
    } catch (error) {
      throw new DatabaseError('Failed to fetch action items');
    }
  }

  // Meeting Decisions Management
  static async createDecision(decisionData: MeetingDecision): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_decisions (
          meeting_id, document_id, decision_title, decision_description,
          decision_type, voting_result, decision_status, proposed_by,
          seconded_by, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await executeQuery(query, [
        decisionData.meeting_id,
        decisionData.document_id || null,
        decisionData.decision_title,
        decisionData.decision_description,
        decisionData.decision_type,
        decisionData.voting_result ? JSON.stringify(decisionData.voting_result) : null,
        decisionData.decision_status,
        decisionData.proposed_by || null,
        decisionData.seconded_by || null,
        decisionData.created_by
      ]);

      return result.insertId;
    } catch (error) {
      throw new DatabaseError('Failed to create meeting decision');
    }
  }

  static async getDecisionsByMeeting(meetingId: number): Promise<MeetingDecision[]> {
    try {
      const query = `
        SELECT d.*, 
               p.firstname as proposed_by_firstname, p.surname as proposed_by_surname,
               s.firstname as seconded_by_firstname, s.surname as seconded_by_surname,
               u.name as created_by_name
        FROM meeting_decisions d
        LEFT JOIN members_consolidated p ON d.proposed_by = p.member_id
        LEFT JOIN members_consolidated s ON d.seconded_by = s.member_id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.meeting_id = ?
        ORDER BY d.created_at DESC
      `;
      
      const decisions = await executeQuery(query, [meetingId]);
      return decisions.map((decision: any) => ({
        ...decision,
        voting_result: decision.voting_result ? JSON.parse(decision.voting_result) : null
      }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch meeting decisions');
    }
  }
}
