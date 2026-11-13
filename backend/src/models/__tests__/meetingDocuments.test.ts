import { executeQuery } from '../../config/database';
import { ValidationError } from '../../middleware/errorHandler';
import { MeetingDocumentModel } from '../meetingDocuments';

jest.mock('../../config/database', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  executeTransaction: jest.fn(),
}));

const mockExecuteQuery = executeQuery as jest.MockedFunction<typeof executeQuery>;

describe('MeetingDocumentModel PostgreSQL alignment tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocumentsByMeeting', () => {
    it('joins on t.template_id and users.user_id, aliases document_id as id, and handles JSONB objects', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([
        {
          id: 9,
          document_id: 9,
          meeting_id: 134,
          document_type: 'agenda',
          document_title: 'National CCT Agenda',
          document_content: { sections: [{ title: 'Opening', items: ['Welcome'] }] },
          version_number: 1,
          document_status: 'draft',
          created_by: 1,
          created_by_name: 'National Admin',
          creator_name: 'National Admin',
        },
      ]);

      // Act
      const docs = await MeetingDocumentModel.getDocumentsByMeeting(134);

      // Assert
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecuteQuery.mock.calls[0];
      expect(params).toEqual([134]);
      expect(sql).toContain('LEFT JOIN meeting_document_templates t ON d.template_id = t.template_id');
      expect(sql).toContain('LEFT JOIN users u ON d.created_by = u.user_id');
      expect(sql).toContain('LEFT JOIN users a ON d.approved_by = a.user_id');
      expect(sql).not.toContain('t.id');
      expect(sql).not.toContain('u.id');
      expect(sql).not.toContain('a.id');

      expect(docs).toHaveLength(1);
      expect(docs[0]).toMatchObject({
        id: 9,
        document_id: 9,
        document_title: 'National CCT Agenda',
        creator_name: 'National Admin',
      });
    });
  });

  describe('getTemplates & getTemplateById', () => {
    it('queries template_id and returns id alias on templates', async () => {
      // Arrange
      mockExecuteQuery
        .mockResolvedValueOnce([
          {
            template_id: 3,
            template_name: 'CCT Agenda Template',
            template_type: 'agenda',
            hierarchy_level: 'National',
            template_content: '{"sections":[]}',
            created_by: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 3,
            template_id: 3,
            template_name: 'CCT Agenda Template',
            template_type: 'agenda',
            hierarchy_level: 'National',
            template_content: { sections: [] },
            created_by: 1,
          },
        ]);

      // Act
      const list = await MeetingDocumentModel.getTemplates({ template_type: 'agenda', is_active: true });
      const single = await MeetingDocumentModel.getTemplateById(3);

      // Assert
      expect(list[0]).toMatchObject({ id: 3, template_id: 3, template_content: { sections: [] } });
      expect(mockExecuteQuery.mock.calls[1][0]).toContain('WHERE t.template_id = $1');
      expect(single?.id).toBe(3);
    });
  });

  describe('createDocument, updateDocument, & deleteDocument', () => {
    it('computes next version_number separately (avoiding 42P08 parameter reuse), resolves user_id, and inserts with RETURNING document_id', async () => {
      // Arrange
      mockExecuteQuery
        .mockResolvedValueOnce([{ next_version: 2 }]) // version lookup
        .mockResolvedValueOnce([{ user_id: 8571 }])   // resolveCreatorUserId
        .mockResolvedValueOnce([{ document_id: 25 }]); // INSERT

      // Act
      const newId = await MeetingDocumentModel.createDocument({
        meeting_id: 134,
        document_type: 'agenda',
        document_title: 'Agenda For Ward 48',
        document_content: { sections: [] },
        created_by: 1, // legacy users.id = 1 mapped to users.user_id = 8571
      });

      // Assert
      expect(newId).toBe(25);
      expect(mockExecuteQuery).toHaveBeenCalledTimes(3);

      const [versionSql, versionParams] = mockExecuteQuery.mock.calls[0];
      expect(versionSql).toContain('MAX(version_number)');
      expect(versionParams).toEqual([134, 'agenda']);

      const [insertSql, insertParams] = mockExecuteQuery.mock.calls[2];
      expect(insertSql).toContain('VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)');
      expect(insertSql).toContain('RETURNING document_id');
      // Ensure $2 appears only once in INSERT so PostgreSQL never deduces conflicting varchar vs text types
      expect((insertSql.match(/\$2\b/g) || []).length).toBe(1);
      expect(insertParams?.[5]).toBe(2);
      expect(insertParams?.[7]).toBe(8571);
    });

    it('updates allowed columns using WHERE document_id = $N and rejects empty updates with ValidationError', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([{ document_id: 25 }]);

      // Act
      const updated = await MeetingDocumentModel.updateDocument(25, {
        document_status: 'approved',
        document_content: { sections: [{ title: '1', items: [] }] },
      });

      // Assert
      expect(updated).toBe(true);
      const [sql, params] = mockExecuteQuery.mock.calls[0];
      expect(sql).toContain('WHERE document_id = $3 RETURNING document_id');
      expect(params?.[2]).toBe(25);

      await expect(MeetingDocumentModel.updateDocument(25, { id: 999 } as any)).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    it('deletes by document_id and returns true when row existed', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([{ document_id: 25 }]);

      // Act
      const deleted = await MeetingDocumentModel.deleteDocument(25);

      // Assert
      expect(deleted).toBe(true);
      expect(mockExecuteQuery.mock.calls[0][0]).toBe(
        'DELETE FROM meeting_documents WHERE document_id = $1 RETURNING document_id'
      );
    });
  });

  describe('Action Items & Decisions', () => {
    it('creates and fetches action items and decisions using PostgreSQL PKs and users.user_id', async () => {
      // Arrange
      mockExecuteQuery
        .mockResolvedValueOnce([{ user_id: 8571 }])    // resolveCreatorUserId for action item
        .mockResolvedValueOnce([{ action_item_id: 41 }])
        .mockResolvedValueOnce([
          {
            action_item_id: 41,
            meeting_id: 134,
            action_title: 'Circulate resolutions',
            created_by: 8571,
            created_by_name: 'National Admin',
          },
        ])
        .mockResolvedValueOnce([{ user_id: 8571 }])    // resolveCreatorUserId for decision
        .mockResolvedValueOnce([{ decision_id: 52 }])
        .mockResolvedValueOnce([
          {
            decision_id: 52,
            meeting_id: 134,
            decision_title: 'Adopt programme',
            decision_description: 'Unanimously adopted',
            decision_type: 'resolution',
            decision_status: 'approved',
            voting_result: { in_favor: 13, against: 0 },
            created_by: 8571,
          },
        ]);

      // Act
      const actionId = await MeetingDocumentModel.createActionItem({
        meeting_id: 134,
        action_title: 'Circulate resolutions',
        due_date: new Date('2026-12-01T00:00:00.000Z'),
        created_by: 8571,
      });
      const actions = await MeetingDocumentModel.getActionItemsByMeeting(134);

      const decisionId = await MeetingDocumentModel.createDecision({
        meeting_id: 134,
        decision_title: 'Adopt programme',
        decision_description: 'Unanimously adopted',
        decision_type: 'resolution',
        decision_status: 'approved',
        voting_result: { in_favor: 13, against: 0 },
        created_by: 8571,
      });
      const decisions = await MeetingDocumentModel.getDecisionsByMeeting(134);

      // Assert
      expect(actionId).toBe(41);
      expect(actions[0].id).toBe(41);
      expect(mockExecuteQuery.mock.calls[2][0]).toContain('LEFT JOIN users u ON a.created_by = u.user_id');

      expect(decisionId).toBe(52);
      expect(decisions[0].id).toBe(52);
      expect(decisions[0].voting_result).toEqual({ in_favor: 13, against: 0 });
      expect(mockExecuteQuery.mock.calls[5][0]).toContain('LEFT JOIN users u ON d.created_by = u.user_id');
    });
  });
});

