/**
 * South African ID Number Parser Utility
 * 
 * South African ID number format: YYMMDDGGGSCAZ
 * - YY: Year of birth (00-99)
 * - MM: Month of birth (01-12)
 * - DD: Day of birth (01-31)
 * - GGG: Gender and sequence number (000-499 = Female, 500-999 = Male)
 * - S: South African citizen (0) or permanent resident/foreigner (1)
 * - C: Usually 8 or 9 (race classification - no longer used)
 * - A: Usually 0
 * - Z: Check digit
 */

export interface ParsedIdNumber {
  isValid: boolean;
  dateOfBirth: string | null; // ISO format YYYY-MM-DD
  gender: 'Male' | 'Female' | null;
  citizenshipStatus: 'South African Citizen' | 'Foreign National' | null;
  age: number | null;
  errors: string[];
}

/**
 * Parse a South African ID number and extract information
 */
export function parseIdNumber(idNumber: string): ParsedIdNumber {
  const result: ParsedIdNumber = {
    isValid: false,
    dateOfBirth: null,
    gender: null,
    citizenshipStatus: null,
    age: null,
    errors: []
  };

  // Basic validation
  if (!idNumber) {
    result.errors.push('ID number is required');
    return result;
  }

  // Remove any spaces or special characters
  const cleanId = idNumber.replace(/\s+/g, '');

  // Check if it's exactly 13 digits
  if (!/^\d{13}$/.test(cleanId)) {
    result.errors.push('ID number must be exactly 13 digits');
    return result;
  }

  try {
    // Extract components
    const year = parseInt(cleanId.substring(0, 2));
    const month = parseInt(cleanId.substring(2, 4));
    const day = parseInt(cleanId.substring(4, 6));
    const genderSequence = parseInt(cleanId.substring(6, 10));
    const citizenshipDigit = parseInt(cleanId.substring(10, 11));

    // Determine full year (assuming current century cutoff at 30)
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const fullYear = year <= 30 ? currentCentury + year : currentCentury - 100 + year;

    // Validate date components
    if (month < 1 || month > 12) {
      result.errors.push('Invalid month in ID number');
    }

    if (day < 1 || day > 31) {
      result.errors.push('Invalid day in ID number');
    }

    // Create date in UTC to avoid timezone issues
    const dateOfBirth = new Date(Date.UTC(fullYear, month - 1, day));
    if (dateOfBirth.getFullYear() !== fullYear || 
        dateOfBirth.getMonth() !== month - 1 || 
        dateOfBirth.getDate() !== day) {
      result.errors.push('Invalid date in ID number');
    }

    // Check if date is not in the future
    const today = new Date();
    if (dateOfBirth > today) {
      result.errors.push('Date of birth cannot be in the future');
    }

    // Calculate age
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) 
      ? age - 1 : age;

    // Check minimum age (16 years for membership)
    if (adjustedAge < 16) {
      result.errors.push('Applicant must be at least 16 years old');
    }

    // Check maximum reasonable age (120 years)
    if (adjustedAge > 120) {
      result.errors.push('Invalid age calculated from ID number');
    }

    // Validate checksum using Luhn algorithm
    if (!validateIdChecksum(cleanId)) {
      result.errors.push('Invalid ID number checksum');
    }

    // If no errors so far, populate the results
    if (result.errors.length === 0) {
      result.isValid = true;
      result.dateOfBirth = dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD format
      result.gender = genderSequence >= 5000 ? 'Male' : 'Female';
      result.citizenshipStatus = citizenshipDigit === 0 ? 'South African Citizen' : 'Foreign National';
      result.age = adjustedAge;
    }

  } catch (error) {
    result.errors.push('Error parsing ID number');
  }

  return result;
}

/**
 * Validate South African ID number checksum
 * Uses the official SA ID checksum algorithm, not Luhn
 */
function validateIdChecksum(idNumber: string): boolean {
  try {
    const digits = idNumber.split('').map(Number);
    let sum = 0;

    // Process first 12 digits with SA ID algorithm
    for (let i = 0; i < 12; i++) {
      let digit = digits[i];

      // Double every second digit from the left (positions 1, 3, 5, 7, 9, 11)
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }

      sum += digit;
    }

    // Calculate check digit using SA ID formula
    const checkDigit = (10 - (sum % 10)) % 10;

    // Compare with the last digit
    return checkDigit === digits[12];
  } catch {
    return false;
  }
}

/**
 * Format ID number with spaces for display
 */
export function formatIdNumber(idNumber: string): string {
  const cleanId = idNumber.replace(/\s+/g, '');
  if (cleanId.length === 13) {
    return `${cleanId.substring(0, 6)} ${cleanId.substring(6, 10)} ${cleanId.substring(10, 13)}`;
  }
  return idNumber;
}

/**
 * Validate if a string could be a valid ID number format
 */
export function isValidIdNumberFormat(idNumber: string): boolean {
  const cleanId = idNumber.replace(/\s+/g, '');
  return /^\d{13}$/.test(cleanId);
}

/**
 * Get age from date of birth string
 */
export function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if person is eligible for membership (16+ years old)
 */
export function isEligibleForMembership(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) >= 16;
}
