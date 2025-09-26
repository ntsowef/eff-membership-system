const fs = require('fs');
const path = require('path');

// Test Demographics Report PDF Generation
async function testDemographicsReportPDF() {
  console.log('🔄 Testing Demographics Report PDF Generation...\n');

  const baseUrl = 'http://localhost:5000/api/v1/statistics/demographics/report/pdf';
  
  const testCases = [
    {
      name: 'National Demographics Report',
      url: `${baseUrl}?title=National%20Demographics%20Report&include_charts=true`,
      filename: 'national-demographics-report.pdf'
    },
    {
      name: 'Gauteng Province Demographics Report',
      url: `${baseUrl}?province_code=GP&title=Gauteng%20Demographics%20Report&include_charts=true`,
      filename: 'gauteng-demographics-report.pdf'
    },
    {
      name: 'Western Cape Province Demographics Report',
      url: `${baseUrl}?province_code=WC&title=Western%20Cape%20Demographics%20Report&include_charts=false`,
      filename: 'western-cape-demographics-report.pdf'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`📊 Generating: ${testCase.name}`);
      
      const response = await fetch(testCase.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(buffer);
      
      // Save PDF file
      fs.writeFileSync(testCase.filename, pdfBuffer);
      
      console.log(`✅ Generated: ${testCase.filename} (${pdfBuffer.length} bytes)`);
      
      // Verify PDF header
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      if (pdfHeader === '%PDF') {
        console.log(`✅ Valid PDF format confirmed`);
      } else {
        console.log(`❌ Invalid PDF format: ${pdfHeader}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error generating ${testCase.name}:`, error.message);
      console.log('');
    }
  }
}

// Test Demographics Data API
async function testDemographicsDataAPI() {
  console.log('📊 Testing Demographics Data API...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/v1/statistics/demographics');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const demographics = data.demographics;
    
    console.log('✅ Demographics Data Retrieved Successfully:');
    console.log(`   Total Members: ${demographics.gender.total.toLocaleString()}`);
    console.log(`   Male: ${demographics.gender.male.toLocaleString()} (${((demographics.gender.male / demographics.gender.total) * 100).toFixed(1)}%)`);
    console.log(`   Female: ${demographics.gender.female.toLocaleString()} (${((demographics.gender.female / demographics.gender.total) * 100).toFixed(1)}%)`);
    console.log(`   Age Groups: ${Object.keys(demographics.age_groups).length - 1} categories`);
    console.log(`   Languages: ${demographics.language.length} different languages`);
    console.log(`   Races: ${demographics.race.length} different races`);
    console.log(`   Occupations: ${demographics.occupation.length} categories`);
    console.log(`   Qualifications: ${demographics.qualification.length} levels`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error fetching demographics data:', error.message);
    console.log('');
  }
}

// Main test function
async function runTests() {
  console.log('🎯 Demographics Report PDF Generation Test Suite');
  console.log('================================================\n');
  
  // Test data API first
  await testDemographicsDataAPI();
  
  // Test PDF generation
  await testDemographicsReportPDF();
  
  console.log('🎉 Test Suite Completed!');
  console.log('\n📋 Generated Files:');
  
  const files = [
    'national-demographics-report.pdf',
    'gauteng-demographics-report.pdf',
    'western-cape-demographics-report.pdf'
  ];
  
  files.forEach(filename => {
    if (fs.existsSync(filename)) {
      const stats = fs.statSync(filename);
      console.log(`   ✅ ${filename} (${stats.size} bytes)`);
    } else {
      console.log(`   ❌ ${filename} (not found)`);
    }
  });
  
  console.log('\n🔍 To view the PDFs, open them with any PDF viewer.');
  console.log('📊 The reports contain comprehensive demographic breakdowns including:');
  console.log('   • Executive Summary with key statistics');
  console.log('   • Gender Distribution');
  console.log('   • Age Group Analysis');
  console.log('   • Race Demographics');
  console.log('   • Language Preferences');
  console.log('   • Occupation Categories');
  console.log('   • Education Levels');
}

// Run the tests
runTests().catch(console.error);
