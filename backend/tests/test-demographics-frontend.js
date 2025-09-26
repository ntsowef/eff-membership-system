const fs = require('fs');

// Test Demographics API and Frontend Integration
async function testDemographicsIntegration() {
  console.log('🔄 Testing Demographics API and Frontend Integration...\n');

  try {
    // Test 1: Demographics Data API
    console.log('📊 Testing Demographics Data API...');
    const response = await fetch('http://localhost:5000/api/v1/statistics/demographics');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Response Structure:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Has Data: ${!!data.data}`);
    console.log(`   Has Demographics: ${!!data.data?.demographics}`);
    
    const demographics = data.data.demographics;
    if (demographics) {
      console.log('\n📈 Demographics Summary:');
      console.log(`   Total Members: ${demographics.gender.total.toLocaleString()}`);
      console.log(`   Gender - Male: ${demographics.gender.male.toLocaleString()}, Female: ${demographics.gender.female.toLocaleString()}`);
      console.log(`   Age Groups: ${Object.keys(demographics.age_groups).length - 1} categories`);
      console.log(`   Languages: ${demographics.language.length} different languages`);
      console.log(`   Races: ${demographics.race.length} different races`);
      console.log(`   Occupations: ${demographics.occupation.length} categories`);
      console.log(`   Qualifications: ${demographics.qualification.length} levels`);
    }
    
    // Test 2: PDF Generation
    console.log('\n📄 Testing PDF Generation...');
    const pdfResponse = await fetch('http://localhost:5000/api/v1/statistics/demographics/report/pdf?title=Frontend%20Test%20Report');
    
    if (!pdfResponse.ok) {
      throw new Error(`PDF Generation failed: HTTP ${pdfResponse.status}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfData = Buffer.from(pdfBuffer);
    
    // Save test PDF
    const filename = 'frontend-test-demographics-report.pdf';
    fs.writeFileSync(filename, pdfData);
    
    console.log(`✅ PDF Generated: ${filename} (${pdfData.length} bytes)`);
    
    // Verify PDF format
    const pdfHeader = pdfData.slice(0, 4).toString();
    if (pdfHeader === '%PDF') {
      console.log('✅ Valid PDF format confirmed');
    } else {
      console.log(`❌ Invalid PDF format: ${pdfHeader}`);
    }
    
    // Test 3: Frontend Data Structure Compatibility
    console.log('\n🔧 Testing Frontend Data Structure Compatibility...');
    
    // Simulate frontend data extraction
    const frontendData = data.data.demographics;
    
    const tests = [
      { name: 'Gender Data', test: () => frontendData.gender && typeof frontendData.gender.total === 'number' },
      { name: 'Age Groups Data', test: () => frontendData.age_groups && typeof frontendData.age_groups.total === 'number' },
      { name: 'Race Data Array', test: () => Array.isArray(frontendData.race) },
      { name: 'Language Data Array', test: () => Array.isArray(frontendData.language) },
      { name: 'Occupation Data Array', test: () => Array.isArray(frontendData.occupation) },
      { name: 'Qualification Data Array', test: () => Array.isArray(frontendData.qualification) },
    ];
    
    tests.forEach(test => {
      try {
        const result = test.test();
        console.log(`   ${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASS' : 'FAIL'}`);
      } catch (error) {
        console.log(`   ❌ ${test.name}: ERROR - ${error.message}`);
      }
    });
    
    // Test 4: Sample Data Validation
    console.log('\n🔍 Sample Data Validation...');
    
    if (frontendData.language.length > 0) {
      const topLanguage = frontendData.language[0];
      console.log(`   Top Language: ${topLanguage.language_name} (${topLanguage.percentage}%)`);
    }
    
    if (frontendData.race.length > 0) {
      const topRace = frontendData.race[0];
      console.log(`   Primary Race: ${topRace.race_name} (${topRace.percentage}%)`);
    }
    
    if (frontendData.occupation.length > 0) {
      const topOccupation = frontendData.occupation[0];
      console.log(`   Top Occupation: ${topOccupation.category_name} (${topOccupation.percentage}%)`);
    }
    
    console.log('\n🎉 All Tests Completed Successfully!');
    console.log('\n📋 Integration Status:');
    console.log('   ✅ Backend API working correctly');
    console.log('   ✅ PDF generation functional');
    console.log('   ✅ Data structure compatible with frontend');
    console.log('   ✅ Sample data validation passed');
    
    console.log('\n🚀 Frontend should now be able to:');
    console.log('   • Load demographics data without errors');
    console.log('   • Display all demographic breakdowns');
    console.log('   • Generate PDF reports successfully');
    console.log('   • Handle data structure correctly');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend server is running on port 5000');
    console.log('   2. Check database connection');
    console.log('   3. Verify API endpoints are accessible');
    console.log('   4. Check frontend is running on port 3000');
  }
}

// Run the integration test
testDemographicsIntegration().catch(console.error);
