import { Pool } from 'pg';
import { DatabaseOperationsService } from '../databaseOperationsService';
import { LookupService } from '../lookupService';
import { BulkUploadRecord, ExistingMemberRecord, IECVerificationResult } from '../types';

// Mock pg Pool
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  const mockPool = {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    query: jest.fn(),
    end: jest.fn()
  };

  return { Pool: jest.fn(() => mockPool) };
});

// Mock LookupService
jest.mock('../lookupService');

describe('DatabaseOperationsService', () => {
  let service: DatabaseOperationsService;
  let mockPool: any;
  let mockClient: any;
  let mockLookupService: jest.Mocked<LookupService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock client for each test
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Create mock pool
    mockPool = new Pool();
    mockPool.connect = jest.fn().mockResolvedValue(mockClient);

    // Create mock lookup service with default return values
    mockLookupService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      lookupId: jest.fn().mockReturnValue(1),
      getGenderId: jest.fn().mockReturnValue(1),
      getRaceId: jest.fn().mockReturnValue(1),
      getCitizenshipId: jest.fn().mockReturnValue(1),
      getLanguageId: jest.fn().mockReturnValue(1),
      getOccupationId: jest.fn().mockReturnValue(1),
      getQualificationId: jest.fn().mockReturnValue(1),
      getVoterStatusId: jest.fn().mockReturnValue(1),
      getSubscriptionTypeId: jest.fn().mockReturnValue(1),
      normalizeVoterStatus: jest.fn().mockReturnValue('Registered')
    } as any;

    service = new DatabaseOperationsService(mockPool, mockLookupService);
  });

  describe('processRecords', () => {
    it('should insert new members successfully', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe',
          'Cell Number': '0821234567',
          Email: 'john@example.com',
          'Date Joined': new Date('2024-01-01'),
          'Last Payment': new Date('2024-01-01'),
          'Expiry Date': new Date('2026-01-01')
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voter_status: 'Registered',
          province_code: '5',
          municipality_code: '599',
          ward_code: '59900001',
          voting_district_code: '59900001001',
          verification_date: new Date()
        }]
      ]);

      // Mock BEGIN, INSERT, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ member_id: 12345 }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, [], iecResults);

      expect(result.operation_stats.total_records).toBe(1);
      expect(result.operation_stats.inserts).toBe(1);
      expect(result.operation_stats.updates).toBe(0);
      expect(result.operation_stats.failures).toBe(0);
      expect(result.successful_operations).toHaveLength(1);
      expect(result.successful_operations[0].operation).toBe('insert');
      expect(result.successful_operations[0].member_id).toBe(12345);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should update existing members successfully', async () => {
      const existingMembers: ExistingMemberRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe',
          'Cell Number': '0821234567',
          Email: 'john@example.com',
          'Last Payment': new Date('2024-06-01'),
          'Expiry Date': new Date('2026-06-01'),
          existing_member_id: 12345,
          existing_name: 'John Doe',
          existing_ward: '59900001',
          existing_vd: '59900001001',
          existing_created_at: new Date('2023-01-01'),
          existing_updated_at: new Date('2023-01-01'),
          ward_changed: false,
          vd_changed: false
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voter_status: 'Registered',
          province_code: '5',
          municipality_code: '599',
          ward_code: '59900001',
          voting_district_code: '59900001001',
          verification_date: new Date()
        }]
      ]);

      // Mock BEGIN, UPDATE, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords([], existingMembers, iecResults);

      expect(result.operation_stats.total_records).toBe(1);
      expect(result.operation_stats.inserts).toBe(0);
      expect(result.operation_stats.updates).toBe(1);
      expect(result.operation_stats.failures).toBe(0);
      expect(result.successful_operations).toHaveLength(1);
      expect(result.successful_operations[0].operation).toBe('update');
      expect(result.successful_operations[0].member_id).toBe(12345);
    });

    it('should handle mixed inserts and updates', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe'
        }
      ];

      const existingMembers: ExistingMemberRecord[] = [
        {
          row_number: 3,
          'ID Number': '9001010001088',
          Name: 'Jane',
          Surname: 'Smith',
          existing_member_id: 12346,
          existing_name: 'Jane Smith',
          existing_ward: '59900002',
          existing_vd: '59900002001',
          existing_created_at: new Date(),
          existing_updated_at: new Date(),
          ward_changed: false,
          vd_changed: false
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voting_district_code: '59900001001',
          verification_date: new Date()
        }],
        ['9001010001088', {
          id_number: '9001010001088',
          is_registered: true,
          voting_district_code: '59900002001',
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ member_id: 12345 }] }) // INSERT
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, existingMembers, iecResults);

      expect(result.operation_stats.total_records).toBe(2);
      expect(result.operation_stats.inserts).toBe(1);
      expect(result.operation_stats.updates).toBe(1);
      expect(result.operation_stats.failures).toBe(0);
    });

    it('should skip records without IEC results', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe'
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>(); // Empty

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, [], iecResults);

      expect(result.operation_stats.total_records).toBe(1);
      expect(result.operation_stats.inserts).toBe(0);
      expect(result.operation_stats.skipped).toBe(1);
      expect(result.failed_operations).toHaveLength(1);
      expect(result.failed_operations[0].operation).toBe('skip');
      expect(result.failed_operations[0].error).toBe('No IEC verification result');
    });

    it('should handle insert errors and continue processing', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe'
        },
        {
          row_number: 3,
          'ID Number': '9001010001088',
          Name: 'Jane',
          Surname: 'Smith'
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voting_district_code: '59900001001',
          verification_date: new Date()
        }],
        ['9001010001088', {
          id_number: '9001010001088',
          is_registered: true,
          voting_district_code: '59900002001',
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database constraint violation')) // INSERT fails
        .mockResolvedValueOnce({ rows: [{ member_id: 12346 }] }) // INSERT succeeds
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, [], iecResults);

      expect(result.operation_stats.total_records).toBe(2);
      expect(result.operation_stats.inserts).toBe(1);
      expect(result.operation_stats.failures).toBe(1);
      expect(result.failed_operations).toHaveLength(1);
      expect(result.failed_operations[0].error).toBe('Database constraint violation');
    });

    it('should handle transaction errors gracefully', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe'
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voting_district_code: '59900001001',
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // INSERT fails
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, [], iecResults);

      // Service should handle individual errors and continue
      expect(result.operation_stats.failures).toBe(1);
      expect(result.failed_operations[0].error).toBe('Database error');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle VD code mapping (22222222, 99999999)', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe'
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voting_district_code: '22222222', // Registered without VD (8 digits)
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ member_id: 12345 }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, [], iecResults);

      expect(result.operation_stats.inserts).toBe(1);

      // Check that the INSERT query was called with VD code 22222222 (8 digits)
      const insertCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO members_consolidated')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain('22222222');
    });

    it('should handle empty records arrays', async () => {
      const iecResults = new Map<string, IECVerificationResult>();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords([], [], iecResults);

      expect(result.operation_stats.total_records).toBe(0);
      expect(result.operation_stats.inserts).toBe(0);
      expect(result.operation_stats.updates).toBe(0);
      expect(result.operation_stats.failures).toBe(0);
    });

    it('should set membership_status_id to 1 (Good Standing) for new members', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Name: 'John',
          Surname: 'Doe'
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          voting_district_code: '59900001001',
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ member_id: 12345 }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.processRecords(newMembers, [], iecResults);

      // Check that the INSERT query includes membership_status_id = 1
      const insertCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO members_consolidated')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1][31]).toBe(1); // membership_status_id parameter (position 32 in 35-field insert)
    });

    it('should insert member with all 35 fields from real-world data', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '7010200407080',
          Firstname: 'Williams',
          Surname: 'Yalegae',
          Age: 54,
          Gender: 'Female',
          Race: 'BLACK',
          Citizenship: 'South Africa',
          Language: 'TSWANA',
          'Residential Address': '2406 White city',
          'Cell Number': '0821234567',
          Email: 'williams@example.com',
          Occupation: 'unemployed',
          Qualification: 'n/a',
          Province: 'Free State',
          Region: 'XHARIEP',
          Municipality: 'FS161 - Letsemeng',
          Ward: 41601003,
          'Voting Station': 'INOSENG PRIMARY SCHOOL',
          'Date Joined': '2025-02-18T00:00:00+02:00',
          'Last Payment': 45706,
          Subscription: 'Renewal',
          'Memebership Amount': 'R10.00',
          Status: 'Yes'
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['7010200407080', {
          id_number: '7010200407080',
          is_registered: true,
          voter_status: 'Registered',
          province_code: 'FS',
          municipality_code: 'FS161',
          ward_code: '41601003',
          voting_district_code: '41601003001',
          verification_date: new Date()
        }]
      ]);

      // Mock lookup service responses
      mockLookupService.getGenderId.mockReturnValue(2); // Female
      mockLookupService.getRaceId.mockReturnValue(1); // African
      mockLookupService.getCitizenshipId.mockReturnValue(1); // SA Citizen
      mockLookupService.getLanguageId.mockReturnValue(6); // Tswana
      mockLookupService.getOccupationId.mockReturnValue(1);
      mockLookupService.getQualificationId.mockReturnValue(1);
      mockLookupService.getVoterStatusId.mockReturnValue(1);
      mockLookupService.getSubscriptionTypeId.mockReturnValue(2); // Renewal

      // Mock BEGIN, INSERT, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ member_id: 12345 }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords(newMembers, [], iecResults);

      expect(result.operation_stats.total_records).toBe(1);
      expect(result.operation_stats.inserts).toBe(1);
      expect(result.successful_operations[0].member_id).toBe(12345);

      // Verify INSERT query was called with all 35 fields
      const insertCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO members_consolidated')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[0]).toContain('id_number, firstname, surname, date_of_birth, age, gender_id, race_id');
      expect(insertCall[0]).toContain('citizenship_id, language_id, ward_code, voter_district_code, voting_district_code');
      expect(insertCall[0]).toContain('voting_station_id, residential_address, cell_number, email, occupation_id');
      expect(insertCall[0]).toContain('qualification_id, voter_status_id, membership_type');
      expect(insertCall[0]).toContain('province_name, province_code, district_name, district_code');
      expect(insertCall[0]).toContain('municipality_name, municipality_code');
      expect(insertCall[0]).toContain('date_joined, last_payment_date, expiry_date, subscription_type_id');
      expect(insertCall[0]).toContain('membership_amount, membership_status_id, payment_method, payment_reference, payment_status');

      // Verify parameters (35 total)
      const params = insertCall[1];
      expect(params.length).toBe(35);
      expect(params[0]).toBe('7010200407080'); // id_number
      expect(params[1]).toBe('Williams'); // firstname
      expect(params[2]).toBe('Yalegae'); // surname
      expect(params[3]).toBeInstanceOf(Date); // date_of_birth (extracted from ID)
      expect(params[4]).toBeGreaterThan(0); // age (calculated)
      expect(params[5]).toBe(2); // gender_id (Female)
      expect(params[6]).toBe(1); // race_id (African)
      expect(params[7]).toBe(1); // citizenship_id
      expect(params[8]).toBe(6); // language_id (Tswana)
      expect(params[9]).toBe('41601003'); // ward_code
      expect(params[11]).toBe('41601003001'); // voting_district_code
      expect(params[13]).toBe('2406 White city'); // residential_address
      expect(params[14]).toBe('0821234567'); // cell_number
      expect(params[15]).toBe('williams@example.com'); // email
      expect(params[19]).toBe('Regular'); // membership_type
      expect(params[20]).toBe('Free State'); // province_name
      expect(params[21]).toBe('FS'); // province_code
      expect(params[24]).toBe('FS161 - Letsemeng'); // municipality_name
      expect(params[25]).toBe('FS161'); // municipality_code
      expect(params[29]).toBe(2); // subscription_type_id (Renewal)
      expect(params[30]).toBe(10); // membership_amount (parsed from R10.00)
      expect(params[31]).toBe(1); // membership_status_id (Good Standing)
      expect(params[34]).toBe('Pending'); // payment_status
    });

    it('should verify VARCHAR casting for code fields', async () => {
      const newMembers: BulkUploadRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Firstname: 'John',
          Surname: 'Doe',
          Ward: 59900001
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          province_code: '5',
          municipality_code: '599',
          ward_code: '59900001',
          voting_district_code: '59900001001',
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ member_id: 12345 }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.processRecords(newMembers, [], iecResults);

      // Verify VARCHAR casting in query
      const insertCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO members_consolidated')
      );
      expect(insertCall).toBeDefined();
      // Check for VARCHAR casts: $10::VARCHAR, $11::VARCHAR, $12::VARCHAR, $15::VARCHAR, $22::VARCHAR, $24::VARCHAR, $26::VARCHAR
      expect(insertCall[0]).toContain('$10::VARCHAR'); // ward_code
      expect(insertCall[0]).toContain('$11::VARCHAR'); // voter_district_code
      expect(insertCall[0]).toContain('$12::VARCHAR'); // voting_district_code
      expect(insertCall[0]).toContain('$15::VARCHAR'); // cell_number
      expect(insertCall[0]).toContain('$22::VARCHAR'); // province_code
      expect(insertCall[0]).toContain('$24::VARCHAR'); // district_code
      expect(insertCall[0]).toContain('$26::VARCHAR'); // municipality_code
    });

    it('should update existing member with all updatable fields', async () => {
      const existingMembers: ExistingMemberRecord[] = [
        {
          row_number: 2,
          'ID Number': '8001015009087',
          Firstname: 'John',
          Surname: 'Doe',
          Gender: 'Male',
          Race: 'African',
          Citizenship: 'South African Citizen',
          Language: 'English',
          'Residential Address': '123 Main St',
          'Cell Number': '0821234567',
          Email: 'john@example.com',
          Occupation: 'Engineer',
          Qualification: 'Degree',
          Province: 'Gauteng',
          Municipality: 'Johannesburg',
          Ward: 59900001,
          'Last Payment': new Date('2024-01-01'),
          'Expiry Date': new Date('2026-01-01'),
          Subscription: 'Renewal',
          'Membership Amount': '100.00',
          existing_member_id: 12345,
          existing_name: 'John Doe',
          existing_ward: '59900001',
          existing_vd: '59900001001',
          existing_created_at: new Date('2023-01-01'),
          existing_updated_at: new Date('2023-01-01'),
          ward_changed: false,
          vd_changed: false
        }
      ];

      const iecResults = new Map<string, IECVerificationResult>([
        ['8001015009087', {
          id_number: '8001015009087',
          is_registered: true,
          province_code: 'GP',
          municipality_code: 'JHB',
          ward_code: '59900001',
          voting_district_code: '59900001001',
          verification_date: new Date()
        }]
      ]);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.processRecords([], existingMembers, iecResults);

      expect(result.operation_stats.total_records).toBe(1);
      expect(result.operation_stats.updates).toBe(1);

      // Verify UPDATE query includes all updatable fields with COALESCE
      const updateCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('UPDATE members_consolidated')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('firstname = COALESCE($1, firstname)');
      expect(updateCall[0]).toContain('surname = COALESCE($2, surname)');
      expect(updateCall[0]).toContain('date_of_birth = COALESCE($3, date_of_birth)');
      expect(updateCall[0]).toContain('age = COALESCE($4, age)');
      expect(updateCall[0]).toContain('gender_id = COALESCE($5, gender_id)');
      expect(updateCall[0]).toContain('race_id = COALESCE($6, race_id)');
      expect(updateCall[0]).toContain('citizenship_id = COALESCE($7, citizenship_id)');
      expect(updateCall[0]).toContain('language_id = COALESCE($8, language_id)');
      expect(updateCall[0]).toContain('occupation_id = COALESCE($14, occupation_id)');
      expect(updateCall[0]).toContain('qualification_id = COALESCE($15, qualification_id)');
      expect(updateCall[0]).toContain('voter_status_id = COALESCE($16, voter_status_id)');
      expect(updateCall[0]).toContain('subscription_type_id = COALESCE($24, subscription_type_id)');
      expect(updateCall[0]).toContain('membership_amount = COALESCE($25, membership_amount)');
      expect(updateCall[0]).toContain('updated_at = NOW()');
      expect(updateCall[0]).toContain('WHERE member_id = $26');
    });
  });
});
