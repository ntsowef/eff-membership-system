/**
 * Unit tests for Pre-Validation Service
 */

import { Pool } from 'pg';
import { PreValidationService } from '../preValidationService';
import { BulkUploadRecord } from '../types';

describe('PreValidationService', () => {
  let service: PreValidationService;
  let mockPool: any;

  beforeEach(() => {
    // Create a mock pool with jest functions
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };
    service = new PreValidationService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRecords', () => {
    it('should validate records with all valid IDs', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' }
      ];

      // Mock database query - no existing members
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await service.validateRecords(records);

      expect(result.validation_stats.total_records).toBe(2);
      expect(result.validation_stats.valid_ids).toBe(2);
      expect(result.validation_stats.invalid_ids).toBe(0);
      expect(result.validation_stats.unique_records).toBe(2);
      expect(result.validation_stats.duplicates).toBe(0);
      expect(result.validation_stats.new_members).toBe(2);
      expect(result.validation_stats.existing_members).toBe(0);
    });

    it('should detect invalid ID numbers', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '1234567890123', Name: 'Invalid', Surname: 'ID' }, // Invalid checksum
        { row_number: 4, 'ID Number': '', Name: 'Missing', Surname: 'ID' } // Missing ID
      ];

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await service.validateRecords(records);

      expect(result.validation_stats.valid_ids).toBe(1);
      expect(result.validation_stats.invalid_ids).toBe(2);
      expect(result.invalid_ids).toHaveLength(2);
      expect(result.invalid_ids[0].validation_type).toBe('checksum');
      expect(result.invalid_ids[1].validation_type).toBe('missing');
    });

    it('should detect duplicates within file', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' }, // Duplicate
        { row_number: 4, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' }
      ];

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await service.validateRecords(records);

      expect(result.validation_stats.unique_records).toBe(2);
      expect(result.validation_stats.duplicates).toBe(2); // Both occurrences reported
      expect(result.duplicates).toHaveLength(2);
      expect(result.duplicates[0].duplicate_count).toBe(2);
      expect(result.duplicates[0].first_occurrence_row).toBe(2);
      expect(result.duplicates[0].all_row_numbers).toEqual([2, 3]);
    });

    it('should identify existing members in database', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe', Ward: '12345' },
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' }
      ];

      // Mock database query - one existing member
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id_number: '8001015009087',
            member_id: 100,
            firstname: 'John',
            surname: 'Doe',
            ward_code: '12345',
            ward_name: 'Ward 1',
            voting_district_code: '12345001',
            voting_district_name: 'VD 1',
            created_at: new Date('2023-01-01'),
            updated_at: new Date('2023-06-01')
          }
        ],
        rowCount: 1
      } as any);

      const result = await service.validateRecords(records);

      expect(result.validation_stats.existing_members).toBe(1);
      expect(result.validation_stats.new_members).toBe(1);
      expect(result.existing_members).toHaveLength(1);
      expect(result.existing_members[0].existing_member_id).toBe(100);
      expect(result.existing_members[0].existing_name).toBe('John Doe');
      expect(result.new_members).toHaveLength(1);
      expect(result.new_members[0]['ID Number']).toBe('9001010001088');
    });

    it('should detect ward and VD changes for existing members', async () => {
      const records: BulkUploadRecord[] = [
        { 
          row_number: 2, 
          'ID Number': '8001015009087', 
          Name: 'John', 
          Surname: 'Doe',
          Ward: '54321', // Different ward
          'Voting District': '54321001' // Different VD
        }
      ];

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id_number: '8001015009087',
            member_id: 100,
            firstname: 'John',
            surname: 'Doe',
            ward_code: '12345',
            ward_name: 'Ward 1',
            voting_district_code: '12345001',
            voting_district_name: 'VD 1',
            created_at: new Date('2023-01-01'),
            updated_at: new Date('2023-06-01')
          }
        ],
        rowCount: 1
      } as any);

      const result = await service.validateRecords(records);

      expect(result.existing_members).toHaveLength(1);
      expect(result.existing_members[0].ward_changed).toBe(true);
      expect(result.existing_members[0].vd_changed).toBe(true);
    });

    it('should handle empty records array', async () => {
      const records: BulkUploadRecord[] = [];

      const result = await service.validateRecords(records);

      expect(result.validation_stats.total_records).toBe(0);
      expect(result.validation_stats.valid_ids).toBe(0);
      expect(result.validation_stats.invalid_ids).toBe(0);
    });

    it('should normalize ID numbers with spaces and padding', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '800 101 500 9087', Name: 'John', Surname: 'Doe' }, // Spaces
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Jane', Surname: 'Smith' } // Valid ID
      ];

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await service.validateRecords(records);

      // First record should be normalized (spaces removed)
      expect(result.valid_records[0]['ID Number']).toBe('8001015009087');

      // Second record should remain valid
      expect(result.valid_records[1]['ID Number']).toBe('9001010001088');

      // Both should be valid
      expect(result.validation_stats.valid_ids).toBe(2);
    });

    it('should handle multiple duplicates of same ID', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 3, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' },
        { row_number: 4, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' }
      ];

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const result = await service.validateRecords(records);

      expect(result.validation_stats.unique_records).toBe(1);
      expect(result.validation_stats.duplicates).toBe(3); // All 3 occurrences
      expect(result.duplicates).toHaveLength(3);
      expect(result.duplicates[0].duplicate_count).toBe(3);
      expect(result.duplicates[0].all_row_numbers).toEqual([2, 3, 4]);
    });

    it('should handle database query errors gracefully', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'John', Surname: 'Doe' }
      ];

      // Mock database error
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.validateRecords(records)).rejects.toThrow('Database connection failed');
    });

    it('should handle complex scenario with all validation types', async () => {
      const records: BulkUploadRecord[] = [
        { row_number: 2, 'ID Number': '8001015009087', Name: 'Valid', Surname: 'New' }, // Valid, new
        { row_number: 3, 'ID Number': '9001010001088', Name: 'Valid', Surname: 'Existing' }, // Valid, existing
        { row_number: 4, 'ID Number': '8001015009087', Name: 'Valid', Surname: 'Duplicate' }, // Duplicate
        { row_number: 5, 'ID Number': '1234567890123', Name: 'Invalid', Surname: 'Checksum' }, // Invalid
        { row_number: 6, 'ID Number': '', Name: 'Missing', Surname: 'ID' } // Missing
      ];

      // Mock database - one existing member
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id_number: '9001010001088',
            member_id: 200,
            firstname: 'Valid',
            surname: 'Existing',
            ward_code: '12345',
            ward_name: 'Ward 1',
            voting_district_code: '12345001',
            voting_district_name: 'VD 1',
            created_at: new Date('2023-01-01'),
            updated_at: new Date('2023-06-01')
          }
        ],
        rowCount: 1
      } as any);

      const result = await service.validateRecords(records);

      expect(result.validation_stats.total_records).toBe(5);
      expect(result.validation_stats.valid_ids).toBe(3); // 2 valid + 1 duplicate
      expect(result.validation_stats.invalid_ids).toBe(2); // 1 invalid checksum + 1 missing
      expect(result.validation_stats.unique_records).toBe(2); // After removing duplicate
      expect(result.validation_stats.duplicates).toBe(2); // Both occurrences of duplicate
      expect(result.validation_stats.existing_members).toBe(1);
      expect(result.validation_stats.new_members).toBe(1);
    });
  });
});

