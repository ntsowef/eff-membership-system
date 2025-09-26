const { spawn } = require('child_process');
const path = require('path');

async function testFrontendCompilation() {
  console.log('🚀 Testing Frontend Compilation...');
  
  const frontendPath = path.join(__dirname, '..', 'frontend');
  
  return new Promise((resolve, reject) => {
    const viteProcess = spawn('npm', ['run', 'build'], {
      cwd: frontendPath,
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    viteProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
    });
    
    viteProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text);
    });
    
    viteProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend compilation successful!');
        resolve({ success: true, output, errorOutput });
      } else {
        console.log('❌ Frontend compilation failed!');
        reject({ success: false, code, output, errorOutput });
      }
    });
    
    viteProcess.on('error', (error) => {
      console.error('❌ Failed to start compilation process:', error);
      reject({ success: false, error: error.message, output, errorOutput });
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      viteProcess.kill();
      reject({ success: false, error: 'Compilation timeout', output, errorOutput });
    }, 120000);
  });
}

testFrontendCompilation()
  .then((result) => {
    console.log('\n🎉 Frontend compilation test completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Frontend compilation test failed:', error.error || error);
    if (error.errorOutput) {
      console.error('\nError output:', error.errorOutput);
    }
    process.exit(1);
  });
