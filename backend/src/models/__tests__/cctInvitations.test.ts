import { executeQuery, executeQuerySingle } from '../../config/database';
import { MeetingModel } from '../meetings';
import { HierarchicalMeetingService } from '../../services/hierarchicalMeetingService';
import { MeetingInvitationService } from '../../services/meetingInvitationService';

jest.mock('../../config/database', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  executeTransaction: jest.fn(),
}));

const mockExecuteQuery = executeQuery as jest.MockedFunction<typeof executeQuery>;
const mockExecuteQuerySingle = executeQuerySingle as jest.MockedFunction<typeof executeQuerySingle>;

describe('National CCT & War Council Meeting Invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HierarchicalMeetingService.generateAutoInvitations (cct_national)', () => {
    it('invites War Council, CCT Leadership, National Executive Heads, and Provincial Chairpersons & Secretaries sorted by priority and deduplicated by member_id', async () => {
      // Arrange
      mockExecuteQuerySingle.mockResolvedValueOnce({
        type_id: 21,
        type_name: 'CCT Meeting (Central Command Team)',
        type_code: 'cct_national',
        hierarchy_level: 'National',
        is_active: true,
      });

      const warCouncilRows = [
        {
          member_id: 101,
          member_name: 'President One',
          member_email: 'pres@eff.org.za',
          member_phone: '0820000001',
          membership_number: 'MEM000101',
          role_name: 'President',
          role_code: 'PRES',
          position_category: 'Executive',
          position_order: 1,
        },
        {
          member_id: 102,
          member_name: 'SecGen Two',
          member_email: 'sg@eff.org.za',
          member_phone: '0820000002',
          membership_number: 'MEM000102',
          role_name: 'Secretary General',
          role_code: 'SG',
          position_category: 'Executive',
          position_order: 3,
        },
        {
          member_id: 103,
          member_name: 'Deployee Three',
          member_email: 'cct.ec@eff.org.za',
          member_phone: '0820000003',
          membership_number: 'MEM000103',
          role_name: 'CCT Deployee - Eastern Cape',
          role_code: 'CCT_EC',
          position_category: 'Deployment',
          position_order: 10,
        },
      ];

      const cctAndProvincialRows = [
        // Duplicate member 101 also holding CCT01 (lower priority 6 vs PRES 10)
        {
          member_id: 101,
          member_name: 'President One',
          member_email: '',
          member_phone: '',
          membership_number: 'MEM000101',
          role_name: 'Central Command Team Member 01',
          role_code: 'CCT01',
          position_category: 'CCT',
          position_order: 20,
        },
        // National Executive Head (priority 7)
        {
          member_id: 104,
          member_name: 'Head Presidency',
          member_email: 'hop@eff.org.za',
          member_phone: '0820000004',
          membership_number: 'MEM000104',
          role_name: 'Head of Presidency',
          role_code: 'HOP',
          position_category: 'Executive',
          position_order: 15,
        },
        // CCT Leadership Member (priority 6)
        {
          member_id: 105,
          member_name: 'CCT Leader Five',
          member_email: 'cct05@eff.org.za',
          member_phone: '0820000005',
          membership_number: 'MEM000105',
          role_name: 'Central Command Team Member 05',
          role_code: 'CCT05',
          position_category: 'CCT',
          position_order: 25,
        },
        // Duplicate member 103 also holding PCHAIR_EC (lower priority 5 vs CCT_EC 7)
        {
          member_id: 103,
          member_name: 'Deployee Three',
          member_email: 'cct.ec@eff.org.za',
          member_phone: '0820000003',
          membership_number: 'MEM000103',
          role_name: 'Provincial Chairperson - Eastern Cape',
          role_code: 'PCHAIR_EC',
          position_category: 'Executive',
          position_order: 1,
        },
        // Provincial Chairperson (priority 5)
        {
          member_id: 201,
          member_name: 'Prov Chair GP',
          member_email: 'pchair.gp@eff.org.za',
          member_phone: '0820000201',
          membership_number: 'MEM000201',
          role_name: 'Provincial Chairperson - Gauteng',
          role_code: 'PCHAIR_GP',
          position_category: 'Executive',
          position_order: 1,
        },
        // Provincial Secretary (priority 4)
        {
          member_id: 202,
          member_name: 'Prov Sec EC',
          member_email: 'psec.ec@eff.org.za',
          member_phone: '0820000202',
          membership_number: 'MEM000202',
          role_name: 'Provincial Secretary - Eastern Cape',
          role_code: 'PSEC_EC',
          position_category: 'Executive',
          position_order: 3,
        },
      ];

      mockExecuteQuery
        .mockResolvedValueOnce(warCouncilRows)
        .mockResolvedValueOnce(cctAndProvincialRows);

      // Act
      const invitations = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: 500,
        meeting_type_id: 21,
        hierarchy_level: 'National',
      });

      // Assert
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);

      const warCouncilSql = mockExecuteQuery.mock.calls[0][0];
      const cctProvincialSql = mockExecuteQuery.mock.calls[1][0];

      // Active appointment check without membership expiry exclusion
      expect(warCouncilSql).toContain("la.appointment_status = 'Active'");
      expect(warCouncilSql).not.toContain('expiry_date');
      expect(cctProvincialSql).toContain("la.appointment_status = 'Active'");
      expect(cctProvincialSql).not.toContain('expiry_date');

      // Provincial Chairpersons & Secretaries strictly targeted, Deputies excluded
      expect(cctProvincialSql).toContain("LEFT(lp.position_code, 7) = 'PCHAIR_'");
      expect(cctProvincialSql).toContain("LEFT(lp.position_code, 5) = 'PSEC_'");
      expect(cctProvincialSql).toContain("lp.position_name NOT ILIKE '%Deputy%'");
      expect(cctProvincialSql).not.toContain('PDCHAIR');
      expect(cctProvincialSql).not.toContain('PDSEC');

      // 7 unique members (101 and 103 deduplicated)
      expect(invitations).toHaveLength(7);

      // Ordered by invitation_priority descending
      expect(invitations.map((i) => i.member_id)).toEqual([101, 102, 103, 104, 105, 201, 202]);

      // Highest-priority role & contact fields preserved on deduplicated members
      const presInvite = invitations.find((i) => i.member_id === 101);
      expect(presInvite).toMatchObject({
        member_id: 101,
        member_name: 'President One',
        member_email: 'pres@eff.org.za',
        role_in_meeting: 'President',
        invitation_priority: 10,
        attendance_type: 'Required',
        voting_rights: true,
      });

      const deployeeInvite = invitations.find((i) => i.member_id === 103);
      expect(deployeeInvite).toMatchObject({
        member_id: 103,
        role_in_meeting: 'CCT Deployee - Eastern Cape',
        invitation_priority: 7,
      });

      const provChairInvite = invitations.find((i) => i.member_id === 201);
      expect(provChairInvite?.invitation_priority).toBe(5);

      const provSecInvite = invitations.find((i) => i.member_id === 202);
      expect(provSecInvite?.invitation_priority).toBe(4);
    });
  });

  describe('HierarchicalMeetingService.generateAutoInvitations (war_council)', () => {
    it('queries only War Council core and CCT Deployees for war_council meetings', async () => {
      // Arrange
      mockExecuteQuerySingle.mockResolvedValueOnce({
        type_id: 22,
        type_name: 'War Council Meeting',
        type_code: 'war_council',
        hierarchy_level: 'National',
        is_active: true,
      });
      mockExecuteQuery.mockResolvedValueOnce([
        {
          member_id: 101,
          member_name: 'President One',
          member_email: 'pres@eff.org.za',
          member_phone: '0820000001',
          membership_number: 'MEM000101',
          role_name: 'President',
          role_code: 'PRES',
          position_category: 'Executive',
          position_order: 1,
        },
      ]);

      // Act
      const invitations = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: 501,
        meeting_type_id: 22,
        hierarchy_level: 'National',
      });

      // Assert
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
      expect(invitations).toHaveLength(1);
      expect(invitations[0]).toMatchObject({
        member_id: 101,
        member_name: 'President One',
        role_in_meeting: 'President',
        invitation_priority: 10,
      });
    });
  });

  describe('MeetingModel invitation & update helpers', () => {
    it('stores member_name as invitee_name and member_email as invitee_email in createInvitation', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([{ invitation_id: 88 }]);

      // Act
      const id = await MeetingModel.createInvitation({
        meeting_id: 500,
        member_id: 201,
        member_name: 'Prov Chair GP',
        member_email: 'pchair.gp@eff.org.za',
        role_in_meeting: 'Provincial Chairperson - Gauteng',
        invitation_status: 'Sent',
        created_by: 1,
      });

      // Assert
      expect(id).toBe(88);
      const [, params] = mockExecuteQuery.mock.calls[0];
      expect(params).toEqual([
        500,
        'Member',
        201,
        'pchair.gp@eff.org.za',
        'Prov Chair GP',
        'Sent',
        null,
        1,
      ]);
    });

    it('returns true from updateMeeting when PostgreSQL RETURNING yields updated meeting_id', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([{ meeting_id: 500 }]);

      // Act
      const updated = await MeetingModel.updateMeeting(500, { meeting_status: 'Scheduled' });

      // Assert
      expect(updated).toBe(true);
      expect(mockExecuteQuery.mock.calls[0][0]).toContain('RETURNING meeting_id');
    });
  });

  describe('MeetingInvitationService.getMeetingAttendance', () => {
    it('joins users table for created_by_name and returns attendance summary', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([
        {
          invitation_id: 88,
          meeting_id: 500,
          member_id: 201,
          member_name: 'Prov Chair GP',
          email: 'pchair.gp@eff.org.za',
          phone: '0820000201',
          phone_number: '0820000201',
          member_number: 'MEM000201',
          invitation_status: 'Sent',
          created_by_name: 'National Admin',
        },
      ]);

      // Act
      const result = await MeetingInvitationService.getMeetingAttendance(500);

      // Assert
      const executedSql = mockExecuteQuery.mock.calls[0][0];
      expect(executedSql).toContain('LEFT JOIN users u ON mi.created_by = u.user_id');
      expect(executedSql).not.toContain('LEFT JOIN members_consolidated creator');
      expect(result.summary.total_attendees).toBe(1);
      expect(result.summary.sent).toBe(1);
      expect(result.attendance[0].phone_number).toBe('0820000201');
    });
  });
});

