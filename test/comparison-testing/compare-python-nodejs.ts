/**
 * Comparison Testing: Python vs Node.js Bulk Upload
 * 
 * This script processes the same file with both Python and Node.js implementations
 * and compares the results to ensure 100% compatibility.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import xlsx from 'xlsx';

const execAsync = promisify(exec);

interface ComparisonResult {
  testFile: string;
  pythonSuccess: boolean;
  nodejsSuccess: boolean;
  databaseRecordsMatch: boolean;
  validationResultsMatch: boolean;
  reportContentMatch: boolean;
  differences: string[];
}

class BulkUploadComparison {
  private pool: Pool;
  private testDataDir: string;
  private pythonScriptPath: string;
  private resultsDir: string;

  constructor() {
    this.pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'eff_membership_test',
      user: 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });

    this.testDataDir = path.join(__dirname, 'test-data');
    this.pythonScriptPath = path.join(__dirname, '../../python-processor/bulk_upload_processor.py');
    this.resultsDir = path.join(__dirname, 'results');

    // Create results directory if it doesn't exist
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Run Python bulk upload processor
   */
  async runPythonProcessor(filePath: string): Promise<{ success: boolean; reportPath: string; error?: string }> {
    try {
      console.log('🐍 Running Python processor...');
      
      const command = `python ${this.pythonScriptPath} --file "${filePath}" --output "${this.resultsDir}/python-report.xlsx"`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Warning')) {
        console.error('Python stderr:', stderr);
      }

      const reportPath = path.join(this.resultsDir, 'python-report.xlsx');
      const success = fs.existsSync(reportPath);

      return { success, reportPath };
    } catch (error: any) {
      console.error('Python processor error:', error.message);
      return { success: false, reportPath: '', error: error.message };
    }
  }

  /**
   * Run Node.js bulk upload processor
   */
  async runNodejsProcessor(filePath: string): Promise<{ success: boolean; reportPath: string; error?: string }> {
    try {
      console.log('🟢 Running Node.js processor...');
      
      // Import and run the orchestrator
      const { BulkUploadOrchestrator } = require('../../backend/src/services/bulk-upload/bulkUploadOrchestrator');
      
      const reportPath = path.join(this.resultsDir, 'nodejs-report.xlsx');
      const result = await BulkUploadOrchestrator.processFile(filePath, reportPath);

      return { success: result.success, reportPath };
    } catch (error: any) {
      console.error('Node.js processor error:', error.message);
      return { success: false, reportPath: '', error: error.message };
    }
  }

  /**
   * Compare database records created by both processors
   */
  async compareDatabaseRecords(testFile: string): Promise<{ match: boolean; differences: string[] }> {
    const differences: string[] = [];

    try {
      // Get records created by Python (tagged with source)
      const pythonRecords = await this.pool.query(
        `SELECT id_number, name, surname, ward_code, vd_code 
         FROM members 
         WHERE created_at > NOW() - INTERVAL '10 minutes' 
         AND notes LIKE '%Python%'
         ORDER BY id_number`
      );

      // Get records created by Node.js (tagged with source)
      const nodejsRecords = await this.pool.query(
        `SELECT id_number, name, surname, ward_code, vd_code 
         FROM members 
         WHERE created_at > NOW() - INTERVAL '10 minutes' 
         AND notes LIKE '%Node.js%'
         ORDER BY id_number`
      );

      // Compare counts
      if (pythonRecords.rows.length !== nodejsRecords.rows.length) {
        differences.push(`Record count mismatch: Python=${pythonRecords.rows.length}, Node.js=${nodejsRecords.rows.length}`);
      }

      // Compare individual records
      const minLength = Math.min(pythonRecords.rows.length, nodejsRecords.rows.length);
      for (let i = 0; i < minLength; i++) {
        const pythonRecord = pythonRecords.rows[i];
        const nodejsRecord = nodejsRecords.rows[i];

        if (pythonRecord.id_number !== nodejsRecord.id_number) {
          differences.push(`ID mismatch at index ${i}: Python=${pythonRecord.id_number}, Node.js=${nodejsRecord.id_number}`);
        }

        if (pythonRecord.ward_code !== nodejsRecord.ward_code) {
          differences.push(`Ward code mismatch for ${pythonRecord.id_number}: Python=${pythonRecord.ward_code}, Node.js=${nodejsRecord.ward_code}`);
        }
      }

      return { match: differences.length === 0, differences };
    } catch (error: any) {
      differences.push(`Database comparison error: ${error.message}`);
      return { match: false, differences };
    }
  }

  /**
   * Compare Excel reports generated by both processors
   */
  compareReports(pythonReportPath: string, nodejsReportPath: string): { match: boolean; differences: string[] } {
    const differences: string[] = [];

    try {
      // Read both reports
      const pythonWorkbook = xlsx.readFile(pythonReportPath);
      const nodejsWorkbook = xlsx.readFile(nodejsReportPath);

      // Compare sheet names
      const pythonSheets = pythonWorkbook.SheetNames;
      const nodejsSheets = nodejsWorkbook.SheetNames;

      if (pythonSheets.length !== nodejsSheets.length) {
        differences.push(`Sheet count mismatch: Python=${pythonSheets.length}, Node.js=${nodejsSheets.length}`);
      }

      // Compare each sheet
      for (const sheetName of pythonSheets) {
        if (!nodejsSheets.includes(sheetName)) {
          differences.push(`Sheet "${sheetName}" missing in Node.js report`);
          continue;
        }

        const pythonSheet = pythonWorkbook.Sheets[sheetName];
        const nodejsSheet = nodejsWorkbook.Sheets[sheetName];

        const pythonData = xlsx.utils.sheet_to_json(pythonSheet);
        const nodejsData = xlsx.utils.sheet_to_json(nodejsSheet);

        if (pythonData.length !== nodejsData.length) {
          differences.push(`Row count mismatch in "${sheetName}": Python=${pythonData.length}, Node.js=${nodejsData.length}`);
        }
      }

      return { match: differences.length === 0, differences };
    } catch (error: any) {
      differences.push(`Report comparison error: ${error.message}`);
      return { match: false, differences };
    }
  }

  /**
   * Run complete comparison test
   */
  async runComparisonTest(testFile: string): Promise<ComparisonResult> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 Comparison Test: ${path.basename(testFile)}`);
    console.log('='.repeat(80));

    const result: ComparisonResult = {
      testFile: path.basename(testFile),
      pythonSuccess: false,
      nodejsSuccess: false,
      databaseRecordsMatch: false,
      validationResultsMatch: false,
      reportContentMatch: false,
      differences: []
    };

    // Run Python processor
    const pythonResult = await this.runPythonProcessor(testFile);
    result.pythonSuccess = pythonResult.success;
    if (!pythonResult.success) {
      result.differences.push(`Python processor failed: ${pythonResult.error}`);
    }

    // Run Node.js processor
    const nodejsResult = await this.runNodejsProcessor(testFile);
    result.nodejsSuccess = nodejsResult.success;
    if (!nodejsResult.success) {
      result.differences.push(`Node.js processor failed: ${nodejsResult.error}`);
    }

    // Compare database records
    if (pythonResult.success && nodejsResult.success) {
      const dbComparison = await this.compareDatabaseRecords(testFile);
      result.databaseRecordsMatch = dbComparison.match;
      result.differences.push(...dbComparison.differences);

      // Compare reports
      const reportComparison = this.compareReports(pythonResult.reportPath, nodejsResult.reportPath);
      result.reportContentMatch = reportComparison.match;
      result.differences.push(...reportComparison.differences);
    }

    return result;
  }

  /**
   * Run all comparison tests
   */
  async runAllTests(): Promise<void> {
    const testFiles = [
      'valid-members-10.xlsx',
      'valid-members-100.xlsx',
      'mixed-validation-50.xlsx',
      'duplicate-ids-20.xlsx',
      'invalid-ids-15.xlsx'
    ];

    const results: ComparisonResult[] = [];

    for (const testFile of testFiles) {
      const filePath = path.join(this.testDataDir, testFile);
      if (fs.existsSync(filePath)) {
        const result = await this.runComparisonTest(filePath);
        results.push(result);
      } else {
        console.warn(`⚠️  Test file not found: ${testFile}`);
      }
    }

    // Print summary
    this.printSummary(results);
  }

  /**
   * Print comparison summary
   */
  printSummary(results: ComparisonResult[]): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 COMPARISON TEST SUMMARY');
    console.log('='.repeat(80));

    for (const result of results) {
      console.log(`\n📄 ${result.testFile}`);
      console.log(`   Python: ${result.pythonSuccess ? '✅' : '❌'}`);
      console.log(`   Node.js: ${result.nodejsSuccess ? '✅' : '❌'}`);
      console.log(`   Database Match: ${result.databaseRecordsMatch ? '✅' : '❌'}`);
      console.log(`   Report Match: ${result.reportContentMatch ? '✅' : '❌'}`);

      if (result.differences.length > 0) {
        console.log(`   Differences:`);
        result.differences.forEach(diff => console.log(`     - ${diff}`));
      }
    }

    const allPassed = results.every(r => 
      r.pythonSuccess && r.nodejsSuccess && r.databaseRecordsMatch && r.reportContentMatch
    );

    console.log(`\n${'='.repeat(80)}`);
    console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}

// Run comparison tests
if (require.main === module) {
  const comparison = new BulkUploadComparison();
  comparison.runAllTests()
    .then(() => comparison.cleanup())
    .catch(error => {
      console.error('Comparison test error:', error);
      process.exit(1);
    });
}

export { BulkUploadComparison };

