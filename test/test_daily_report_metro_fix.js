/**
 * Test script to verify Daily Report Metro Municipality fix
 * Analyzes the existing Daily Report to check if Metro Municipalities are correctly handled
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function testDailyReportMetroFix() {
  console.log('🧪 Testing Daily Report Metro Municipality Fix\n');
  console.log('='.repeat(80));

  try {
    // Load the existing report
    const reportPath = path.join(__dirname, '..', 'solo', 'Daily_Report_2025-11-18 (1).xlsx');
    console.log(`📂 Loading report from: ${reportPath}\n`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(reportPath);

    const sheet = workbook.getWorksheet('Municipality-District Analysis');
    if (!sheet) {
      throw new Error('Municipality-District Analysis sheet not found');
    }

    // Extract data
    const municipalities = [];
    let currentProvince = '';
    const metroMunicipalities = [];
    const gautengMunicipalities = [];
    const provinceData = {};

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const municipalityName = row.getCell(1).value?.toString() || '';
      const iecWards = row.getCell(2).value;

      // Check if it's a province header (no data in other columns)
      if (!iecWards && !municipalityName.includes('Total')) {
        currentProvince = municipalityName;
        provinceData[currentProvince] = [];
        console.log(`\n📍 Province: ${currentProvince}`);
        return;
      }

      // Skip totals rows
      if (municipalityName.includes('Total')) {
        return;
      }

      // Check for Metro Municipalities
      if (municipalityName.includes('Metropolitan Municipality')) {
        metroMunicipalities.push({
          name: municipalityName,
          province: currentProvince,
          wards: iecWards
        });
        console.log(`   ❌ FOUND METRO: ${municipalityName} (${iecWards} wards)`);
      } else if (municipalityName) {
        municipalities.push(municipalityName);
        if (currentProvince) {
          provinceData[currentProvince].push(municipalityName);
        }
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

    console.log(`\n✅ Total municipalities/Local Municipalitys found: ${municipalities.length}`);
    console.log(`✅ Gauteng municipalities/Local Municipalitys: ${gautengMunicipalities.length}`);

    if (metroMunicipalities.length === 0) {
      console.log('\n✅ SUCCESS: No Metro Municipalities found in report');
      console.log('   Metro Municipalities are correctly excluded');
      console.log('   Only Local Municipalitys are shown');
    } else {
      console.log(`\n❌ FAILURE: Found ${metroMunicipalities.length} Metro Municipalities:`);
      metroMunicipalities.forEach(metro => {
        console.log(`   - ${metro.name} (Province: ${metro.province}, Wards: ${metro.wards})`);
      });
      console.log('\n   These should NOT appear in the report!');
      console.log('   Only their Local Municipalitys should be shown.');
    }

    console.log('\n📋 Gauteng Municipalities/Local Municipalitys:');
    gautengMunicipalities.forEach(muni => {
      console.log(`   - ${muni}`);
    });

    console.log('\n📊 Province Summary:');
    Object.keys(provinceData).forEach(province => {
      if (province) {
        console.log(`   ${province}: ${provinceData[province].length} municipalities/Local Municipalitys`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('='.repeat(80));
    console.log('❌ Should NOT see:');
    console.log('   - City of Johannesburg Metropolitan Municipality');
    console.log('   - City of Tshwane Metropolitan Municipality');
    console.log('   - Ekurhuleni Metropolitan Municipality');
    console.log('\n✅ Should see:');
    console.log('   - Emfuleni Local Municipality');
    console.log('   - Lesedi Local Municipality');
    console.log('   - Merafong City Local Municipality');
    console.log('   - Midvaal Local Municipality');
    console.log('   - Mogale City Local Municipality');
    console.log('   - Rand West City Local Municipality');
    console.log('   - (and other Gauteng Local Municipalitys)');

    console.log('\n' + '='.repeat(80));

    if (metroMunicipalities.length === 0) {
      console.log('✅ TEST PASSED: Metro Municipality fix is working correctly!');
      console.log('\n💡 The report correctly shows only Local Municipalitys, not metro municipalities.');
      return true;
    } else {
      console.log('❌ TEST FAILED: Metro Municipalities still appearing in report');
      console.log('\n💡 The SQL query needs to be updated to exclude Metropolitan municipalities.');
      console.log('   Filter: WHERE municipality_type != \'Metropolitan\'');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testDailyReportMetroFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

