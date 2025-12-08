const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generate sample member application Excel files for testing
 * Creates files with 100, 1000, 5000, and 10000 rows
 */

// Load valid ward codes from database
let validWardCodes = [];
try {
  const wardCodesPath = path.join(__dirname, 'valid-ward-codes.json');
  if (fs.existsSync(wardCodesPath)) {
    validWardCodes = JSON.parse(fs.readFileSync(wardCodesPath, 'utf8'));
    console.log(`✅ Loaded ${validWardCodes.length} valid ward codes from database\n`);
  } else {
    console.error('❌ Error: valid-ward-codes.json not found!');
    console.error('   Please run: node test/sample-data/fetch-valid-ward-codes.js');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error loading ward codes:', error.message);
  process.exit(1);
}

// Sample data pools
const firstNames = [
  'Thabo', 'Sipho', 'Nomsa', 'Zanele', 'Mandla', 'Precious', 'Lerato', 'Bongani',
  'Ntombi', 'Sizwe', 'Thandiwe', 'Mpho', 'Kagiso', 'Refilwe', 'Tshepo', 'Naledi',
  'Kgotso', 'Dineo', 'Tebogo', 'Karabo', 'Lesedi', 'Boitumelo', 'Keabetswe', 'Mothusi'
];

const lastNames = [
  'Dlamini', 'Nkosi', 'Khumalo', 'Mthembu', 'Zulu', 'Ndlovu', 'Mahlangu', 'Sithole',
  'Mokoena', 'Molefe', 'Radebe', 'Naidoo', 'Pillay', 'Govender', 'Moodley', 'Reddy',
  'Van der Merwe', 'Botha', 'Pretorius', 'Du Plessis', 'Fourie', 'Nel', 'Meyer', 'Venter'
];

const provinces = [
  { code: 'EC', name: 'Eastern Cape' },
  { code: 'FS', name: 'Free State' },
  { code: 'GP', name: 'Gauteng' },
  { code: 'KZN', name: 'KwaZulu-Natal' },
  { code: 'LP', name: 'Limpopo' },
  { code: 'MP', name: 'Mpumalanga' },
  { code: 'NC', name: 'Northern Cape' },
  { code: 'NW', name: 'North West' },
  { code: 'WC', name: 'Western Cape' }
];

const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

// Generate random South African ID number with valid Luhn checksum
function generateIDNumber(dateOfBirth) {
  const year = dateOfBirth.getFullYear().toString().slice(-2);
  const month = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
  const day = String(dateOfBirth.getDate()).padStart(2, '0');

  // Generate random sequence number (0000-9999)
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  // Citizenship: 0 = SA citizen, 1 = permanent resident
  const citizenship = '0';

  // Race indicator (not used anymore, but part of format): usually 8
  const raceIndicator = '8';

  // Build ID without checksum
  const idWithoutChecksum = `${year}${month}${day}${sequence}${citizenship}${raceIndicator}`;

  // Calculate Luhn checksum
  let sum = 0;
  let alternate = false;

  // Process digits from right to left
  for (let i = idWithoutChecksum.length - 1; i >= 0; i--) {
    let digit = parseInt(idWithoutChecksum.charAt(i), 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  // Calculate check digit
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${idWithoutChecksum}${checkDigit}`;
}

// Generate random cell number with valid SA mobile prefixes
function generateCellNumber() {
  // Valid South African mobile prefixes (as per backend validation)
  const validPrefixes = [
    '060', '061', '062', '063', '064', '065', '066', '067', '068', '069',
    '071', '072', '073', '074', '076', '078', '079',
    '081', '082', '083', '084'
  ];
  const prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
  const number = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  return `0${prefix.substring(1)}${number}`;
}

// Generate random date of birth (18-80 years old)
function generateDateOfBirth() {
  const today = new Date();
  const minAge = 18;
  const maxAge = 80;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, birthMonth, birthDay);
}

// Generate random ward code from valid ward codes in database
function generateWardCode() {
  if (validWardCodes.length === 0) {
    throw new Error('No valid ward codes available. Please run fetch-valid-ward-codes.js first.');
  }
  const randomWard = validWardCodes[Math.floor(Math.random() * validWardCodes.length)];
  return randomWard.ward_code;
}

// Generate random address
function generateAddress() {
  const streetNumbers = Math.floor(Math.random() * 999) + 1;
  const streets = ['Main Road', 'Church Street', 'Market Street', 'Station Road', 'High Street',
                   'Park Avenue', 'Victoria Street', 'King Street', 'Queen Street', 'Oxford Road'];
  const suburbs = ['Sandton', 'Rosebank', 'Parktown', 'Braamfontein', 'Hillbrow', 'Yeoville',
                   'Soweto', 'Alexandra', 'Randburg', 'Midrand', 'Centurion', 'Pretoria'];
  
  const street = streets[Math.floor(Math.random() * streets.length)];
  const suburb = suburbs[Math.floor(Math.random() * suburbs.length)];
  
  return `${streetNumbers} ${street}, ${suburb}`;
}

// Generate a single member record
function generateMemberRecord(rowNumber) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const dateOfBirth = generateDateOfBirth();
  const idNumber = generateIDNumber(dateOfBirth);
  const gender = genders[Math.floor(Math.random() * genders.length)];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rowNumber}@example.com`;
  const cellNumber = generateCellNumber();
  const address = generateAddress();
  const wardCode = generateWardCode();
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const paymentAmount = [50, 100, 150, 200][Math.floor(Math.random() * 4)];
  const paymentDate = new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000);
  
  return {
    'First Name': firstName,
    'Last Name': lastName,
    'ID Number': idNumber,
    'Date of Birth': dateOfBirth.toISOString().split('T')[0],
    'Gender': gender,
    'Email': email,
    'Cell Number': cellNumber,
    'Address': address,  // Changed from 'Residential Address' to match backend expectations
    'Ward Code': wardCode,
    'Province Code': province.code,
    'Application Type': 'New',
    'Payment Method': 'Cash',
    'Payment Reference': `REF${Date.now()}${rowNumber}`,
    'Payment Amount': paymentAmount,
    'Last Payment Date': paymentDate.toISOString().split('T')[0]
  };
}

// Generate Excel file with specified number of rows
async function generateExcelFile(rowCount, outputPath) {
  console.log(`📝 Generating ${rowCount} member application records...`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Member Applications');
  
  // Add headers
  const headers = [
    'First Name', 'Last Name', 'ID Number', 'Date of Birth', 'Gender',
    'Email', 'Cell Number', 'Address', 'Ward Code', 'Province Code',
    'Application Type', 'Payment Method', 'Payment Reference', 'Payment Amount', 'Last Payment Date'
  ];
  
  worksheet.addRow(headers);
  
  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // Generate and add data rows
  for (let i = 1; i <= rowCount; i++) {
    const record = generateMemberRecord(i);
    worksheet.addRow(Object.values(record));
    
    if (i % 1000 === 0) {
      console.log(`  Generated ${i}/${rowCount} records...`);
    }
  }
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Save file
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ File saved: ${outputPath}`);
}

// Main execution
async function main() {
  const outputDir = path.join(__dirname, 'output');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const fileSizes = [100, 1000, 5000, 10000];
  
  console.log('🚀 Starting member application file generation...\n');
  
  for (const size of fileSizes) {
    const outputPath = path.join(outputDir, `member-applications-${size}.xlsx`);
    await generateExcelFile(size, outputPath);
    console.log('');
  }
  
  console.log('✅ All files generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
}

main().catch(console.error);

