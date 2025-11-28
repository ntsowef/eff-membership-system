/**
 * Unit tests for ID Validation Service
 */

import {
  normalizeIdNumber,
  validateSaIdNumber,
  validateLuhnChecksum,
  extractDateOfBirth,
  extractGender,
  extractCitizenship
} from '../idValidationService';

describe('ID Validation Service', () => {
  
  describe('normalizeIdNumber', () => {
    it('should remove spaces and dashes', () => {
      expect(normalizeIdNumber('123 456 789 0123')).toBe('1234567890123');
      expect(normalizeIdNumber('123-456-789-0123')).toBe('1234567890123');
    });
    
    it('should pad with leading zeros', () => {
      expect(normalizeIdNumber('123456789012')).toBe('0123456789012');
      expect(normalizeIdNumber('12345')).toBe('0000000012345');
    });
    
    it('should handle numeric input', () => {
      expect(normalizeIdNumber(1234567890123)).toBe('1234567890123');
    });
    
    it('should handle null and undefined', () => {
      expect(normalizeIdNumber(null)).toBe('');
      expect(normalizeIdNumber(undefined)).toBe('');
    });
  });
  
  describe('validateLuhnChecksum', () => {
    it('should validate correct checksums', () => {
      // Valid SA ID numbers (verified with Luhn algorithm - sum % 10 === 0)
      expect(validateLuhnChecksum('8001015009087')).toBe(true); // Sum = 40, verified valid
      expect(validateLuhnChecksum('9001010001088')).toBe(true); // Generated valid ID
      expect(validateLuhnChecksum('8506155000084')).toBe(true); // Generated valid ID
    });

    it('should reject incorrect checksums', () => {
      expect(validateLuhnChecksum('8001015009086')).toBe(false); // Last digit wrong
      expect(validateLuhnChecksum('8001015009088')).toBe(false); // Last digit wrong
    });
    
    it('should reject invalid length', () => {
      expect(validateLuhnChecksum('123456789012')).toBe(false);
      expect(validateLuhnChecksum('12345678901234')).toBe(false);
    });
  });
  
  describe('extractDateOfBirth', () => {
    it('should extract valid dates', () => {
      const dob1 = extractDateOfBirth('8001015009087');
      expect(dob1).toBeInstanceOf(Date);
      expect(dob1?.getFullYear()).toBe(1980);
      expect(dob1?.getMonth()).toBe(0); // January (0-indexed)
      expect(dob1?.getDate()).toBe(1);
      
      const dob2 = extractDateOfBirth('0512314720082');
      expect(dob2).toBeInstanceOf(Date);
      expect(dob2?.getFullYear()).toBe(2005);
      expect(dob2?.getMonth()).toBe(11); // December
      expect(dob2?.getDate()).toBe(31);
    });
    
    it('should handle century correctly', () => {
      const dob1980 = extractDateOfBirth('8001015009087');
      expect(dob1980?.getFullYear()).toBe(1980);
      
      const dob2005 = extractDateOfBirth('0512314720082');
      expect(dob2005?.getFullYear()).toBe(2005);
    });
    
    it('should return undefined for invalid dates', () => {
      expect(extractDateOfBirth('9913015009087')).toBeUndefined(); // Month 13
      expect(extractDateOfBirth('9902305009087')).toBeUndefined(); // Day 30 in Feb
    });
  });
  
  describe('extractGender', () => {
    it('should extract female gender', () => {
      expect(extractGender('8001014999087')).toBe('Female'); // 4999
      expect(extractGender('8001010000087')).toBe('Female'); // 0000
    });
    
    it('should extract male gender', () => {
      expect(extractGender('8001015000087')).toBe('Male'); // 5000
      expect(extractGender('8001019999087')).toBe('Male'); // 9999
    });
  });
  
  describe('extractCitizenship', () => {
    it('should extract SA Citizen', () => {
      expect(extractCitizenship('8001015009087')).toBe('SA Citizen'); // 0
    });
    
    it('should extract Permanent Resident', () => {
      expect(extractCitizenship('8001015009187')).toBe('Permanent Resident'); // 1
    });
  });
  
  describe('validateSaIdNumber', () => {
    it('should validate correct ID numbers', () => {
      const result = validateSaIdNumber('8001015009087');
      expect(result.isValid).toBe(true);
      expect(result.normalizedId).toBe('8001015009087');
      expect(result.gender).toBe('Male');
      expect(result.citizenship).toBe('SA Citizen');
      expect(result.dateOfBirth).toBeInstanceOf(Date);
    });
    
    it('should reject empty ID numbers', () => {
      const result = validateSaIdNumber('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('missing or empty');
      expect(result.validationType).toBe('missing');
    });
    
    it('should reject wrong length (after normalization still fails checksum)', () => {
      // This 12-digit ID will be padded to 13, but should fail checksum
      const result = validateSaIdNumber('999999999999');
      expect(result.isValid).toBe(false);
      // After padding, it becomes 0999999999999 which should fail checksum
    });

    it('should reject non-numeric characters', () => {
      // After normalization, non-numeric chars are removed, leaving empty or invalid
      const result = validateSaIdNumber('ABCDEFGHIJKLM');
      expect(result.isValid).toBe(false);
      // Will be 'missing' because all chars are removed
      expect(result.validationType).toBe('missing');
    });
    
    it('should reject invalid checksum', () => {
      const result = validateSaIdNumber('8001015009088');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('checksum');
      expect(result.validationType).toBe('checksum');
    });
    
    it('should normalize ID with spaces', () => {
      const result = validateSaIdNumber('800101 5009 087');
      expect(result.isValid).toBe(true);
      expect(result.normalizedId).toBe('8001015009087');
    });
    
    it('should pad short ID numbers', () => {
      // If someone enters a 12-digit ID, pad with leading zero
      const result = validateSaIdNumber('001015009087');
      expect(result.normalizedId).toBe('0001015009087');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle null input', () => {
      const result = validateSaIdNumber(null as any);
      expect(result.isValid).toBe(false);
      expect(result.validationType).toBe('missing');
    });
    
    it('should handle undefined input', () => {
      const result = validateSaIdNumber(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.validationType).toBe('missing');
    });
    
    it('should handle numeric input', () => {
      const result = validateSaIdNumber(8001015009087 as any);
      expect(result.isValid).toBe(true);
      expect(result.normalizedId).toBe('8001015009087');
    });
    
    it('should handle all zeros', () => {
      const result = validateSaIdNumber('0000000000000');
      expect(result.isValid).toBe(false);
      expect(result.validationType).toBe('missing');
    });
  });
});
