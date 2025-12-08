/**
 * Generate Complete Test Data
 * 
 * This script generates a complete test Excel file with all required fields
 */

import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

// Load lookup values
const lookupData = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), '../test/bulk-upload-integration/valid-lookup-values.json'),
    'utf-8'
  )
);

// Test ID numbers (valid SA IDs)
const testIdNumbers = [
  '9001156982084', // Valid
  '9812179869085', // Valid
  '6605269686085', // Valid
  '6104129711085', // Valid
  '9011306364082', // Valid
  '8503205678089', // Valid
  '7209145432087', // Valid
  '9405231234086', // Valid
  '8801127890083', // Valid
  '9107089876084', // Valid
];

// Test names
const firstNames = ['Lindiwe', 'Tebogo', 'Sello', 'Keabetswe', 'Karabo', 'Thabo', 'Nomsa', 'Sipho', 'Zanele', 'Mandla'];
const surnames = ['Fourie', 'Nkosi', 'Naicker', 'Van der Merwe', 'Moodley', 'Dlamini', 'Khumalo', 'Mokoena', 'Zulu', 'Ndlovu'];

async function generateTestData() {
  console.log('📊 Generating complete test data...\n');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Members');

  // Define headers (all required columns)
  const headers = [
    'ID Number',
    'Name',
    'Surname',
    'Cell Number',
    'Email',
    'Ward',
    'Gender',
    'Race',
    'Citizenship',
    'Language',
    'Province',
    'Municipality',
    'Occupation',
    'Qualification',
    'Status',
    'Date Joined',
    'Last Payment',
    'Expiry Date',
    'Subscription',
    'Membership Amount'
  ];

  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Generate 10 test records
  for (let i = 0; i < 10; i++) {
    const ward = lookupData.wards[i % lookupData.wards.length];
    const gender = lookupData.genders[i % lookupData.genders.length];
    const race = lookupData.races[i % lookupData.races.length];
    const citizenship = lookupData.citizenships[0]; // South African
    const language = lookupData.languages[i % lookupData.languages.length];
    const province = lookupData.provinces[i % lookupData.provinces.length];
    const municipality = lookupData.municipalities[i % lookupData.municipalities.length];
    const occupation = lookupData.occupations[i % lookupData.occupations.length];
    const qualification = lookupData.qualifications[i % lookupData.qualifications.length];
    const subscriptionType = lookupData.subscription_types[0]; // First subscription type

    const row = [
      testIdNumbers[i],
      firstNames[i],
      surnames[i],
      `082${Math.floor(1000000 + Math.random() * 9000000)}`,
      `${firstNames[i].toLowerCase()}.${surnames[i].toLowerCase()}@example.com`,
      ward.ward_code,
      gender.gender_name,
      race.race_name,
      citizenship.citizenship_name,
      language.language_name,
      province.province_name,
      municipality.municipality_name,
      occupation.occupation_name,
      qualification.qualification_name,
      'Registered', // Voter status
      '2024-01-01', // Date joined
      '2024-01-01', // Last payment
      '2026-01-01', // Expiry date
      subscriptionType.subscription_type_name,
      subscriptionType.amount || 12
    ];

    worksheet.addRow(row);
  }

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    if (column) {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    }
  });

  // Save file
  const outputPath = path.resolve(process.cwd(), '../test/bulk-upload-poc/sample-data/test-members-complete.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`✅ Test data generated successfully!`);
  console.log(`   File: ${outputPath}`);
  console.log(`   Records: 10`);
  console.log(`   Columns: ${headers.length}`);
  console.log('\n📋 Sample data:');
  console.log(`   ID: ${testIdNumbers[0]}`);
  console.log(`   Name: ${firstNames[0]} ${surnames[0]}`);
  console.log(`   Ward: ${lookupData.wards[0].ward_code}`);
  console.log(`   Gender: ${lookupData.genders[0].gender_name}`);
  console.log(`   Race: ${lookupData.races[0].race_name}`);
  console.log(`   Province: ${lookupData.provinces[0].province_name}`);
  console.log(`   Municipality: ${lookupData.municipalities[0].municipality_name}`);
}

generateTestData();

