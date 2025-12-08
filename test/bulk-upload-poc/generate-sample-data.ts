/**
 * Generate Sample Test Data for Bulk Upload POC
 * 
 * Creates an Excel file with:
 * - Valid South African ID numbers
 * - Invalid ID numbers (for testing validation)
 * - Duplicate records (for testing duplicate detection)
 * - Mix of realistic member data
 * 
 * Usage: ts-node generate-sample-data.ts [number-of-records]
 */

import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// ID NUMBER GENERATION
// ============================================================================

/**
 * Generate valid South African ID number with Luhn checksum
 */
function generateValidSAIdNumber(birthDate: Date, gender: 'M' | 'F'): string {
  // Format: YYMMDD GSSS C A Z
  // YY = Year (2 digits)
  // MM = Month (2 digits)
  // DD = Day (2 digits)
  // G = Gender (0-4 female, 5-9 male)
  // SSS = Sequence number (000-999)
  // C = Citizenship (0 = SA citizen, 1 = permanent resident)
  // A = Usually 8
  // Z = Checksum digit

  const year = birthDate.getFullYear().toString().slice(-2);
  const month = (birthDate.getMonth() + 1).toString().padStart(2, '0');
  const day = birthDate.getDate().toString().padStart(2, '0');

  const genderDigit = gender === 'M' ? Math.floor(Math.random() * 5) + 5 : Math.floor(Math.random() * 5);
  const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const citizenship = '0'; // SA citizen
  const raceDigit = '8';

  // Build ID without checksum
  const idWithoutChecksum = `${year}${month}${day}${genderDigit}${sequence}${citizenship}${raceDigit}`;

  // Calculate Luhn checksum
  const checksum = calculateLuhnChecksum(idWithoutChecksum);

  return `${idWithoutChecksum}${checksum}`;
}

/**
 * Calculate Luhn checksum for South African ID number
 */
function calculateLuhnChecksum(idWithoutChecksum: string): number {
  const digits = idWithoutChecksum.split('').map(Number);
  let sum = 0;

  // Process odd positions (from left, 0-indexed)
  for (let i = 0; i < digits.length; i += 2) {
    sum += digits[i];
  }

  // Process even positions (from left, 0-indexed)
  for (let i = 1; i < digits.length; i += 2) {
    const doubled = digits[i] * 2;
    sum += doubled < 10 ? doubled : doubled - 9;
  }

  // Calculate checksum digit
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
}

/**
 * Generate invalid ID number (wrong checksum)
 */
function generateInvalidSAIdNumber(): string {
  const validId = generateValidSAIdNumber(new Date(1990, 0, 15), 'M');
  // Change last digit to make checksum invalid
  const lastDigit = parseInt(validId[12]);
  const wrongDigit = (lastDigit + 1) % 10;
  return validId.slice(0, 12) + wrongDigit;
}

// ============================================================================
// SAMPLE DATA GENERATION
// ============================================================================

const FIRST_NAMES = [
  'Thabo', 'Sipho', 'Lerato', 'Nomsa', 'Mandla', 'Zanele', 'Bongani', 'Thandiwe',
  'Kagiso', 'Naledi', 'Tshepo', 'Mpho', 'Lindiwe', 'Sello', 'Refilwe', 'Kgotso',
  'Palesa', 'Tebogo', 'Dineo', 'Karabo', 'Lesedi', 'Boitumelo', 'Keabetswe', 'Tlotlo',
];

const SURNAMES = [
  'Mokoena', 'Dlamini', 'Nkosi', 'Khumalo', 'Mthembu', 'Ndlovu', 'Zulu', 'Sithole',
  'Mahlangu', 'Naidoo', 'Pillay', 'Govender', 'Reddy', 'Moodley', 'Naicker', 'Chetty',
  'Van der Merwe', 'Botha', 'Pretorius', 'Venter', 'Du Plessis', 'Fourie', 'Nel', 'Meyer',
];

function generateRandomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateRandomPhone(): string {
  const prefixes = ['060', '061', '062', '063', '064', '065', '066', '067', '068', '069', '071', '072', '073', '074', '076', '078', '079', '081', '082', '083', '084'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
}

function generateRandomEmail(firstName: string, surname: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'webmail.co.za', 'icloud.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const username = `${firstName.toLowerCase()}.${surname.toLowerCase()}${Math.floor(Math.random() * 100)}`;
  return `${username}@${domain}`;
}

function generateSampleData(numRecords: number): any[] {
  const records: any[] = [];

  for (let i = 0; i < numRecords; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const gender = Math.random() > 0.5 ? 'M' : 'F';
    const birthDate = generateRandomDate(1960, 2005);

    let idNumber: string;

    // 5% invalid IDs
    if (i < Math.floor(numRecords * 0.05)) {
      idNumber = generateInvalidSAIdNumber();
    }
    // 5% duplicates (reuse previous ID)
    else if (i > 10 && i < Math.floor(numRecords * 0.05) + Math.floor(numRecords * 0.05) && records.length > 0) {
      const randomPreviousRecord = records[Math.floor(Math.random() * Math.min(records.length, 10))];
      idNumber = randomPreviousRecord['ID Number'];
    }
    // 90% valid unique IDs
    else {
      idNumber = generateValidSAIdNumber(birthDate, gender);
    }

    records.push({
      'ID Number': idNumber,
      'Name': firstName,
      'Surname': surname,
      'Cell Number': generateRandomPhone(),
      'Email': generateRandomEmail(firstName, surname),
    });
  }

  return records;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const numRecords = args.length > 0 ? parseInt(args[0]) : 50;

  if (isNaN(numRecords) || numRecords < 1) {
    console.error('❌ Invalid number of records. Please provide a positive integer.');
    process.exit(1);
  }

  console.log(`\n📊 Generating ${numRecords} sample records...`);

  const data = generateSampleData(numRecords);

  // Create sample-data directory
  const sampleDataDir = path.join(__dirname, 'sample-data');
  if (!fs.existsSync(sampleDataDir)) {
    fs.mkdirSync(sampleDataDir, { recursive: true });
  }

  // Create Excel file
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');

  const outputPath = path.join(sampleDataDir, 'test-members.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log(`✅ Sample data generated: ${outputPath}`);
  console.log(`\n📋 Summary:`);
  console.log(`   Total records: ${data.length}`);
  console.log(`   Valid IDs: ~${Math.floor(data.length * 0.9)}`);
  console.log(`   Invalid IDs: ~${Math.floor(data.length * 0.05)}`);
  console.log(`   Duplicates: ~${Math.floor(data.length * 0.05)}`);
  console.log(`\n🚀 Run the processor with:`);
  console.log(`   npx ts-node test-bulk-upload-processor.ts "${outputPath}"\n`);
}

main();

