/**
 * Script to generate all three Excel reports
 * Usage: ts-node backend/scripts/generate-reports.ts
 */

import { ExcelReportService } from '../src/services/excelReportService';
import { initializeDatabase } from '../src/config/database-hybrid';
import * as path from 'path';

async function generateReports() {
  console.log('🚀 Starting report generation...\n');

  try {
    // Initialize database connection
    console.log('📊 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database connected\n');

    // Generate Ward Audit Report
    console.log('📋 Generating Ward Audit Report...');
    const auditBuffer = await ExcelReportService.generateWardAuditReport({});
    const auditPath = await ExcelReportService.saveReportToFile(auditBuffer, 'Audit.xlsx');
    console.log(`✅ Ward Audit Report saved to: ${auditPath}\n`);

    // Generate Daily Report
    console.log('📋 Generating Daily Report...');
    const dailyBuffer = await ExcelReportService.generateDailyReport();
    const dailyPath = await ExcelReportService.saveReportToFile(dailyBuffer, 'DAILY REPORT.xlsx');
    console.log(`✅ Daily Report saved to: ${dailyPath}\n`);

    // Generate SRPA Delegates Report
    console.log('📋 Generating SRPA Delegates Report...');
    const delegatesBuffer = await ExcelReportService.generateSRPADelegatesReport({});
    const delegatesPath = await ExcelReportService.saveReportToFile(
      delegatesBuffer,
      'ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx'
    );
    console.log(`✅ SRPA Delegates Report saved to: ${delegatesPath}\n`);

    console.log('🎉 All reports generated successfully!');
    console.log('\nGenerated reports:');
    console.log(`  1. ${auditPath}`);
    console.log(`  2. ${dailyPath}`);
    console.log(`  3. ${delegatesPath}`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error generating reports:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
generateReports();

