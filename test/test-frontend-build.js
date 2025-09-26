const { spawn } = require('child_process');
const path = require('path');

async function testFrontendBuild() {
  console.log('🔍 Testing frontend build and start...');
  
  const frontendPath = path.join(__dirname, '..', 'frontend');
  console.log(`Frontend path: ${frontendPath}`);
  
  // Test if npm is available
  console.log('\n📦 Checking npm availability...');
  const npmCheck = spawn('npm', ['--version'], { cwd: frontendPath, shell: true });
  
  npmCheck.stdout.on('data', (data) => {
    console.log(`✅ npm version: ${data.toString().trim()}`);
  });
  
  npmCheck.stderr.on('data', (data) => {
    console.error(`❌ npm error: ${data.toString()}`);
  });
  
  npmCheck.on('close', (code) => {
    if (code === 0) {
      console.log('✅ npm is available');
      
      // Try to start the dev server
      console.log('\n🚀 Starting frontend dev server...');
      const devServer = spawn('npm', ['run', 'dev'], { 
        cwd: frontendPath, 
        shell: true,
        stdio: 'inherit'
      });
      
      devServer.on('error', (error) => {
        console.error(`❌ Failed to start dev server: ${error.message}`);
      });
      
      devServer.on('close', (code) => {
        console.log(`Dev server exited with code ${code}`);
      });
      
      // Give it some time to start
      setTimeout(() => {
        console.log('\n🌐 Frontend server should be starting...');
        console.log('   Check: http://localhost:3000');
        console.log('   Application Detail Page: http://localhost:3000/admin/applications/12');
      }, 5000);
      
    } else {
      console.log('❌ npm is not available or failed');
    }
  });
}

console.log('🚀 Starting frontend build test...');
testFrontendBuild();
