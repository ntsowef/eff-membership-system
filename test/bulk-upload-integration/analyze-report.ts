/**
 * Analyze Bulk Upload Report
 * 
 * This script reads and analyzes the generated Excel report
 */

import XLSX from 'xlsx';
import path from 'path';

// Get report path from command line argument
const reportFileName = process.argv[2] || 'report-job-1764135602234-1911.xlsx';
const reportPath = path.resolve(process.cwd(), '..', 'test', 'bulk-upload-integration', reportFileName);

console.log('📊 Analyzing Report:', reportPath);
console.log('='.repeat(80));
console.log('');

try {
  const workbook = XLSX.readFile(reportPath);
  
  // List all sheets
  console.log('📋 Available Sheets:', workbook.SheetNames.join(', '));
  console.log('');
  
  // Read Summary sheet
  console.log('📊 SUMMARY SHEET:');
  console.log('='.repeat(80));
  const summarySheet = workbook.Sheets['Summary'];
  if (summarySheet) {
    const summaryData: any[] = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
    summaryData.slice(0, 25).forEach((row: any) => {
      if (row && row.length > 0) {
        console.log(row.join(' | '));
      }
    });
  }
  console.log('');
  
  // Read Invalid IDs sheet
  console.log('❌ INVALID IDs SHEET:');
  console.log('='.repeat(80));
  const invalidSheet = workbook.Sheets['Invalid IDs'];
  if (invalidSheet) {
    const invalidData: any[] = XLSX.utils.sheet_to_json(invalidSheet);
    console.log('Total Invalid IDs:', invalidData.length);
    console.log('');
    invalidData.slice(0, 5).forEach((row: any, idx: number) => {
      console.log(`Record ${idx + 1}:`);
      console.log('  ID Number:', row['ID Number']);
      console.log('  Name:', row['Name'] || row['Firstname']);
      console.log('  Surname:', row['Surname']);
      console.log('  Validation Error:', row['Validation Error']);
      console.log('');
    });
  } else {
    console.log('No Invalid IDs sheet found');
  }
  console.log('');
  
  // Read Database Errors sheet
  console.log('💾 DATABASE ERRORS SHEET:');
  console.log('='.repeat(80));
  const dbErrorsSheet = workbook.Sheets['Database Errors'];
  if (dbErrorsSheet) {
    const dbErrorsData: any[] = XLSX.utils.sheet_to_json(dbErrorsSheet);
    console.log('Total Database Errors:', dbErrorsData.length);
    console.log('');
    dbErrorsData.slice(0, 10).forEach((row: any, idx: number) => {
      console.log(`Error ${idx + 1}:`);
      console.log('  ID Number:', row['ID Number']);
      console.log('  Operation:', row['Operation']);
      console.log('  Error:', row['Error Message']);
      console.log('');
    });
  } else {
    console.log('No Database Errors sheet found');
  }
  console.log('');
  
  // Read All Uploaded Rows sheet
  console.log('📄 ALL UPLOADED ROWS SHEET (First 3 records):');
  console.log('='.repeat(80));
  const allRowsSheet = workbook.Sheets['All Uploaded Rows'];
  if (allRowsSheet) {
    const allRowsData: any[] = XLSX.utils.sheet_to_json(allRowsSheet);
    console.log('Total Rows:', allRowsData.length);
    console.log('');
    allRowsData.slice(0, 3).forEach((row: any, idx: number) => {
      console.log(`Row ${idx + 1}:`);
      console.log('  ID Number:', row['ID Number']);
      console.log('  Name:', row['Name'] || row['Firstname']);
      console.log('  Surname:', row['Surname']);
      console.log('  IEC Status:', row['IEC Status']);
      console.log('  Registered:', row['Registered']);
      console.log('  VD Code:', row['VD Code']);
      console.log('  Database Status:', row['Database Status']);
      console.log('');
    });
  }
  
  console.log('✅ Report analysis complete');
  
} catch (error: any) {
  console.error('❌ Error reading report:', error.message);
  process.exit(1);
}

