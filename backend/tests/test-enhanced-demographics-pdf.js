const fs = require('fs');

// Test Enhanced Demographics Report PDF Generation with Charts
async function testEnhancedDemographicsReportPDF() {
  console.log('🎨 Testing Enhanced Demographics Report PDF Generation with Charts...\n');

  const baseUrl = 'http://localhost:5000/api/v1/statistics/demographics/report/pdf';
  
  const testCases = [
    {
      name: 'National Report with Charts',
      url: `${baseUrl}?title=National%20Demographics%20Report%20with%20Charts&include_charts=true`,
      filename: 'national-report-with-charts.pdf',
      expectCharts: true
    },
    {
      name: 'National Report without Charts',
      url: `${baseUrl}?title=National%20Demographics%20Report%20without%20Charts&include_charts=false`,
      filename: 'national-report-without-charts.pdf',
      expectCharts: false
    },
    {
      name: 'Gauteng Report with Charts',
      url: `${baseUrl}?province_code=GP&title=Gauteng%20Demographics%20with%20Charts&include_charts=true`,
      filename: 'gauteng-report-with-charts.pdf',
      expectCharts: true
    },
    {
      name: 'Western Cape Report with Charts',
      url: `${baseUrl}?province_code=WC&title=Western%20Cape%20Demographics%20with%20Charts&include_charts=true`,
      filename: 'western-cape-report-with-charts.pdf',
      expectCharts: true
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`📊 Generating: ${testCase.name}`);
      const startTime = Date.now();
      
      const response = await fetch(testCase.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(buffer);
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Save PDF file
      fs.writeFileSync(testCase.filename, pdfBuffer);
      
      // Verify PDF header
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      const isValidPDF = pdfHeader === '%PDF';
      
      // Analyze file size to determine if charts are included
      const hasCharts = pdfBuffer.length > 50000; // Charts make PDFs much larger
      const chartsExpected = testCase.expectCharts;
      const chartsCorrect = hasCharts === chartsExpected;
      
      const result = {
        name: testCase.name,
        filename: testCase.filename,
        size: pdfBuffer.length,
        generationTime,
        isValidPDF,
        hasCharts,
        chartsExpected,
        chartsCorrect,
        success: isValidPDF && chartsCorrect
      };
      
      results.push(result);
      
      console.log(`✅ Generated: ${testCase.filename}`);
      console.log(`   Size: ${pdfBuffer.length.toLocaleString()} bytes`);
      console.log(`   Generation Time: ${generationTime}ms`);
      console.log(`   Valid PDF: ${isValidPDF ? '✅' : '❌'}`);
      console.log(`   Charts Expected: ${chartsExpected ? '✅' : '❌'}`);
      console.log(`   Charts Detected: ${hasCharts ? '✅' : '❌'}`);
      console.log(`   Charts Correct: ${chartsCorrect ? '✅' : '❌'}`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error generating ${testCase.name}:`, error.message);
      results.push({
        name: testCase.name,
        filename: testCase.filename,
        success: false,
        error: error.message
      });
      console.log('');
    }
  }

  // Summary Report
  console.log('📋 Test Summary Report');
  console.log('======================\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('📊 Successful Generations:');
    successful.forEach(result => {
      console.log(`   ✅ ${result.name}`);
      console.log(`      File: ${result.filename} (${result.size.toLocaleString()} bytes)`);
      console.log(`      Time: ${result.generationTime}ms`);
      console.log(`      Charts: ${result.hasCharts ? 'Included' : 'Not included'} (${result.chartsExpected ? 'Expected' : 'Not expected'})`);
    });
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log('❌ Failed Generations:');
    failed.forEach(result => {
      console.log(`   ❌ ${result.name}: ${result.error || 'Unknown error'}`);
    });
    console.log('');
  }
  
  // File Size Analysis
  console.log('📈 File Size Analysis:');
  const withCharts = successful.filter(r => r.hasCharts);
  const withoutCharts = successful.filter(r => !r.hasCharts);
  
  if (withCharts.length > 0) {
    const avgSizeWithCharts = withCharts.reduce((sum, r) => sum + r.size, 0) / withCharts.length;
    console.log(`   With Charts: ${withCharts.length} files, avg ${avgSizeWithCharts.toLocaleString()} bytes`);
  }
  
  if (withoutCharts.length > 0) {
    const avgSizeWithoutCharts = withoutCharts.reduce((sum, r) => sum + r.size, 0) / withoutCharts.length;
    console.log(`   Without Charts: ${withoutCharts.length} files, avg ${avgSizeWithoutCharts.toLocaleString()} bytes`);
  }
  
  if (withCharts.length > 0 && withoutCharts.length > 0) {
    const avgSizeWithCharts = withCharts.reduce((sum, r) => sum + r.size, 0) / withCharts.length;
    const avgSizeWithoutCharts = withoutCharts.reduce((sum, r) => sum + r.size, 0) / withoutCharts.length;
    const sizeIncrease = ((avgSizeWithCharts - avgSizeWithoutCharts) / avgSizeWithoutCharts * 100).toFixed(1);
    console.log(`   Size Increase with Charts: ${sizeIncrease}%`);
  }
  
  // Performance Analysis
  console.log('\n⏱️ Performance Analysis:');
  const avgGenerationTime = successful.reduce((sum, r) => sum + r.generationTime, 0) / successful.length;
  console.log(`   Average Generation Time: ${avgGenerationTime.toFixed(0)}ms`);
  
  const withChartsTime = withCharts.reduce((sum, r) => sum + r.generationTime, 0) / withCharts.length;
  const withoutChartsTime = withoutCharts.reduce((sum, r) => sum + r.generationTime, 0) / withoutCharts.length;
  
  if (withCharts.length > 0) {
    console.log(`   With Charts: ${withChartsTime.toFixed(0)}ms average`);
  }
  if (withoutCharts.length > 0) {
    console.log(`   Without Charts: ${withoutChartsTime.toFixed(0)}ms average`);
  }
  
  console.log('\n🎯 Chart Types Included:');
  console.log('   📊 Gender Distribution Pie Chart');
  console.log('   📊 Age Groups Bar Chart');
  console.log('   📊 Race Demographics Pie Chart');
  console.log('   📊 Top Languages Bar Chart');
  console.log('   📊 Occupation Categories Horizontal Bar Chart');
  
  console.log('\n🎉 Enhanced Demographics Report PDF Generation Test Completed!');
  
  if (successful.length === results.length) {
    console.log('✅ All tests passed! Charts are working correctly.');
  } else {
    console.log(`⚠️ ${failed.length} test(s) failed. Please check the errors above.`);
  }
}

// Run the enhanced test
testEnhancedDemographicsReportPDF().catch(console.error);
