/**
 * Read Test Excel File
 * 
 * This script reads the test Excel file to see what data it contains
 */

import ExcelJS from 'exceljs';
import path from 'path';

const TEST_FILE = path.resolve(process.cwd(), '../test/bulk-upload-poc/sample-data/test-members.xlsx');

async function readTestFile() {
  console.log('📊 Reading test Excel file...\n');
  console.log(`File: ${TEST_FILE}\n`);

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEST_FILE);

    console.log(`✅ File loaded successfully`);
    console.log(`   Sheets: ${workbook.worksheets.length}\n`);

    // Get first sheet
    const sheet = workbook.worksheets[0];
    console.log(`📋 Sheet: ${sheet.name}`);
    console.log(`   Rows: ${sheet.rowCount}\n`);

    // Get headers
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString() || '';
    });

    console.log('📝 Headers:');
    headers.forEach((header, index) => {
      if (header) {
        console.log(`   ${index}. ${header}`);
      }
    });

    console.log('\n📊 Sample data (first 5 rows):\n');

    // Read first 5 data rows
    for (let i = 2; i <= Math.min(6, sheet.rowCount); i++) {
      const row = sheet.getRow(i);
      const rowData: any = {};
      
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      console.log(`Row ${i - 1}:`);
      console.log(`  ID Number: ${rowData['ID Number']}`);
      console.log(`  Name: ${rowData['Name'] || rowData['Firstname']}`);
      console.log(`  Surname: ${rowData['Surname']}`);
      console.log(`  Ward: ${rowData['Ward']}`);
      console.log(`  Province: ${rowData['Province']}`);
      console.log(`  Municipality: ${rowData['Municipality']}`);
      console.log(`  Status: ${rowData['Status']}`);
      console.log('');
    }

    // Check ward codes specifically
    console.log('🔍 All ward codes in file:');
    const wardCodes = new Set<string>();
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const wardIndex = headers.indexOf('Ward');
      if (wardIndex > 0) {
        const cell = row.getCell(wardIndex);
        const wardValue = cell.value?.toString() || '';
        if (wardValue) {
          wardCodes.add(wardValue);
        }
      }
    }

    wardCodes.forEach((code) => {
      console.log(`   - ${code}`);
    });

  } catch (error: any) {
    console.error('❌ Error reading file:', error.message);
  }
}

readTestFile();

