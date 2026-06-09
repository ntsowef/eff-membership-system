/**
 * Standalone script: Generate Voting District Members Report
 *
 * Uses the streaming ExcelJS writer — rows are flushed to disk as they are
 * written so heap usage stays low even for 100 000+ members.
 *
 * Usage (from the backend/ folder):
 *
 *   npx ts-node scripts/generate-vd-report.ts
 *   npx ts-node scripts/generate-vd-report.ts ./reports/my-report.xlsx
 *
 * If you still run out of memory on an extremely large dataset:
 *
 *   node --max-old-space-size=4096 -r ts-node/register scripts/generate-vd-report.ts
 */

import * as path   from 'path';
import * as fs     from 'fs';
import * as dotenv from 'dotenv';

// Load .env before importing anything that reads process.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { initializeDatabase } from '../src/config/database';
import { VotingDistrictReportService } from '../src/services/votingDistrictReportService';

// ---------------------------------------------------------------------------

const outputArg  = process.argv[2];
const dateStamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outputFile = outputArg
    ? path.resolve(outputArg)
    : path.resolve(__dirname, '..', `VD_Members_Report_${dateStamp}.xlsx`);

// ---------------------------------------------------------------------------

function line(char = '-', len = 62) {
    return char.repeat(len);
}

function elapsed(startMs: number): string {
    const s = (Date.now() - startMs) / 1000;
    return s < 60
        ? `${s.toFixed(1)}s`
        : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

function fileSize(filePath: string): string {
    try {
        const bytes = fs.statSync(filePath).size;
        if (bytes < 1024)        return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    } catch {
        return '?';
    }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    console.log('');
    console.log(line('='));
    console.log('  Voting District Members Report  —  Generator');
    console.log(line('='));
    console.log(`  Output  : ${outputFile}`);
    console.log(`  Started : ${new Date().toLocaleString('en-ZA')}`);
    console.log(line());
    console.log('');

    // 1. Database
    process.stdout.write('  [1/3] Connecting to database ... ');
    await initializeDatabase();
    console.log('OK');
    console.log('');

    // 2. Generate (streaming)
    console.log('  [2/3] Generating report:');
    const genStart = Date.now();

    const stats = await VotingDistrictReportService.generateToFile(
        outputFile,
        (msg: string) => console.log(`          ${msg}`),
    );

    console.log('');
    console.log(`         Completed in ${elapsed(genStart)}`);
    console.log('');

    // 3. Verify file
    process.stdout.write('  [3/3] Verifying output file ... ');
    if (!fs.existsSync(outputFile)) {
        throw new Error('Output file was not created');
    }
    console.log(`OK  (${fileSize(outputFile)})`);

    console.log('');
    console.log(line('='));
    console.log('  ✅  Report saved to:');
    console.log(`      ${outputFile}`);
    console.log('');
    console.log(`      Voting Districts : ${stats.totalVDs.toLocaleString()}`);
    console.log(`      Total Members    : ${stats.totalMembers.toLocaleString()}`);
    console.log(line('='));
    console.log('');

    process.exit(0);
}

main().catch(err => {
    console.error('');
    console.error(line('='));
    console.error('  ❌  Report generation failed');
    console.error(line());
    console.error('  ' + (err instanceof Error ? err.message : String(err)));
    console.error(line('='));
    console.error('');
    process.exit(1);
});
