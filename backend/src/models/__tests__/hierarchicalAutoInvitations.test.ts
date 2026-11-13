import { executeQuery, executeQuerySingle } from '../../config/database';
import { HierarchicalMeetingService } from '../../services/hierarchicalMeetingService';

jest.mock('../../config/database', () => ({
  executeQuery: jest.fn(),
  executeQuerySingle: jest.fn(),
  executeTransaction: jest.fn(),
}));

const mockExecuteQuery = executeQuery as jest.MockedFunction<typeof executeQuery>;
const mockExecuteQuerySingle = executeQuerySingle as jest.MockedFunction<typeof executeQuerySingle>;

describe('Provincial, Municipal, and Ward Hierarchical Auto-Invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HierarchicalMeetingService.getMeetingTypes', () => {
    it('expands Ward hierarchy filter to include both Ward and Branch meeting types', async () => {
      // Arrange
      mockExecuteQuery.mockResolvedValueOnce([
        { type_id: 26, type_code: 'bct_branch', hierarchy_level: 'Branch', type_name: 'BCT Meeting (Branch Command Team)', is_active: true },
        { type_id: 27, type_code: 'bga_branch', hierarchy_level: 'Branch', type_name: 'BGA Meeting (Branch General Assembly)', is_active: true },
        { type_id: 30, type_code: 'bpa_branch', hierarchy_level: 'Branch', type_name: "BPA Meeting (Branch People's Assembly)", is_active: true },
      ]);

      // Act
      const types = await HierarchicalMeetingService.getMeetingTypes('Ward');

      // Assert
      expect(types).toHaveLength(3);
      const [sql, params] = mockExecuteQuery.mock.calls[0];
      expect(sql).toContain('hierarchy_level IN ($1, $2)');
      expect(params).toEqual(['Ward', 'Branch']);
    });
  });

  describe('Provincial Meetings (pct_provincial)', () => {
    it('invites active Provincial Leadership, CCT Deployee, and Municipal Chairpersons & Secretaries in the selected province', async () => {
      // Arrange
      mockExecuteQuerySingle
        // 1. Meeting type lookup
        .mockResolvedValueOnce({
          type_id: 23,
          type_name: 'PCT Meeting (Provincial Command Team)',
          type_code: 'pct_provincial',
          hierarchy_level: 'Provincial',
          is_active: true,
        })
        // 2. Province lookup from province_code = 'FS'
        .mockResolvedValueOnce({
          province_id: 2,
          province_code: 'FS',
        });

      mockExecuteQuery.mockResolvedValueOnce([
        {
          member_id: 301,
          member_name: 'FS Deployee',
          member_email: 'cct.fs@eff.org.za',
          member_phone: '0820000301',
          membership_number: 'MEM000301',
          role_name: 'CCT Deployee - Free State',
          role_code: 'CCT_FS',
          position_category: 'Deployment',
          position_order: 1,
        },
        {
          member_id: 302,
          member_name: 'FS Prov Chair',
          member_email: 'pchair.fs@eff.org.za',
          member_phone: '0820000302',
          membership_number: 'MEM000302',
          role_name: 'Free State Provincial Chairperson',
          role_code: 'PCHAIR_FS',
          position_category: 'Executive',
          position_order: 2,
        },
        {
          member_id: 303,
          member_name: 'FS PCT Member',
          member_email: 'pct01.fs@eff.org.za',
          member_phone: '0820000303',
          membership_number: 'MEM000303',
          role_name: 'Free State PCT Member 01',
          role_code: 'PCT01_FS',
          position_category: 'PCT',
          position_order: 10,
        },
        // Duplicate member 303 also holding MCHAIR_FS181 (lower priority 5 vs PCT01_FS 6)
        {
          member_id: 303,
          member_name: 'FS PCT Member',
          member_email: 'pct01.fs@eff.org.za',
          member_phone: '0820000303',
          membership_number: 'MEM000303',
          role_name: 'Masilonyana Municipal Chairperson',
          role_code: 'MCHAIR_FS181',
          position_category: 'Executive',
          position_order: 1,
        },
        {
          member_id: 304,
          member_name: 'Masilonyana Chair',
          member_email: 'mchair.fs181@eff.org.za',
          member_phone: '0820000304',
          membership_number: 'MEM000304',
          role_name: 'Masilonyana Municipal Chairperson',
          role_code: 'MCHAIR_FS181',
          position_category: 'Executive',
          position_order: 1,
        },
        {
          member_id: 305,
          member_name: 'Masilonyana Sec',
          member_email: 'msec.fs181@eff.org.za',
          member_phone: '0820000305',
          membership_number: 'MEM000305',
          role_name: 'Masilonyana Municipal Secretary',
          role_code: 'MSEC_FS181',
          position_category: 'Executive',
          position_order: 2,
        },
      ]);

      // Act
      const invitations = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: 600,
        meeting_type_id: 23,
        hierarchy_level: 'Provincial',
        province_code: 'FS',
      });

      // Assert
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecuteQuery.mock.calls[0];
      expect(sql).toContain("la.appointment_status = 'Active'");
      expect(sql).not.toContain('expiry_date');
      expect(sql).toContain("LEFT(UPPER(lp.position_code), 7) = 'MCHAIR_'");
      expect(sql).toContain("LEFT(UPPER(lp.position_code), 5) = 'MSEC_'");
      expect(sql).toContain("lp.position_name NOT ILIKE '%Deputy%'");
      expect(params).toEqual([2, 3, '_FS', 'CCT_FS', 'CCT-FS', 'FS']);

      // 5 unique members (303 deduplicated)
      expect(invitations).toHaveLength(5);
      expect(invitations.map((i) => i.member_id)).toEqual([301, 302, 303, 304, 305]);
      expect(invitations.find((i) => i.member_id === 303)?.role_in_meeting).toBe('Free State PCT Member 01');
      expect(invitations.find((i) => i.member_id === 304)?.invitation_priority).toBe(5);
      expect(invitations.find((i) => i.member_id === 305)?.invitation_priority).toBe(4);
    });
  });

  describe('Municipal Meetings (srct_municipal)', () => {
    it('invites active Municipal Leadership and Ward Chairpersons & Secretaries in the selected municipality', async () => {
      // Arrange
      mockExecuteQuerySingle
        // 1. Meeting type lookup
        .mockResolvedValueOnce({
          type_id: 25,
          type_name: 'Sub-Regional Command Team Meeting',
          type_code: 'srct_municipal',
          hierarchy_level: 'Municipal',
          is_active: true,
        })
        // 2. Municipality lookup
        .mockResolvedValueOnce({
          municipality_id: 557,
          municipality_code: 'TSH004',
          province_code: 'GP',
        })
        // 3. Province lookup
        .mockResolvedValueOnce({
          province_id: 3,
          province_code: 'GP',
        });

      mockExecuteQuery.mockResolvedValueOnce([
        {
          member_id: 401,
          member_name: 'TSH004 Chair',
          member_email: 'mchair@eff.org.za',
          member_phone: '0820000401',
          membership_number: 'MEM000401',
          role_name: 'TSH - 4 Municipal Chairperson',
          role_code: 'MCHAIR_TSH004',
          position_category: 'Executive',
          position_order: 1,
        },
        {
          member_id: 402,
          member_name: 'TSH004 Add Member',
          member_email: 'madd01@eff.org.za',
          member_phone: '0820000402',
          membership_number: 'MEM000402',
          role_name: 'TSH - 4 Additional Member 01',
          role_code: 'MADD01_TSH004',
          position_category: 'Additional Member',
          position_order: 6,
        },
        {
          member_id: 403,
          member_name: 'Ward 48 Chair',
          member_email: 'wchair48@eff.org.za',
          member_phone: '0820000403',
          membership_number: 'MEM000403',
          role_name: 'Ward 48 Chairperson',
          role_code: 'WCHAIR_79900048',
          position_category: 'Executive',
          position_order: 1,
        },
        {
          member_id: 404,
          member_name: 'Ward 48 Secretary',
          member_email: 'wsec48@eff.org.za',
          member_phone: '0820000404',
          membership_number: 'MEM000404',
          role_name: 'Ward 48 Secretary',
          role_code: 'WSEC_79900048',
          position_category: 'Executive',
          position_order: 2,
        },
      ]);

      // Act
      const invitations = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: 601,
        meeting_type_id: 25,
        hierarchy_level: 'Municipal',
        municipality_code: 'TSH004',
      });

      // Assert
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecuteQuery.mock.calls[0];
      expect(sql).toContain("LEFT(UPPER(lp.position_code), 7) = 'WCHAIR_'");
      expect(sql).toContain("LEFT(UPPER(lp.position_code), 5) = 'WSEC_'");
      expect(sql).toContain("lp.position_name NOT ILIKE '%Deputy%'");
      expect(params).toEqual([557, 557, 7, '_TSH004', 'TSH004', 557]);

      expect(invitations.map((i) => i.member_id)).toEqual([401, 402, 403, 404]);
      expect(invitations.find((i) => i.member_id === 401)?.invitation_priority).toBe(9);
      expect(invitations.find((i) => i.member_id === 402)?.invitation_priority).toBe(6);
      expect(invitations.find((i) => i.member_id === 403)?.invitation_priority).toBe(5);
      expect(invitations.find((i) => i.member_id === 404)?.invitation_priority).toBe(4);
    });
  });

  describe('Ward / Branch Meetings (bct_branch vs bga_branch)', () => {
    it('invites ONLY active Ward Leadership for bct_branch meetings', async () => {
      // Arrange
      mockExecuteQuerySingle
        .mockResolvedValueOnce({
          type_id: 26,
          type_name: 'BCT Meeting (Branch Command Team)',
          type_code: 'bct_branch',
          hierarchy_level: 'Branch',
          is_active: true,
        })
        .mockResolvedValueOnce({
          ward_id: 3098,
          ward_code: '79900048',
          municipality_code: 'TSH004',
          municipality_id: 557,
          province_code: 'GP',
        })
        .mockResolvedValueOnce({
          province_id: 3,
          province_code: 'GP',
        });

      mockExecuteQuery.mockResolvedValueOnce([
        {
          member_id: 501,
          member_name: 'Ward 48 Chair',
          member_email: 'wchair48@eff.org.za',
          member_phone: '0820000501',
          membership_number: 'MEM000501',
          role_name: 'Ward 48 Chairperson',
          role_code: 'WCHAIR_79900048',
          position_category: 'Executive',
          position_order: 1,
        },
        {
          member_id: 502,
          member_name: 'Ward 48 Treasurer',
          member_email: 'wtreas48@eff.org.za',
          member_phone: '0820000502',
          membership_number: 'MEM000502',
          role_name: 'Ward 48 Treasurer',
          role_code: 'WTREAS_79900048',
          position_category: 'Executive',
          position_order: 3,
        },
      ]);

      // Act
      const invitations = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: 602,
        meeting_type_id: 26,
        hierarchy_level: 'Ward',
        ward_code: '79900048',
      });

      // Assert: only 1 executeQuery (leadership only, NOT all ward members)
      expect(mockExecuteQuery).toHaveBeenCalledTimes(1);
      expect(invitations).toHaveLength(2);
      expect(invitations.map((i) => i.member_id)).toEqual([501, 502]);
      expect(invitations[0].role_in_meeting).toBe('Ward 48 Chairperson');
      expect(invitations[1].role_in_meeting).toBe('Ward 48 Treasurer');
    });

    it('invites all Ward Members AND Ward Leadership for bga_branch meetings, preserving higher-priority leadership roles on deduplication', async () => {
      // Arrange
      mockExecuteQuerySingle
        .mockResolvedValueOnce({
          type_id: 27,
          type_name: 'BGA Meeting (Branch General Assembly)',
          type_code: 'bga_branch',
          hierarchy_level: 'Branch',
          is_active: true,
        })
        .mockResolvedValueOnce({
          ward_id: 3098,
          ward_code: '79900048',
          municipality_code: 'TSH004',
          municipality_id: 557,
          province_code: 'GP',
        })
        .mockResolvedValueOnce({
          province_id: 3,
          province_code: 'GP',
        });

      mockExecuteQuery
        // 1. Ward leadership query
        .mockResolvedValueOnce([
          {
            member_id: 501,
            member_name: 'Ward 48 Chair',
            member_email: 'wchair48@eff.org.za',
            member_phone: '0820000501',
            membership_number: 'MEM000501',
            role_name: 'Ward 48 Chairperson',
            role_code: 'WCHAIR_79900048',
            position_category: 'Executive',
            position_order: 1,
          },
        ])
        // 2. All ward members query (includes 501 who is also a ward resident, plus 503 & 504)
        .mockResolvedValueOnce([
          {
            member_id: 501,
            member_name: 'Ward 48 Chair',
            member_email: 'wchair48@eff.org.za',
            member_phone: '0820000501',
            membership_number: 'MEM000501',
          },
          {
            member_id: 503,
            member_name: 'Resident One',
            member_email: 'res1@eff.org.za',
            member_phone: '0820000503',
            membership_number: 'MEM000503',
          },
          {
            member_id: 504,
            member_name: 'Resident Two',
            member_email: '',
            member_phone: '0820000504',
            membership_number: 'MEM000504',
          },
        ]);

      // Act
      const invitations = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: 603,
        meeting_type_id: 27,
        hierarchy_level: 'Ward',
        ward_code: '79900048',
      });

      // Assert
      expect(mockExecuteQuery).toHaveBeenCalledTimes(2);
      expect(invitations).toHaveLength(3);
      expect(invitations.map((i) => i.member_id)).toEqual([501, 503, 504]);

      // Member 501 retains 'Ward 48 Chairperson' (priority 9) rather than 'Ward Member' (priority 2)
      expect(invitations[0]).toMatchObject({
        member_id: 501,
        role_in_meeting: 'Ward 48 Chairperson',
        invitation_priority: 9,
      });
      expect(invitations[1]).toMatchObject({
        member_id: 503,
        role_in_meeting: 'Ward Member',
        invitation_priority: 2,
      });
    });
  });
});

