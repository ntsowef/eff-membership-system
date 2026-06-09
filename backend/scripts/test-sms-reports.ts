import { SMSReportService } from '../src/services/smsReportService';
import { executeQuery, initializeDatabase } from '../src/config/database-hybrid';

async function testSMSReports() {
    console.log('Testing SMS Reports Data Retrieval...\n');

    try {
        await initializeDatabase();

        console.log('1. Testing getMessagesReport (All)');
        const messages = await SMSReportService.getMessagesReport({ limit: 5 });
        console.log(`Successfully fetched ${messages.messages.length} messages.`);
        console.log(`Total count reported: ${messages.pagination.totalCount}\n`);

        console.log('2. Testing getReportSummary');
        const summary = await SMSReportService.getReportSummary({});
        console.log('Summary Totals:', summary.totals);
        console.log('Summary By Category:', summary.byCategory);
        console.log('\n');

        console.log('3. Testing getDuplicateNumbersReport');
        const duplicates = await SMSReportService.getDuplicateNumbersReport({ limit: 5 });
        console.log(`Found ${duplicates.duplicates.length} duplicate groups in this page.`);
        console.log(`Stats - Unique duplicate numbers: ${duplicates.stats.uniqueDuplicateNumbers}`);
        console.log(`Stats - Affected members: ${duplicates.stats.totalAffectedMembers}`);
        console.log(`Stats - Estimated skipped: ${duplicates.stats.estimatedMessagesSkipped}\n`);

        console.log('4. Testing CSV Export Generation');
        const csv = await SMSReportService.generateCsvExport({ limit: 5 });
        const lines = csv.split('\n');
        console.log(`Generated CSV with ${lines.length} lines (including header).`);
        console.log('First line:', lines[0]);
        console.log('Second line:', lines[1] || 'None');

        console.log('\n✅ All SMS Report Service methods completed successfully.');
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

testSMSReports();
