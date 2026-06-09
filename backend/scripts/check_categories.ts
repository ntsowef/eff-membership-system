import { executeQuery } from '../src/config/database';
import { initializeDatabase } from '../src/config/database-hybrid';

async function checkCategories() {
  try {
    await initializeDatabase();
    
    // Check sms_send_log source types
    console.log("sms_send_log source_types:");
    const logTypes = await executeQuery(`SELECT source_type, COUNT(*) FROM sms_send_log GROUP BY source_type`, []);
    console.table(logTypes);

    // Check sms_messages categories
    console.log("sms_messages categories:");
    const msgCategories = await executeQuery(`SELECT category, COUNT(*) FROM sms_messages GROUP BY category`, []);
    console.table(msgCategories);

  } catch (err: any) {
    console.error(err.message);
  } finally {
    process.exit(0);
  }
}
checkCategories();
