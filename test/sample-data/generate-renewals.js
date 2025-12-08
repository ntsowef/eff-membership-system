/**
 * Generate Sample Renewal Excel Files
 * Creates Excel files with various sizes for testing bulk renewal functionality
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Sample data pools
const firstNames = ['Thabo', 'Sipho', 'Nomsa', 'Zanele', 'Mandla', 'Lerato', 'Bongani', 'Thandiwe', 'Mpho', 'Nkosi'];
const lastNames = ['Dlamini', 'Nkosi', 'Mthembu', 'Khumalo', 'Zulu', 'Ndlovu', 'Mokoena', 'Molefe', 'Sithole', 'Mahlangu'];
const genders = ['Male', 'Female'];
const provinces = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];
const wardCodes = ['79790001', '79790002', '79790003', '79790004', '79790005'];
const paymentMethods = ['Cash', 'EFT', 'Card'];

/**
 * Generate a valid South African ID number
 */
function generateValidIDNumber(dateOfBirth, gender) {
  const year = dateOfBirth.getFullYear().toString().slice(-2);
  const month = (dateOfBirth.getMonth() + 1).toString().padStart(2, '0');
  const day = dateOfBirth.getDate().toString().padStart(2, '0');
  
  const genderDigit = gender === 'Male' ? Math.floor(Math.random() * 5) + 5 : Math.floor(Math.random() * 5);
  const citizenDigit = '0'; // SA citizen
  const raceDigit = '8'; // Not used anymore but kept for format
  
  const idWithoutChecksum = `${year}${month}${day}${genderDigit}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}${citizenDigit}${raceDigit}`;
  
  // Calculate Luhn checksum
  let sum = 0;
  for (let i = 0; i < idWithoutChecksum.length; i++) {
    let digit = parseInt(idWithoutChecksum[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checksum = (10 - (sum % 10)) % 10;
  
  return idWithoutChecksum + checksum;
}

/**
 * Generate random date of birth (18-80 years old)
 */
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

/**
 * Generate last payment date (within last 24 months)
 */
function generateLastPaymentDate() {
  const today = new Date();
  const daysAgo = Math.floor(Math.random() * 730); // 0-730 days ago (2 years)
  const paymentDate = new Date(today);
  paymentDate.setDate(paymentDate.getDate() - daysAgo);
  return paymentDate;
}

/**
 * Generate sample renewal records
 */
function generateRecords(count) {
  const records = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const dateOfBirth = generateDateOfBirth();
    const idNumber = generateValidIDNumber(dateOfBirth, gender);
    const provinceCode = provinces[Math.floor(Math.random() * provinces.length)];
    const wardCode = wardCodes[Math.floor(Math.random() * wardCodes.length)];
    const lastPaymentDate = generateLastPaymentDate();
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    // Calculate expiry date (24 months from last payment)
    const expiryDate = new Date(lastPaymentDate);
    expiryDate.setMonth(expiryDate.getMonth() + 24);
    
    records.push({
      'Member ID Number': idNumber,
      'First Name': firstName,
      'Last Name': lastName,
      'Last Payment Date': lastPaymentDate.toISOString().split('T')[0],
      'Expiry Date': expiryDate.toISOString().split('T')[0],
      'Renewal Ward Code': wardCode,
      'Province Code': provinceCode,
      'Payment Method': paymentMethod,
      'Payment Amount': '120.00',
      'Payment Reference': `REF${Date.now()}${i}`
    });
  }
  
  return records;
}

/**
 * Create Excel file with records
 */
async function createExcelFile(records, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Renewals');
  
  // Add headers
  const headers = Object.keys(records[0]);
  worksheet.addRow(headers);
  
  // Add data rows
  records.forEach(record => {
    worksheet.addRow(Object.values(record));
  });
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Save file
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  await workbook.xlsx.writeFile(filepath);
  
  console.log(`✅ Created: ${filename} (${records.length} records)`);
  return filepath;
}

/**
 * Main function
 */
async function main() {
  console.log('📊 Generating Renewal Sample Data...\n');
  
  const sizes = [
    { count: 100, filename: 'renewals-100.xlsx' },
    { count: 1000, filename: 'renewals-1000.xlsx' },
    { count: 5000, filename: 'renewals-5000.xlsx' }
  ];
  
  for (const size of sizes) {
    const records = generateRecords(size.count);
    await createExcelFile(records, size.filename);
  }
  
  console.log('\n✅ All renewal sample files generated successfully!');
  console.log(`📁 Output directory: ${path.join(__dirname, 'output')}`);
}

main().catch(console.error);

