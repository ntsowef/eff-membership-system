/**
 * Read Excel Report and Extract Database Errors
 * 
 * This script reads the generated Excel report and extracts error details
 */

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPORT_PATH = path.resolve(process.cwd(), '../test/bulk-upload-integration/report-job-1764120390306-4501.xlsx');

async function readReportErrors() {
  console.log('📊 Reading Excel report for error details...\n');
  console.log(`Report: ${REPORT_PATH}\n`);

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(REPORT_PATH);

    console.log(`✅ Report loaded successfully`);
    console.log(`   Sheets: ${workbook.worksheets.length}\n`);

    // List all sheets
    console.log('📋 Available sheets:');
    workbook.worksheets.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.name} (${sheet.rowCount} rows)`);
    });
    console.log('');

    // Check for Database Errors sheet
    const dbErrorsSheet = workbook.getWorksheet('Database Errors');
    if (dbErrorsSheet) {
      console.log('🔍 Database Errors Sheet Found:\n');
      
      // Get headers
      const headerRow = dbErrorsSheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || '';
      });

      console.log('Headers:', headers.filter(h => h).join(' | '));
      console.log('─'.repeat(100));

      // Read all error rows
      let errorCount = 0;
      for (let i = 2; i <= dbErrorsSheet.rowCount; i++) {
        const row = dbErrorsSheet.getRow(i);
        const rowData: any = {};
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        if (Object.keys(rowData).length > 0) {
          errorCount++;
          console.log(`\nError ${errorCount}:`);
          Object.entries(rowData).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        }
      }

      console.log(`\n📊 Total errors: ${errorCount}`);
    } else {
      console.log('⚠️  No "Database Errors" sheet found');
    }

    // Check for Summary sheet
    console.log('\n' + '='.repeat(100));
    const summarySheet = workbook.getWorksheet('Summary');
    if (summarySheet) {
      console.log('\n📊 Summary Sheet:\n');
      
      for (let i = 1; i <= Math.min(20, summarySheet.rowCount); i++) {
        const row = summarySheet.getRow(i);
        const values: any[] = [];
        row.eachCell((cell) => {
          values.push(cell.value);
        });
        if (values.some(v => v)) {
          console.log(`  ${values.join(' | ')}`);
        }
      }
    }

    // Check for Processing Results sheet
    console.log('\n' + '='.repeat(100));
    const resultsSheet = workbook.getWorksheet('Processing Results');
    if (resultsSheet) {
      console.log('\n📊 Processing Results Sheet (first 10 rows):\n');
      
      for (let i = 1; i <= Math.min(10, resultsSheet.rowCount); i++) {
        const row = resultsSheet.getRow(i);
        const values: any[] = [];
        row.eachCell((cell) => {
          values.push(cell.value);
        });
        if (values.some(v => v)) {
          console.log(`  Row ${i}: ${values.join(' | ')}`);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error reading report:', error.message);
    console.error('Stack:', error.stack);
  }
}

readReportErrors();

