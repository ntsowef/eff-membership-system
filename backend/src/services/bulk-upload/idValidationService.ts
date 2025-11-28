/**
 * ID Validation Service
 * 
 * Validates South African ID numbers using the Luhn checksum algorithm.
 * Ported from Python: upload_validation_utils.py
 * 
 * SA ID Format: YYMMDDGSSSCAZ
 * - YYMMDD: Date of birth
 * - G: Gender (0-4999 = Female, 5000-9999 = Male)
 * - SSS: Sequence number
 * - C: Citizenship (0 = SA Citizen, 1 = Permanent Resident)
 * - A: Usually 8 or 9
 * - Z: Checksum digit (Luhn algorithm)
 */

export interface IdValidationResult {
  isValid: boolean;
  idNumber: string;
  normalizedId: string;
  errorMessage?: string;
  validationType?: 'format' | 'checksum' | 'missing';
  dateOfBirth?: Date;
  gender?: 'Male' | 'Female';
  citizenship?: 'SA Citizen' | 'Permanent Resident';
}

/**
 * Normalize ID number: remove spaces, dashes, pad with leading zeros
 */
export function normalizeIdNumber(idNum: any): string {
  if (idNum === null || idNum === undefined) {
    return '';
  }
  
  // Convert to string and remove all non-numeric characters
  let normalized = String(idNum).replace(/[^0-9]/g, '');
  
  // Pad with leading zeros to 13 digits
  normalized = normalized.padStart(13, '0');
  
  return normalized;
}

/**
 * Validate SA ID number using Luhn checksum algorithm
 */
export function validateSaIdNumber(idNumber: string): IdValidationResult {
  const originalId = idNumber;
  const normalizedId = normalizeIdNumber(idNumber);
  
  // Check if ID is missing or empty
  if (!normalizedId || normalizedId === '0000000000000') {
    return {
      isValid: false,
      idNumber: originalId,
      normalizedId,
      errorMessage: 'ID number is missing or empty',
      validationType: 'missing'
    };
  }
  
  // Check if ID is exactly 13 digits
  if (normalizedId.length !== 13) {
    return {
      isValid: false,
      idNumber: originalId,
      normalizedId,
      errorMessage: `ID number must be 13 digits (got ${normalizedId.length})`,
      validationType: 'format'
    };
  }
  
  // Check if ID contains only numeric characters
  if (!/^\d{13}$/.test(normalizedId)) {
    return {
      isValid: false,
      idNumber: originalId,
      normalizedId,
      errorMessage: 'ID number must contain only numeric characters',
      validationType: 'format'
    };
  }
  
  // Validate using Luhn algorithm
  const isValidChecksum = validateLuhnChecksum(normalizedId);
  
  if (!isValidChecksum) {
    return {
      isValid: false,
      idNumber: originalId,
      normalizedId,
      errorMessage: 'Invalid ID number checksum (Luhn algorithm failed)',
      validationType: 'checksum'
    };
  }
  
  // Extract additional information
  const dateOfBirth = extractDateOfBirth(normalizedId);
  const gender = extractGender(normalizedId);
  const citizenship = extractCitizenship(normalizedId);
  
  return {
    isValid: true,
    idNumber: originalId,
    normalizedId,
    dateOfBirth,
    gender,
    citizenship
  };
}

/**
 * Validate ID checksum using Luhn algorithm
 * 
 * Algorithm:
 * 1. Sum all digits at odd positions (0, 2, 4, 6, 8, 10, 12)
 * 2. For digits at even positions (1, 3, 5, 7, 9, 11):
 *    - Double the digit
 *    - If result > 9, subtract 9
 *    - Add to sum
 * 3. If sum % 10 == 0, checksum is valid
 */
export function validateLuhnChecksum(idNumber: string): boolean {
  if (idNumber.length !== 13) {
    return false;
  }
  
  const digits = idNumber.split('').map(d => parseInt(d, 10));
  let checksum = 0;
  
  // Process odd positions (0, 2, 4, 6, 8, 10, 12)
  for (let i = 0; i < 13; i += 2) {
    checksum += digits[i];
  }
  
  // Process even positions (1, 3, 5, 7, 9, 11)
  for (let i = 1; i < 13; i += 2) {
    let doubled = digits[i] * 2;
    if (doubled > 9) {
      doubled -= 9;
    }
    checksum += doubled;
  }
  
  return checksum % 10 === 0;
}

/**
 * Extract date of birth from ID number
 * Format: YYMMDD (first 6 digits)
 */
export function extractDateOfBirth(idNumber: string): Date | undefined {
  if (idNumber.length < 6) {
    return undefined;
  }
  
  const year = parseInt(idNumber.substring(0, 2), 10);
  const month = parseInt(idNumber.substring(2, 4), 10);
  const day = parseInt(idNumber.substring(4, 6), 10);
  
  // Determine century (assume < 25 = 2000s, >= 25 = 1900s)
  const fullYear = year < 25 ? 2000 + year : 1900 + year;
  
  // Validate date
  const date = new Date(fullYear, month - 1, day);
  if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  
  return date;
}

/**
 * Extract gender from ID number
 * Position 6 (7th digit): 0-4999 = Female, 5000-9999 = Male
 */
export function extractGender(idNumber: string): 'Male' | 'Female' | undefined {
  if (idNumber.length < 10) {
    return undefined;
  }
  
  const genderDigits = parseInt(idNumber.substring(6, 10), 10);
  return genderDigits >= 5000 ? 'Male' : 'Female';
}

/**
 * Extract citizenship from ID number
 * Position 10 (11th digit): 0 = SA Citizen, 1 = Permanent Resident
 */
export function extractCitizenship(idNumber: string): 'SA Citizen' | 'Permanent Resident' | undefined {
  if (idNumber.length < 11) {
    return undefined;
  }
  
  const citizenshipDigit = parseInt(idNumber.charAt(10), 10);
  return citizenshipDigit === 0 ? 'SA Citizen' : 'Permanent Resident';
}
