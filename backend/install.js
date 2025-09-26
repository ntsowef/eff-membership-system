#!/usr/bin/env node

/**
 * GEOMAPS Backend Installation and Setup Script
 * 
 * This script helps set up the backend server by:
 * 1. Installing dependencies
 * 2. Checking database connectivity
 * 3. Validating configuration
 * 4. Running basic tests
 * 5. Starting the server
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔧${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`)
};

// Configuration
const config = {
  nodeVersion: '16.0.0',
  npmVersion: '8.0.0',
  mysqlVersion: '8.0.0'
};

// Check if running in correct directory
function checkDirectory() {
  log.step('Checking directory structure...');
  
  const requiredFiles = ['package.json', 'tsconfig.json', 'src/app.ts'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    log.error(`Missing required files: ${missingFiles.join(', ')}`);
    log.error('Please run this script from the backend directory');
    process.exit(1);
  }
  
  log.success('Directory structure is correct');
}

// Check Node.js and npm versions
function checkVersions() {
  log.step('Checking Node.js and npm versions...');
  
  try {
    const nodeVersion = process.version;
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    
    log.info(`Node.js version: ${nodeVersion}`);
    log.info(`npm version: ${npmVersion}`);
    
    // Simple version check (could be more sophisticated)
    const nodeVersionNum = parseFloat(nodeVersion.substring(1));
    const npmVersionNum = parseFloat(npmVersion);
    
    if (nodeVersionNum < parseFloat(config.nodeVersion)) {
      log.warning(`Node.js version ${nodeVersion} is below recommended ${config.nodeVersion}`);
    }
    
    if (npmVersionNum < parseFloat(config.npmVersion)) {
      log.warning(`npm version ${npmVersion} is below recommended ${config.npmVersion}`);
    }
    
    log.success('Version check completed');
  } catch (error) {
    log.error('Failed to check versions: ' + error.message);
    process.exit(1);
  }
}

// Install dependencies
function installDependencies() {
  log.step('Installing dependencies...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log.success('Dependencies installed successfully');
  } catch (error) {
    log.error('Failed to install dependencies: ' + error.message);
    process.exit(1);
  }
}

// Check and create .env file
function setupEnvironment() {
  log.step('Setting up environment configuration...');
  
  if (!fs.existsSync('.env')) {
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
      log.success('Created .env file from .env.example');
      log.warning('Please edit .env file with your configuration before continuing');
      
      // Ask user if they want to continue
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Have you configured the .env file? (y/N): ', (answer) => {
          rl.close();
          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            log.info('Please configure .env file and run the script again');
            process.exit(0);
          }
          resolve();
        });
      });
    } else {
      log.error('.env.example file not found');
      process.exit(1);
    }
  } else {
    log.success('.env file already exists');
    return Promise.resolve();
  }
}

// Load environment variables
function loadEnvironment() {
  require('dotenv').config();
  
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    log.error('Please check your .env file');
    process.exit(1);
  }
  
  log.success('Environment variables loaded');
}

// Test database connection
async function testDatabaseConnection() {
  log.step('Testing database connection...');
  
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  };
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Test basic connectivity
    await connection.ping();
    log.success('Database connection successful');
    
    // Check if required tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const requiredTables = [
      'provinces', 'districts', 'municipalities', 'wards',
      'members', 'memberships', 'genders', 'races'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      log.warning(`Missing database tables: ${missingTables.join(', ')}`);
      log.warning('Please ensure the membership database schema is properly installed');
    } else {
      log.success('All required database tables found');
    }
    
    // Check if views exist
    const [views] = await connection.execute('SHOW FULL TABLES WHERE Table_type = "VIEW"');
    const viewNames = views.map(row => Object.values(row)[0]);
    
    const requiredViews = ['vw_member_details', 'vw_membership_details'];
    const missingViews = requiredViews.filter(view => !viewNames.includes(view));
    
    if (missingViews.length > 0) {
      log.warning(`Missing database views: ${missingViews.join(', ')}`);
      log.warning('Please ensure the membership database views are created');
    } else {
      log.success('All required database views found');
    }
    
    await connection.end();
    
  } catch (error) {
    log.error('Database connection failed: ' + error.message);
    log.error('Please check your database configuration in .env file');
    process.exit(1);
  }
}

// Build TypeScript
function buildTypeScript() {
  log.step('Building TypeScript...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log.success('TypeScript build completed');
  } catch (error) {
    log.error('TypeScript build failed: ' + error.message);
    process.exit(1);
  }
}

// Test API endpoints
async function testApiEndpoints() {
  log.step('Testing API endpoints...');
  
  // Start server in background
  const serverProcess = spawn('node', ['dist/app.js'], {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const fetch = require('node-fetch');
    const baseUrl = `http://localhost:${process.env.PORT || 5000}/api/v1`;
    
    // Test health endpoint
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      log.success('Health endpoint working');
    } else {
      log.warning('Health endpoint returned non-200 status');
    }
    
    // Test database health
    const dbHealthResponse = await fetch(`${baseUrl}/health/database`);
    if (dbHealthResponse.ok) {
      log.success('Database health endpoint working');
    } else {
      log.warning('Database health endpoint issues detected');
    }
    
    // Test geographic endpoints
    const provincesResponse = await fetch(`${baseUrl}/geographic/provinces`);
    if (provincesResponse.ok) {
      log.success('Geographic endpoints working');
    } else {
      log.warning('Geographic endpoints may have issues');
    }
    
  } catch (error) {
    log.warning('API endpoint testing failed: ' + error.message);
  } finally {
    // Kill server process
    serverProcess.kill();
  }
}

// Main installation process
async function main() {
  log.header('🚀 GEOMAPS Backend Installation & Setup');
  
  try {
    checkDirectory();
    checkVersions();
    installDependencies();
    await setupEnvironment();
    loadEnvironment();
    await testDatabaseConnection();
    buildTypeScript();
    
    // Optional API testing (requires node-fetch)
    try {
      require('node-fetch');
      await testApiEndpoints();
    } catch (error) {
      log.info('Skipping API tests (node-fetch not available)');
    }
    
    log.header('✅ Installation completed successfully!');
    log.info('You can now start the server with:');
    log.info('  npm run dev    (development mode)');
    log.info('  npm start      (production mode)');
    log.info('');
    log.info('API will be available at:');
    log.info(`  http://localhost:${process.env.PORT || 5000}/api/v1`);
    log.info('');
    log.info('Health check:');
    log.info(`  http://localhost:${process.env.PORT || 5000}/api/v1/health`);
    
  } catch (error) {
    log.error('Installation failed: ' + error.message);
    process.exit(1);
  }
}

// Run installation if script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
