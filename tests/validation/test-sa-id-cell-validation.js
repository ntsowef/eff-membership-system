/**
 * Test Suite for South African ID Number and Cell Number Validation
 * 
 * Run with: node tests/validation/test-sa-id-cell-validation.js
 */

// Mock the validation methods (copy from service for testing)
class SAValidationTester {
  /**
   * Validate South African ID number using Luhn algorithm
   */
  static validateSAIDNumber(idNumber) {
    // Check if ID number is provided and is 13 digits
    if (!idNumber || !/^\d{13}$/.test(idNumber)) {
      return {
        isValid: false,
        error: 'Invalid ID number format - must be exactly 13 digits'
      };
    }

    // Extract date components (YYMMDD)
    const year = parseInt(idNumber.substring(0, 2), 10);
    const month = parseInt(idNumber.substring(2, 4), 10);
    const day = parseInt(idNumber.substring(4, 6), 10);

    // Validate month (01-12)
    if (month < 1 || month > 12) {
      return {
        isValid: false,
        error: `Invalid ID number - month must be between 01-12 (found: ${idNumber.substring(2, 4)})`
      };
    }

    // Validate day (01-31)
    if (day < 1 || day > 31) {
      return {
        isValid: false,
        error: `Invalid ID number - day must be between 01-31 (found: ${idNumber.substring(4, 6)})`
      };
    }

    // Determine full year (assume 1900s for years >= 25, 2000s for years < 25)
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = year > currentYear ? 1900 + year : 2000 + year;

    // Validate date is not in the future
    const birthDate = new Date(fullYear, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDate > today) {
      return {
        isValid: false,
        error: 'Invalid ID number - date of birth cannot be in the future'
      };
    }

    // Validate the date is valid (e.g., no Feb 30, no Apr 31)
    if (
      birthDate.getFullYear() !== fullYear ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      return {
        isValid: false,
        error: `Invalid ID number - date of birth is invalid (${idNumber.substring(0, 6)} = ${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')})`
      };
    }

    // Luhn algorithm checksum validation
    let sum = 0;
    let alternate = false;

    // Process digits from right to left (excluding the last checksum digit)
    for (let i = idNumber.length - 2; i >= 0; i--) {
      let digit = parseInt(idNumber.charAt(i), 10);

      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      alternate = !alternate;
    }

    // Calculate checksum
    const checksum = (10 - (sum % 10)) % 10;
    const providedChecksum = parseInt(idNumber.charAt(12), 10);

    if (checksum !== providedChecksum) {
      return {
        isValid: false,
        error: `Invalid ID number - checksum validation failed (expected: ${checksum}, got: ${providedChecksum})`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate South African cell number format and normalize
   */
  static validateCellNumber(cellNumber) {
    if (!cellNumber || cellNumber.trim() === '') {
      return {
        isValid: false,
        error: 'Cell number is required'
      };
    }

    // Remove all non-digit characters except leading +
    let cleaned = cellNumber.trim();
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\D/g, '');

    // Check for valid length and format
    let normalized = '';

    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // Format: 0XXXXXXXXX
      normalized = cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('27')) {
      // Format: 27XXXXXXXXX - convert to 0XXXXXXXXX
      normalized = '0' + cleaned.substring(2);
    } else if (hasPlus && cleaned.length === 11 && cleaned.startsWith('27')) {
      // Format: +27XXXXXXXXX - convert to 0XXXXXXXXX
      normalized = '0' + cleaned.substring(2);
    } else {
      return {
        isValid: false,
        error: 'Invalid cell number - must be 10 digits starting with 0 or 11 digits starting with 27'
      };
    }

    // Validate South African mobile prefixes
    const validPrefixes = [
      '060', '061', '062', '063', '064', '065', '066', '067', '068', '069',
      '071', '072', '073', '074', '076', '078', '079',
      '081', '082', '083', '084'
    ];

    const prefix = normalized.substring(0, 3);
    if (!validPrefixes.includes(prefix)) {
      return {
        isValid: false,
        error: `Invalid cell number - invalid South African mobile prefix (${prefix})`
      };
    }

    return {
      isValid: true,
      normalizedNumber: normalized
    };
  }
}

// Test cases
console.log('🧪 SOUTH AFRICAN ID NUMBER VALIDATION TESTS\n');
console.log('='.repeat(80));

const idTestCases = [
  { id: '8001015009083', expected: true, description: 'Valid ID number (male, 1980-01-01)' },
  { id: '9202204720086', expected: true, description: 'Valid ID number (female, 1992-02-20)' },
  { id: '7106245929089', expected: true, description: 'Valid ID number (male, 1971-06-24)' },
  { id: '80010150090', expected: false, description: 'Too short (11 digits)' },
  { id: '800101500908712', expected: false, description: 'Too long (15 digits)' },
  { id: '8013015009087', expected: false, description: 'Invalid month (13)' },
  { id: '8000015009087', expected: false, description: 'Invalid day (00)' },
  { id: '8001325009087', expected: false, description: 'Invalid day (32)' },
  { id: '8002305009087', expected: false, description: 'Invalid date (Feb 30)' },
  { id: '8004315009087', expected: false, description: 'Invalid date (Apr 31)' },
  { id: '2601015009089', expected: false, description: 'Future date (2026)' },
  { id: '8001015009088', expected: false, description: 'Invalid checksum' },
  { id: '800101500908A', expected: false, description: 'Contains letter' },
  { id: '', expected: false, description: 'Empty string' }
];

let idPassed = 0;
let idFailed = 0;

idTestCases.forEach((testCase, index) => {
  const result = SAValidationTester.validateSAIDNumber(testCase.id);
  const passed = result.isValid === testCase.expected;
  
  if (passed) {
    idPassed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   ID: ${testCase.id || '(empty)'}`);
    console.log(`   Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (!result.isValid) {
      console.log(`   Error: ${result.error}`);
    }
  } else {
    idFailed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   ID: ${testCase.id || '(empty)'}`);
    console.log(`   Expected: ${testCase.expected ? 'VALID' : 'INVALID'}`);
    console.log(`   Got: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`ID Number Tests: ${idPassed} passed, ${idFailed} failed\n\n`);

// Cell number tests
console.log('📱 SOUTH AFRICAN CELL NUMBER VALIDATION TESTS\n');
console.log('='.repeat(80));

const cellTestCases = [
  { cell: '0821234567', expected: true, normalized: '0821234567', description: 'Valid 10-digit (082)' },
  { cell: '0711234567', expected: true, normalized: '0711234567', description: 'Valid 10-digit (071)' },
  { cell: '0631234567', expected: true, normalized: '0631234567', description: 'Valid 10-digit (063)' },
  { cell: '27821234567', expected: true, normalized: '0821234567', description: 'Valid 11-digit with 27' },
  { cell: '+27821234567', expected: true, normalized: '0821234567', description: 'Valid with +27 prefix' },
  { cell: '082 123 4567', expected: true, normalized: '0821234567', description: 'Valid with spaces' },
  { cell: '082-123-4567', expected: true, normalized: '0821234567', description: 'Valid with dashes' },
  { cell: '(082) 123-4567', expected: true, normalized: '0821234567', description: 'Valid with brackets' },
  { cell: '0551234567', expected: false, normalized: null, description: 'Invalid prefix (055)' },
  { cell: '0901234567', expected: false, normalized: null, description: 'Invalid prefix (090)' },
  { cell: '082123456', expected: false, normalized: null, description: 'Too short (9 digits)' },
  { cell: '08212345678', expected: false, normalized: null, description: 'Too long (11 digits starting with 0)' },
  { cell: '1821234567', expected: false, normalized: null, description: 'Invalid start digit (1)' },
  { cell: '', expected: false, normalized: null, description: 'Empty string' }
];

let cellPassed = 0;
let cellFailed = 0;

cellTestCases.forEach((testCase, index) => {
  const result = SAValidationTester.validateCellNumber(testCase.cell);
  const passed = result.isValid === testCase.expected && 
                 (result.normalizedNumber === testCase.normalized || !testCase.expected);
  
  if (passed) {
    cellPassed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Cell: ${testCase.cell || '(empty)'}`);
    console.log(`   Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (result.isValid && result.normalizedNumber) {
      console.log(`   Normalized: ${result.normalizedNumber}`);
    }
    if (!result.isValid && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  } else {
    cellFailed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Cell: ${testCase.cell || '(empty)'}`);
    console.log(`   Expected: ${testCase.expected ? 'VALID' : 'INVALID'}`);
    console.log(`   Got: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (testCase.normalized) {
      console.log(`   Expected Normalized: ${testCase.normalized}`);
    }
    if (result.normalizedNumber) {
      console.log(`   Got Normalized: ${result.normalizedNumber}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`Cell Number Tests: ${cellPassed} passed, ${cellFailed} failed\n\n`);

// Summary
console.log('📊 OVERALL TEST SUMMARY\n');
console.log('='.repeat(80));
console.log(`Total Tests: ${idTestCases.length + cellTestCases.length}`);
console.log(`Total Passed: ${idPassed + cellPassed}`);
console.log(`Total Failed: ${idFailed + cellFailed}`);
console.log(`Success Rate: ${((idPassed + cellPassed) / (idTestCases.length + cellTestCases.length) * 100).toFixed(2)}%`);
console.log('='.repeat(80));

if (idFailed === 0 && cellFailed === 0) {
  console.log('\n✅ ALL TESTS PASSED! 🎉\n');
} else {
  console.log('\n❌ SOME TESTS FAILED - PLEASE REVIEW\n');
  process.exit(1);
}

