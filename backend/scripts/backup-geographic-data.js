/**
 * Geographic Data Backup Script
 * 
 * Creates comprehensive backups of all geographic tables before applying
 * the data integrity fixes. This ensures we can rollback if needed.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '_').split('T')[0].replace(/-/g, '_');

async function ensureBackupDirectory() {
  try {
    await fs.access(BACKUP_DIR);
  } catch (error) {
    console.log('📁 Creating backup directory...');
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function createTableBackup(tableName) {
  console.log(`💾 Backing up ${tableName} table...`);
  
  try {
    const backupTableName = `${tableName}_backup_${TIMESTAMP}`;

    // Create backup table
    await pool.query(`
      CREATE TABLE "${backupTableName}" AS
      SELECT * FROM ${tableName}
    `);
    
    // Get row count
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${backupTableName}"`);
    const rowCount = countResult.rows[0].count;
    
    console.log(`   ✅ Created ${backupTableName} with ${rowCount} rows`);
    
    return {
      originalTable: tableName,
      backupTable: backupTableName,
      rowCount: parseInt(rowCount),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to backup ${tableName}:`, error.message);
    throw error;
  }
}

async function exportTableToSQL(tableName, backupInfo) {
  console.log(`📄 Exporting ${tableName} to SQL file...`);
  
  try {
    const fileName = `${tableName}_backup_${TIMESTAMP}.sql`;
    const filePath = path.join(BACKUP_DIR, fileName);
    
    // Get table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    // Get table data
    const dataResult = await pool.query(`SELECT * FROM ${tableName} ORDER BY 1`);
    
    let sqlContent = `-- Backup of ${tableName} table\n`;
    sqlContent += `-- Created: ${new Date().toISOString()}\n`;
    sqlContent += `-- Rows: ${backupInfo.rowCount}\n\n`;
    
    // Add table structure comment
    sqlContent += `-- Table Structure:\n`;
    structureResult.rows.forEach(col => {
      sqlContent += `-- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}\n`;
    });
    sqlContent += `\n`;
    
    // Add data
    if (dataResult.rows.length > 0) {
      const columns = Object.keys(dataResult.rows[0]);
      sqlContent += `-- Data Export\n`;
      sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`;
      
      const values = dataResult.rows.map(row => {
        const rowValues = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (value instanceof Date) return `'${value.toISOString()}'`;
          return value;
        });
        return `(${rowValues.join(', ')})`;
      });
      
      sqlContent += values.join(',\n');
      sqlContent += ';\n';
    }
    
    await fs.writeFile(filePath, sqlContent, 'utf8');
    
    console.log(`   ✅ Exported to ${fileName}`);
    
    return {
      fileName,
      filePath,
      fileSize: (await fs.stat(filePath)).size
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to export ${tableName}:`, error.message);
    throw error;
  }
}

async function createRestoreScript(backupInfo) {
  console.log('📜 Creating restore script...');
  
  try {
    const restoreScriptPath = path.join(BACKUP_DIR, `restore_geographic_data_${TIMESTAMP}.sql`);
    
    let restoreScript = `-- Geographic Data Restore Script\n`;
    restoreScript += `-- Created: ${new Date().toISOString()}\n`;
    restoreScript += `-- Use this script to restore geographic data if needed\n\n`;
    
    restoreScript += `-- WARNING: This will overwrite current data!\n`;
    restoreScript += `-- Make sure you understand the implications before running\n\n`;
    
    restoreScript += `BEGIN;\n\n`;
    
    // Add restore commands for each table
    backupInfo.forEach(backup => {
      restoreScript += `-- Restore ${backup.originalTable}\n`;
      restoreScript += `DELETE FROM ${backup.originalTable};\n`;
      restoreScript += `INSERT INTO ${backup.originalTable} SELECT * FROM "${backup.backupTable}";\n\n`;
    });
    
    restoreScript += `COMMIT;\n\n`;
    restoreScript += `-- Restore completed\n`;
    
    await fs.writeFile(restoreScriptPath, restoreScript, 'utf8');
    
    console.log(`   ✅ Created restore script: restore_geographic_data_${TIMESTAMP}.sql`);
    
    return restoreScriptPath;
    
  } catch (error) {
    console.error('   ❌ Failed to create restore script:', error.message);
    throw error;
  }
}

async function validateBackups(backupInfo) {
  console.log('🔍 Validating backups...');
  
  try {
    for (const backup of backupInfo) {
      // Check backup table exists and has correct row count
      const checkResult = await pool.query(`
        SELECT COUNT(*) as count FROM "${backup.backupTable}"
      `);
      
      const backupRowCount = parseInt(checkResult.rows[0].count);
      
      if (backupRowCount !== backup.rowCount) {
        throw new Error(`Backup validation failed for ${backup.originalTable}: expected ${backup.rowCount} rows, got ${backupRowCount}`);
      }
      
      console.log(`   ✅ ${backup.backupTable}: ${backupRowCount} rows`);
    }
    
    console.log('   ✅ All backups validated successfully');
    return true;
    
  } catch (error) {
    console.error('   ❌ Backup validation failed:', error.message);
    throw error;
  }
}

async function generateBackupReport(backupInfo, sqlExports, restoreScriptPath) {
  console.log('📋 Generating backup report...');
  
  try {
    const reportPath = path.join(BACKUP_DIR, `backup_report_${TIMESTAMP}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      backupDate: TIMESTAMP,
      database: process.env.DB_NAME,
      tables: backupInfo.map(backup => ({
        originalTable: backup.originalTable,
        backupTable: backup.backupTable,
        rowCount: backup.rowCount,
        timestamp: backup.timestamp
      })),
      sqlExports: sqlExports.map(exp => ({
        fileName: exp.fileName,
        filePath: exp.filePath,
        fileSize: exp.fileSize
      })),
      restoreScript: restoreScriptPath,
      totalTables: backupInfo.length,
      totalRows: backupInfo.reduce((sum, backup) => sum + backup.rowCount, 0),
      instructions: {
        restore: `To restore data, run: psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${path.basename(restoreScriptPath)}`,
        cleanup: `To remove backup tables, drop each backup table manually: DROP TABLE table_name_backup_${TIMESTAMP};`
      }
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log(`   ✅ Backup report saved: backup_report_${TIMESTAMP}.json`);
    
    // Display summary
    console.log('\n📊 Backup Summary:');
    console.log(`   Tables backed up: ${report.totalTables}`);
    console.log(`   Total rows: ${report.totalRows}`);
    console.log(`   SQL exports: ${report.sqlExports.length}`);
    console.log(`   Restore script: ${path.basename(restoreScriptPath)}`);
    
    return report;
    
  } catch (error) {
    console.error('   ❌ Failed to generate backup report:', error.message);
    throw error;
  }
}

async function main() {
  console.log('💾 Geographic Data Backup Script');
  console.log('================================\n');
  
  const tablesToBackup = ['provinces', 'districts', 'municipalities', 'wards', 'voting_districts'];
  
  try {
    // Ensure backup directory exists
    await ensureBackupDirectory();
    
    // Create table backups
    const backupInfo = [];
    for (const tableName of tablesToBackup) {
      const backup = await createTableBackup(tableName);
      backupInfo.push(backup);
    }
    
    // Export tables to SQL files
    const sqlExports = [];
    for (let i = 0; i < tablesToBackup.length; i++) {
      const sqlExport = await exportTableToSQL(tablesToBackup[i], backupInfo[i]);
      sqlExports.push(sqlExport);
    }
    
    // Create restore script
    const restoreScriptPath = await createRestoreScript(backupInfo);
    
    // Validate backups
    await validateBackups(backupInfo);
    
    // Generate backup report
    const report = await generateBackupReport(backupInfo, sqlExports, restoreScriptPath);
    
    console.log('\n🎉 Backup Process Completed Successfully!');
    console.log('========================================');
    console.log(`✅ ${backupInfo.length} tables backed up`);
    console.log(`✅ ${sqlExports.length} SQL export files created`);
    console.log(`✅ Restore script created`);
    console.log(`✅ All backups validated`);
    console.log(`\n📁 Backup location: ${BACKUP_DIR}`);
    console.log(`📋 Report file: backup_report_${TIMESTAMP}.json`);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Review the backup report');
    console.log('2. Run the geographic data integrity fix script');
    console.log('3. Test the results');
    console.log('4. If needed, use the restore script to rollback');
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR during backup:', error);
    console.log('\n⚠️  Backup process failed - do not proceed with data fixes!');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the backup script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createTableBackup,
  exportTableToSQL,
  createRestoreScript,
  validateBackups,
  generateBackupReport
};
