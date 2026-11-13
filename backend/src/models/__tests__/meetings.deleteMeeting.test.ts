import { executeTransaction } from '../../config/database';
import { MeetingModel } from '../meetings';
import { HierarchicalMeetingService } from '../../services/hierarchicalMeetingService';

jest.mock('../../config/database', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  executeTransaction: jest.fn(),
}));

const mockExecuteTransaction = executeTransaction as jest.MockedFunction<typeof executeTransaction>;

describe('Meeting deletion regression tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MeetingModel.deleteMeeting', () => {
    it('deletes dependent records in FK-safe order and returns true when meeting row is deleted', async () => {
      // Arrange
      const meetingId = 42;
      mockExecuteTransaction.mockResolvedValue([
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [{ meeting_id: meetingId }],
      ]);

      // Act
      const result = await MeetingModel.deleteMeeting(meetingId);

      // Assert
      expect(result).toBe(true);
      expect(mockExecuteTransaction).toHaveBeenCalledTimes(1);

      const statements = mockExecuteTransaction.mock.calls[0][0];
      expect(statements[0]).toEqual({
        query: 'UPDATE ward_compliance_audit_log SET last_meeting_id = NULL WHERE last_meeting_id = $1',
        params: [meetingId],
      });

      const queries = statements.map((s) => s.query);
      const actionItemsIdx = queries.findIndex((q) => q.includes('DELETE FROM meeting_action_items'));
      const decisionsIdx = queries.findIndex((q) => q.includes('DELETE FROM meeting_decisions'));
      const documentsIdx = queries.findIndex((q) => q.includes('DELETE FROM meeting_documents'));
      expect(actionItemsIdx).toBeGreaterThan(-1);
      expect(decisionsIdx).toBeGreaterThan(-1);
      expect(documentsIdx).toBeGreaterThan(actionItemsIdx);
      expect(documentsIdx).toBeGreaterThan(decisionsIdx);

      expect(statements[statements.length - 1]).toEqual({
        query: 'DELETE FROM meetings WHERE meeting_id = $1 RETURNING meeting_id',
        params: [meetingId],
      });
    });

    it('returns false when no meeting row matches the given id', async () => {
      // Arrange
      mockExecuteTransaction.mockResolvedValue([[], [], [], [], [], [], [], [], [], [], []]);

      // Act
      const result = await MeetingModel.deleteMeeting(9999);

      // Assert
      expect(result).toBe(false);
    });

    it('throws a database error when the transaction fails', async () => {
      // Arrange
      mockExecuteTransaction.mockRejectedValue(new Error('FK constraint violation'));

      // Act & Assert
      await expect(MeetingModel.deleteMeeting(42)).rejects.toThrow('Failed to delete meeting');
    });
  });

  describe('HierarchicalMeetingService.deleteMeeting', () => {
    it('delegates to MeetingModel.deleteMeeting and returns deletion status', async () => {
      // Arrange
      mockExecuteTransaction.mockResolvedValue([
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [{ meeting_id: 77 }],
      ]);

      // Act
      const response = await HierarchicalMeetingService.deleteMeeting(77);

      // Assert
      expect(response).toEqual({ deleted: true });
      expect(mockExecuteTransaction).toHaveBeenCalledTimes(1);
    });
  });
});

