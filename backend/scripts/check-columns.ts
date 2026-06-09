import { executeQuery, initializeDatabase, closeDatabasePool } from '../src/config/database';

async function checkColumns() {
    try {
        await initializeDatabase();
        const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sms_campaigns' 
      AND column_name IN ('message_content', 'send_rate_limit', 'retry_failed', 'max_retries');
    `;
        const res = await executeQuery(query);
        console.log('COLUMNS_FOUND:');
        console.log(JSON.stringify(res, null, 2));
        await closeDatabasePool();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkColumns();
