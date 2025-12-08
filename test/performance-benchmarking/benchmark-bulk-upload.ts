/**
 * Performance Benchmarking for Bulk Upload System
 * 
 * Measures processing time, memory usage, and throughput for various file sizes
 */

import { performance } from 'perf_hooks';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { BulkUploadOrchestrator } from '../../backend/src/services/bulk-upload/bulkUploadOrchestrator';

interface BenchmarkResult {
  testName: string;
  recordCount: number;
  processingTimeMs: number;
  processingTimeSec: number;
  recordsPerSecond: number;
  memoryUsedMB: number;
  peakMemoryMB: number;
  success: boolean;
  errors: number;
}

class BulkUploadBenchmark {
  private resultsDir: string;
  private testDataDir: string;

  constructor() {
    this.resultsDir = path.join(__dirname, 'results');
    this.testDataDir = path.join(__dirname, 'test-data');

    // Create directories if they don't exist
    [this.resultsDir, this.testDataDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get current memory usage in MB
   */
  getMemoryUsageMB(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  }

  /**
   * Run benchmark for a specific file
   */
  async runBenchmark(testFile: string, recordCount: number): Promise<BenchmarkResult> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Benchmarking: ${testFile} (${recordCount} records)`);
    console.log('='.repeat(80));

    const filePath = path.join(this.testDataDir, testFile);
    const reportPath = path.join(this.resultsDir, `benchmark-report-${Date.now()}.xlsx`);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = this.getMemoryUsageMB();
    let peakMemory = initialMemory;

    // Monitor memory during processing
    const memoryMonitor = setInterval(() => {
      const currentMemory = this.getMemoryUsageMB();
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }, 100); // Check every 100ms

    // Start benchmark
    const startTime = performance.now();

    try {
      const result = await BulkUploadOrchestrator.processFile(filePath, reportPath);

      const endTime = performance.now();
      clearInterval(memoryMonitor);

      const processingTimeMs = Math.round(endTime - startTime);
      const processingTimeSec = Math.round(processingTimeMs / 1000 * 100) / 100;
      const recordsPerSecond = Math.round(recordCount / processingTimeSec * 100) / 100;
      const memoryUsed = this.getMemoryUsageMB() - initialMemory;

      const benchmarkResult: BenchmarkResult = {
        testName: testFile,
        recordCount,
        processingTimeMs,
        processingTimeSec,
        recordsPerSecond,
        memoryUsedMB: Math.round(memoryUsed * 100) / 100,
        peakMemoryMB: Math.round(peakMemory * 100) / 100,
        success: result.success,
        errors: result.summary.invalidIds + result.summary.duplicates + result.summary.failed
      };

      this.printBenchmarkResult(benchmarkResult);
      return benchmarkResult;

    } catch (error: any) {
      clearInterval(memoryMonitor);
      console.error('❌ Benchmark failed:', error.message);

      return {
        testName: testFile,
        recordCount,
        processingTimeMs: 0,
        processingTimeSec: 0,
        recordsPerSecond: 0,
        memoryUsedMB: 0,
        peakMemoryMB: 0,
        success: false,
        errors: 0
      };
    }
  }

  /**
   * Print individual benchmark result
   */
  printBenchmarkResult(result: BenchmarkResult): void {
    console.log('\n📊 Results:');
    console.log(`   Records: ${result.recordCount}`);
    console.log(`   Processing Time: ${result.processingTimeSec}s (${result.processingTimeMs}ms)`);
    console.log(`   Throughput: ${result.recordsPerSecond} records/sec`);
    console.log(`   Memory Used: ${result.memoryUsedMB} MB`);
    console.log(`   Peak Memory: ${result.peakMemoryMB} MB`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Errors: ${result.errors}`);
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 BULK UPLOAD PERFORMANCE BENCHMARKING');
    console.log('='.repeat(80));
    console.log(`System: ${os.platform()} ${os.arch()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`CPUs: ${os.cpus().length} cores`);
    console.log(`Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);
    console.log('='.repeat(80));

    const benchmarks = [
      { file: 'valid-members-100.xlsx', records: 100 },
      { file: 'valid-members-500.xlsx', records: 500 },
      { file: 'valid-members-1000.xlsx', records: 1000 },
      { file: 'valid-members-5000.xlsx', records: 5000 }
    ];

    const results: BenchmarkResult[] = [];

    for (const benchmark of benchmarks) {
      const filePath = path.join(this.testDataDir, benchmark.file);
      
      if (fs.existsSync(filePath)) {
        const result = await this.runBenchmark(benchmark.file, benchmark.records);
        results.push(result);
        
        // Wait a bit between benchmarks
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.warn(`⚠️  Test file not found: ${benchmark.file}`);
      }
    }

    // Print summary
    this.printSummary(results);

    // Save results to file
    this.saveResults(results);
  }

  /**
   * Print benchmark summary
   */
  printSummary(results: BenchmarkResult[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('='.repeat(80));

    console.log('\n| Records | Time (s) | Throughput (rec/s) | Memory (MB) | Status |');
    console.log('|---------|----------|-------------------|-------------|--------|');

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(
        `| ${result.recordCount.toString().padEnd(7)} | ` +
        `${result.processingTimeSec.toString().padEnd(8)} | ` +
        `${result.recordsPerSecond.toString().padEnd(17)} | ` +
        `${result.memoryUsedMB.toString().padEnd(11)} | ` +
        `${status.padEnd(6)} |`
      );
    }

    // Calculate averages
    const avgThroughput = results.reduce((sum, r) => sum + r.recordsPerSecond, 0) / results.length;
    const avgMemory = results.reduce((sum, r) => sum + r.memoryUsedMB, 0) / results.length;

    console.log('\n📈 Averages:');
    console.log(`   Throughput: ${Math.round(avgThroughput * 100) / 100} records/sec`);
    console.log(`   Memory: ${Math.round(avgMemory * 100) / 100} MB`);

    // Check if targets are met
    const target500 = results.find(r => r.recordCount === 500);
    if (target500) {
      const meetsTarget = target500.processingTimeSec < 60;
      console.log(`\n🎯 Target (500 records in <60s): ${meetsTarget ? '✅ MET' : '❌ NOT MET'}`);
      console.log(`   Actual: ${target500.processingTimeSec}s`);
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Save results to JSON file
   */
  saveResults(results: BenchmarkResult[]): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-results-${timestamp}.json`;
    const filepath = path.join(this.resultsDir, filename);

    const output = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024)
      },
      results
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }
}

// Run benchmarks
if (require.main === module) {
  const benchmark = new BulkUploadBenchmark();
  benchmark.runAllBenchmarks()
    .catch(error => {
      console.error('Benchmark error:', error);
      process.exit(1);
    });
}

export { BulkUploadBenchmark };

