import { ExcelReportService } from '../src/services/excelReportService';
import { initializeDatabase } from '../src/config/database';
import * as fs from 'fs';
import * as path from 'path';

async function testSRPAReport() {
  try {
    console.log('\n🚀 Testing SRPA Report Generation...\n');

    // Initialize database
    console.log('📊 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database connected\n');

    // Generate SRPA Report
    console.log('📋 Generating SRPA Delegates Report...');
    const buffer = await ExcelReportService.generateSRPADelegatesReport();

    // Save to file
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, 'TEST-SRPA-REPORT.xlsx');
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ SRPA Delegates Report saved to: ${filePath}\n`);

    // Verify sheets using xlsx
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    console.log('📊 Report Structure:');
    console.log(`   Total Sheets: ${workbook.SheetNames.length}`);
    console.log(`   Sheet Names: ${workbook.SheetNames.join(', ')}\n`);

    console.log('🎉 SRPA Report test completed successfully!\n');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error testing SRPA report:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSRPAReport();

