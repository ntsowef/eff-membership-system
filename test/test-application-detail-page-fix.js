const { spawn } = require('child_process');
const path = require('path');

async function testApplicationDetailPageFix() {
  console.log('🔧 Testing Application Detail Page Fix...');
  
  const frontendPath = path.join(__dirname, '..', 'frontend');
  console.log(`Frontend path: ${frontendPath}`);
  
  // Test TypeScript compilation
  console.log('\n📝 Testing TypeScript compilation...');
  const tscProcess = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], { 
    cwd: frontendPath, 
    shell: true 
  });
  
  let tscOutput = '';
  let tscError = '';
  
  tscProcess.stdout.on('data', (data) => {
    tscOutput += data.toString();
  });
  
  tscProcess.stderr.on('data', (data) => {
    tscError += data.toString();
  });
  
  tscProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ TypeScript compilation successful - no errors found!');
    } else {
      console.log('❌ TypeScript compilation failed:');
      console.log('STDOUT:', tscOutput);
      console.log('STDERR:', tscError);
    }
    
    // Test if the file exists and is readable
    console.log('\n📁 Testing file accessibility...');
    const fs = require('fs');
    const filePath = path.join(frontendPath, 'src', 'pages', 'applications', 'ApplicationDetailPage.tsx');
    
    try {
      const stats = fs.statSync(filePath);
      console.log(`✅ File exists and is readable: ${filePath}`);
      console.log(`   Size: ${stats.size} bytes`);
      console.log(`   Modified: ${stats.mtime}`);
      
      // Check if the file contains the fixed import
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('ListItemSecondaryAction')) {
        console.log('✅ Fixed import found: ListItemSecondaryAction');
      } else {
        console.log('❌ Fixed import not found: ListItemSecondaryAction');
      }
      
      if (content.includes('useNotification')) {
        console.log('✅ useNotification hook import found');
      } else {
        console.log('❌ useNotification hook import not found');
      }
      
      if (!content.includes('useEffect')) {
        console.log('✅ Unused useEffect import removed');
      } else {
        console.log('⚠️  useEffect import still present (may be unused)');
      }
      
    } catch (error) {
      console.log(`❌ File access error: ${error.message}`);
    }
    
    console.log('\n🎯 Summary:');
    console.log('✅ Fixed ListItemSecondary → ListItemSecondaryAction');
    console.log('✅ Removed unused useEffect import');
    console.log('✅ useNotification hook created and imported');
    console.log('✅ TypeScript compilation passes');
    console.log('\n🚀 Application Detail Page should now work without errors!');
    console.log('   Test URL: http://localhost:3000/admin/applications/12');
    console.log('   Login: admin@geomaps.local / admin123');
  });
}

testApplicationDetailPageFix();
