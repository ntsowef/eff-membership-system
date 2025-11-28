import { IECVerificationService } from '../iecVerificationService';
import { iecApiService } from '../../iecApiService';
import { IECRateLimitService } from '../../iecRateLimitService';
import { BulkUploadRecord } from '../types';

// Mock dependencies
jest.mock('../../iecApiService');
jest.mock('../../iecRateLimitService');

describe('IECVerificationService', () => {
  let mockIecApiService: jest.Mocked<typeof iecApiService>;
  let mockRateLimitService: jest.Mocked<typeof IECRateLimitService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockIecApiService = iecApiService as jest.Mocked<typeof iecApiService>;
    mockRateLimitService = IECRateLimitService as jest.Mocked<typeof IECRateLimitService>;

    // Default mock: rate limit not exceeded
    mockRateLimitService.incrementAndCheck.mockResolvedValue({
      current_count: 100,
      max_limit: 10000,
      remaining: 9900,
      reset_time: Date.now() + 3600000,
      is_limited: false,
      is_warning: false,
      percentage_used: 1.0
    });
  });

  describe('verifyRecord', () => {
    it('should verify registered voter with full details', async () => {
      const record: BulkUploadRecord = {
        row_number: 2,
        'ID Number': '8001015009087',
        Name: 'John',
        Surname: 'Doe'
      };

      mockIecApiService.verifyVoter.mockResolvedValue({
        id_number: '8001015009087',
        is_registered: true,
        voter_status: 'Registered',
        province_code: '5',
        municipality_code: '599',
        ward_code: '59900001',
        voting_district_code: '59900001001',
        voting_station_name: 'Test Voting Station'
      });

      const result = await IECVerificationService.verifyRecord(record);

      expect(result.id_number).toBe('8001015009087');
      expect(result.is_registered).toBe(true);
      expect(result.voter_status).toBe('Registered');
      expect(result.province_code).toBe('5');
      expect(result.municipality_code).toBe('599');
      expect(result.ward_code).toBe('59900001');
      expect(result.voting_district_code).toBe('59900001001');
      expect(result.voting_station_name).toBe('Test Voting Station');
      expect(result.verification_date).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('should handle registered voter without VD code (use 22222222)', async () => {
      const record: BulkUploadRecord = {
        row_number: 2,
        'ID Number': '8001015009087',
        Name: 'John',
        Surname: 'Doe'
      };

      mockIecApiService.verifyVoter.mockResolvedValue({
        id_number: '8001015009087',
        is_registered: true,
        voter_status: 'Registered',
        province_code: '5',
        municipality_code: '599',
        ward_code: '59900001',
        voting_district_code: undefined // No VD code
      });

      const result = await IECVerificationService.verifyRecord(record);

      expect(result.is_registered).toBe(true);
      expect(result.voting_district_code).toBe('22222222'); // Special code for registered without VD (8 digits)
    });

    it('should handle non-registered voter (use 99999999)', async () => {
      const record: BulkUploadRecord = {
        row_number: 2,
        'ID Number': '8001015009087',
        Name: 'John',
        Surname: 'Doe'
      };

      mockIecApiService.verifyVoter.mockResolvedValue({
        id_number: '8001015009087',
        is_registered: false,
        voter_status: 'Not Registered'
      });

      const result = await IECVerificationService.verifyRecord(record);

      expect(result.is_registered).toBe(false);
      expect(result.voter_status).toBe('Not Registered');
      expect(result.voting_district_code).toBe('99999999'); // Special code for non-registered (8 digits)
    });

    it('should handle voter not found (null response)', async () => {
      const record: BulkUploadRecord = {
        row_number: 2,
        'ID Number': '8001015009087',
        Name: 'John',
        Surname: 'Doe'
      };

      mockIecApiService.verifyVoter.mockResolvedValue(null);

      const result = await IECVerificationService.verifyRecord(record);

      expect(result.is_registered).toBe(false);
      expect(result.voter_status).toBe('Not Registered');
      expect(result.voting_district_code).toBe('99999999'); // 8 digits
    });

    it('should handle rate limit exceeded', async () => {
      const record: BulkUploadRecord = {
        row_number: 2,
        'ID Number': '8001015009087',
        Name: 'John',
        Surname: 'Doe'
      };

      mockRateLimitService.incrementAndCheck.mockResolvedValue({
        current_count: 10000,
        max_limit: 10000,
        remaining: 0,
        reset_time: Date.now() + 3600000,
        is_limited: true,
        is_warning: false,
        percentage_used: 100.0
      });

      const result = await IECVerificationService.verifyRecord(record);

      expect(result.is_registered).toBe(false);
      expect(result.voter_status).toBe('Verification Error');
      expect(result.error).toContain('rate limit exceeded');
      expect(mockIecApiService.verifyVoter).not.toHaveBeenCalled();
    });

    it('should handle IEC API errors', async () => {
      const record: BulkUploadRecord = {
        row_number: 2,
        'ID Number': '8001015009087',
        Name: 'John',
        Surname: 'Doe'
      };

      mockIecApiService.verifyVoter.mockRejectedValue(new Error('IEC API connection failed'));

      const result = await IECVerificationService.verifyRecord(record);

      expect(result.is_registered).toBe(false);
      expect(result.voter_status).toBe('Verification Error');
      expect(result.error).toBe('IEC API connection failed');
    });
  });

  describe('verifyRecordsBatch', () => {
    it('should verify multiple records in batches', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' },
        { row_number: 4, 'ID Number': '8506155000084', Name: 'Bob', Surname: 'Johnson' }
      ];

      mockIecApiService.verifyVoter
        .mockResolvedValueOnce({
          id_number: '8001015009087',
          is_registered: true,
          voter_status: 'Registered',
          voting_district_code: '59900001001'
        })
        .mockResolvedValueOnce({
          id_number: '9001010001088',
          is_registered: false,
          voter_status: 'Not Registered'
        })
        .mockResolvedValueOnce({
          id_number: '8506155000084',
          is_registered: true,
          voter_status: 'Registered',
          voting_district_code: undefined // No VD code
        });

      const results = await IECVerificationService.verifyRecordsBatch(records);

      expect(results.size).toBe(3);
      expect(results.get('8001015009087')?.is_registered).toBe(true);
      expect(results.get('8001015009087')?.voting_district_code).toBe('59900001001');
      expect(results.get('9001010001088')?.is_registered).toBe(false);
      expect(results.get('9001010001088')?.voting_district_code).toBe('99999999'); // 8 digits
      expect(results.get('8506155000084')?.is_registered).toBe(true);
      expect(results.get('8506155000084')?.voting_district_code).toBe('22222222'); // 8 digits
    });

    it('should process records in batches of 5', async () => {
      const records: BulkUploadRecord[] = Array.from({ length: 12 }, (_, i) => ({
        row_number: i + 2,
        'ID Number': `800101500908${i}`,
        Name: `Person${i}`,
        Surname: 'Test'
      }));

      mockIecApiService.verifyVoter.mockResolvedValue({
        id_number: '8001015009087',
        is_registered: true,
        voter_status: 'Registered',
        voting_district_code: '59900001001'
      });

      const results = await IECVerificationService.verifyRecordsBatch(records);

      expect(results.size).toBe(12);
      expect(mockIecApiService.verifyVoter).toHaveBeenCalledTimes(12);
    });

    it('should call progress callback', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' }
      ];

      mockIecApiService.verifyVoter.mockResolvedValue({
        id_number: '8001015009087',
        is_registered: true,
        voter_status: 'Registered',
        voting_district_code: '59900001001'
      });

      const progressCallback = jest.fn();
      await IECVerificationService.verifyRecordsBatch(records, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(2, 2);
    });

    it('should handle errors in batch without stopping', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' },
        { row_number: 4, 'ID Number': '8506155000084', Name: 'Bob', Surname: 'Johnson' }
      ];

      mockIecApiService.verifyVoter
        .mockResolvedValueOnce({
          id_number: '8001015009087',
          is_registered: true,
          voter_status: 'Registered',
          voting_district_code: '59900001001'
        })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          id_number: '8506155000084',
          is_registered: true,
          voter_status: 'Registered',
          voting_district_code: '59900001002'
        });

      const results = await IECVerificationService.verifyRecordsBatch(records);

      expect(results.size).toBe(3);
      expect(results.get('8001015009087')?.is_registered).toBe(true);
      expect(results.get('9001010001088')?.voter_status).toBe('Verification Error');
      expect(results.get('9001010001088')?.error).toBe('API Error');
      expect(results.get('8506155000084')?.is_registered).toBe(true);
    });

    it('should handle empty records array', async () => {
      const records: BulkUploadRecord[] = [];

      const results = await IECVerificationService.verifyRecordsBatch(records);

      expect(results.size).toBe(0);
      expect(mockIecApiService.verifyVoter).not.toHaveBeenCalled();
    });
  });
});

