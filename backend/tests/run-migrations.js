#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes database migrations in order
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Console logging utilities
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  step: (msg) => console.log(`🔄 ${msg}`)
};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

// Migration files in execution order
const migrationFiles = [
  '001_comprehensive_schema_migration.sql',
  '002_meeting_leadership_tables.sql',
  '003_membership_renewal_system.sql',
  '004_advanced_member_search.sql',
  '005_hierarchical_admin_permissions.sql',
  '006_document_management_system.sql',
  '007_leadership_enhancements.sql',
  '008_meeting_management_system.sql',
  '009_bulk_operations_system.sql',
  '010_advanced_security_features.sql'
];

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable(connection) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INT,
      INDEX idx_migration_name (migration_name)
    );
  `;
  
  await connection.execute(createTableSQL);
  log.success('Migrations tracking table ready');
}

/**
 * Check if migration has already been executed
 */
async function isMigrationExecuted(connection, migrationName) {
  const [rows] = await connection.execute(
    'SELECT COUNT(*) as count FROM schema_migrations WHERE migration_name = ?',
    [migrationName]
  );
  return rows[0].count > 0;
}

/**
 * Record migration execution
 */
async function recordMigration(connection, migrationName, executionTime) {
  await connection.execute(
    'INSERT INTO schema_migrations (migration_name, execution_time_ms) VALUES (?, ?)',
    [migrationName, executionTime]
  );
}

/**
 * Execute a single migration file
 */
async function executeMigration(connection, migrationFile) {
  const migrationPath = path.join(__dirname, 'migrations', migrationFile);
  
  try {
    // Check if migration already executed
    if (await isMigrationExecuted(connection, migrationFile)) {
      log.warning(`Migration ${migrationFile} already executed, skipping`);
      return;
    }
    
    log.step(`Executing migration: ${migrationFile}`);
    
    // Read migration file
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute migration with timing
    const startTime = Date.now();
    await connection.query(migrationSQL);
    const executionTime = Date.now() - startTime;
    
    // Record successful execution
    await recordMigration(connection, migrationFile, executionTime);
    
    log.success(`Migration ${migrationFile} completed in ${executionTime}ms`);
    
  } catch (error) {
    log.error(`Failed to execute migration ${migrationFile}:`);
    console.error(error.message);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  let connection;
  
  try {
    log.info('Starting database migrations...');
    log.info(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    log.success('Database connection established');
    
    // Create migrations tracking table
    await createMigrationsTable(connection);
    
    // Execute migrations in order
    for (const migrationFile of migrationFiles) {
      await executeMigration(connection, migrationFile);
    }
    
    // Get migration status
    const [migrations] = await connection.execute(
      'SELECT migration_name, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at'
    );
    
    log.success('All migrations completed successfully!');
    log.info('\nMigration History:');
    migrations.forEach(migration => {
      console.log(`  ✅ ${migration.migration_name} (${migration.execution_time_ms}ms) - ${migration.executed_at}`);
    });
    
  } catch (error) {
    log.error('Migration failed:');
    console.error(error);
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      log.info('Database connection closed');
    }
  }
}

/**
 * Show migration status without executing
 */
async function showMigrationStatus() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Check if migrations table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'schema_migrations'"
    );
    
    if (tables.length === 0) {
      log.info('No migrations have been executed yet');
      return;
    }
    
    // Get executed migrations
    const [executed] = await connection.execute(
      'SELECT migration_name, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at'
    );
    
    log.info('Migration Status:');
    
    migrationFiles.forEach(file => {
      const migration = executed.find(m => m.migration_name === file);
      if (migration) {
        console.log(`  ✅ ${file} - Executed at ${migration.executed_at} (${migration.execution_time_ms}ms)`);
      } else {
        console.log(`  ⏳ ${file} - Pending`);
      }
    });
    
  } catch (error) {
    log.error('Failed to check migration status:');
    console.error(error);
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'status':
    showMigrationStatus();
    break;
  case 'run':
  default:
    runMigrations();
    break;
}
