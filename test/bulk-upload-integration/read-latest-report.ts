/**
 * Read Latest Report
 * 
 * This script reads the latest generated report and extracts error details
 */

import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

async function readLatestReport() {
  // Use the latest report file
  const reportPath = path.resolve(process.cwd(), '../test/bulk-upload-integration/report-job-1764126620150-9040.xlsx');

  console.log('📊 Reading report...\n');
  console.log(`File: ${reportPath}\n`);

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(reportPath);

    console.log(`✅ Report loaded`);
    console.log(`   Sheets: ${workbook.worksheets.length}\n`);

    // List all sheets
    console.log('📋 Available sheets:');
    workbook.worksheets.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.name} (${sheet.rowCount} rows)`);
    });

    // Read Summary sheet
    console.log('\n📊 Summary Sheet:');
    const summarySheet = workbook.getWorksheet('Summary');
    if (summarySheet) {
      for (let i = 1; i <= Math.min(20, summarySheet.rowCount); i++) {
        const row = summarySheet.getRow(i);
        const values: any[] = [];
        row.eachCell((cell) => {
          values.push(cell.value);
        });
        console.log(`   ${values.join(' | ')}`);
      }
    }

    // Read Invalid IDs sheet
    console.log('\n❌ Invalid IDs Sheet:');
    const invalidSheet = workbook.getWorksheet('Invalid IDs');
    if (invalidSheet && invalidSheet.rowCount > 1) {
      // Get headers
      const headerRow = invalidSheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });
      console.log(`   Headers: ${headers.join(' | ')}`);

      // Get data rows
      for (let i = 2; i <= Math.min(10, invalidSheet.rowCount); i++) {
        const row = invalidSheet.getRow(i);
        const values: any[] = [];
        row.eachCell((cell) => {
          values.push(cell.value);
        });
        console.log(`   Row ${i - 1}: ${values.join(' | ')}`);
      }
    } else {
      console.log('   No invalid IDs found');
    }

    // Read Database Errors sheet if exists
    console.log('\n🔴 Database Errors Sheet:');
    const errorsSheet = workbook.getWorksheet('Database Errors');
    if (errorsSheet && errorsSheet.rowCount > 1) {
      // Get headers
      const headerRow = errorsSheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });
      console.log(`   Headers: ${headers.join(' | ')}`);

      // Get data rows
      for (let i = 2; i <= Math.min(10, errorsSheet.rowCount); i++) {
        const row = errorsSheet.getRow(i);
        const values: any[] = [];
        row.eachCell((cell) => {
          values.push(cell.value);
        });
        console.log(`   Row ${i - 1}: ${values.join(' | ')}`);
      }
    } else {
      console.log('   No database errors sheet found');
    }

    // Read All Uploaded Rows sheet
    console.log('\n📋 All Uploaded Rows (first 3):');
    const allRowsSheet = workbook.getWorksheet('All Uploaded Rows');
    if (allRowsSheet && allRowsSheet.rowCount > 1) {
      // Get headers
      const headerRow = allRowsSheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });
      console.log(`   Headers: ${headers.join(' | ')}`);

      // Get first 3 data rows
      for (let i = 2; i <= Math.min(4, allRowsSheet.rowCount); i++) {
        const row = allRowsSheet.getRow(i);
        const values: any[] = [];
        row.eachCell((cell) => {
          values.push(cell.value);
        });
        console.log(`   Row ${i - 1}: ${values.join(' | ')}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error reading report:', error.message);
  }
}

readLatestReport();

