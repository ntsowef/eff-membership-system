/**
 * Test script to verify Daily Report Metro Municipality fix
 * This script generates a Daily Report and checks if Metro Municipalities are correctly handled
 */

import { ExcelReportService } from '../backend/src/services/excelReportService';
import { initializeDatabase } from '../backend/src/config/database';
import * as ExcelJS from 'exceljs';

async function testDailyReportMetroFix() {
  console.log('🧪 Testing Daily Report Metro Municipality Fix\n');
  console.log('=' .repeat(80));

  try {
    // Initialize database
    console.log('📊 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database connected\n');

    // Generate Daily Report
    console.log('📋 Generating Daily Report...');
    const dailyBuffer = await ExcelReportService.generateDailyReport();
    console.log('✅ Daily Report generated\n');

    // Save to file
    const reportPath = await ExcelReportService.saveReportToFile(
      dailyBuffer,
      'DAILY_REPORT_METRO_FIX_TEST.xlsx'
    );
    console.log(`💾 Report saved to: ${reportPath}\n`);

    // Read and analyze the report
    console.log('🔍 Analyzing Municipality-District Analysis sheet...\n');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(dailyBuffer);

    const sheet = workbook.getWorksheet('Municipality-District Analysis');
    if (!sheet) {
      throw new Error('Municipality-District Analysis sheet not found');
    }

    // Extract data
    const municipalities: string[] = [];
    let currentProvince = '';
    const metroMunicipalities: string[] = [];
    const gautengMunicipalities: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const municipalityName = row.getCell(1).value?.toString() || '';

      // Check if it's a province header
      if (!row.getCell(2).value && !row.getCell(3).value) {
        if (!municipalityName.includes('Total')) {
          currentProvince = municipalityName;
          console.log(`\n📍 Province: ${currentProvince}`);
        }
        return;
      }

      // Check for Metro Municipalities
      if (municipalityName.includes('Metropolitan Municipality')) {
        metroMunicipalities.push(municipalityName);
        console.log(`   ❌ FOUND METRO: ${municipalityName}`);
      } else if (municipalityName && !municipalityName.includes('Total')) {
        municipalities.push(municipalityName);
        if (currentProvince === 'Gauteng') {
          gautengMunicipalities.push(municipalityName);
          console.log(`   ✅ ${municipalityName}`);
        }
      }
    });

    // Results
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(80));

    console.log(`\n✅ Total municipalities/sub-regions found: ${municipalities.length}`);
    console.log(`✅ Gauteng municipalities/sub-regions: ${gautengMunicipalities.length}`);

    if (metroMunicipalities.length === 0) {
      console.log('\n✅ SUCCESS: No Metro Municipalities found in report');
      console.log('   Metro Municipalities are correctly excluded');
      console.log('   Only sub-regions are shown');
    } else {
      console.log(`\n❌ FAILURE: Found ${metroMunicipalities.length} Metro Municipalities:`);
      metroMunicipalities.forEach(metro => {
        console.log(`   - ${metro}`);
      });
      console.log('\n   These should NOT appear in the report!');
      console.log('   Only their sub-regions should be shown.');
    }

    console.log('\n📋 Gauteng Municipalities/Sub-Regions:');
    gautengMunicipalities.forEach(muni => {
      console.log(`   - ${muni}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('='.repeat(80));
    console.log('❌ Should NOT see:');
    console.log('   - City of Johannesburg Metropolitan Municipality');
    console.log('   - City of Tshwane Metropolitan Municipality');
    console.log('   - Ekurhuleni Metropolitan Municipality');
    console.log('\n✅ Should see:');
    console.log('   - Emfuleni Sub-Region');
    console.log('   - Lesedi Sub-Region');
    console.log('   - Merafong City Sub-Region');
    console.log('   - Midvaal Sub-Region');
    console.log('   - Mogale City Sub-Region');
    console.log('   - Rand West City Sub-Region');
    console.log('   - (and other Gauteng sub-regions)');

    console.log('\n' + '='.repeat(80));

    if (metroMunicipalities.length === 0) {
      console.log('✅ TEST PASSED: Metro Municipality fix is working correctly!');
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED: Metro Municipalities still appearing in report');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Error during test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testDailyReportMetroFix();

