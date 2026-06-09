import { executeQuery } from '../src/config/database';
import { initializeDatabase } from '../src/config/database-hybrid';
import { logger } from '../src/utils/logger';

async function backfillQuickSend() {
  try {
    await initializeDatabase();
    
    const querySelect = `
      SELECT *
      FROM sms_send_log
      WHERE source_type = 'quick_send'
        AND message_id NOT IN (
          SELECT provider_message_id FROM sms_messages WHERE category = 'Quick Send' AND provider_message_id IS NOT NULL
        )
    `;
    
    const logsToBackfill = await executeQuery(querySelect, []);
    logger.info(`Found ${logsToBackfill.length} quick send logs to backfill`);

    for (const log of logsToBackfill) {
      let mappedStatus = 'Pending';
      const rawStatus = (log.status || '').toLowerCase();
      if (['sent', 'delivered'].includes(rawStatus)) mappedStatus = 'Sent';
      else if (['failed'].includes(rawStatus)) mappedStatus = 'Failed';

      const insertQuery = `
        INSERT INTO sms_messages (
          message_text, recipient_number, recipient_name, 
          status, cost_per_message, provider_message_id, error_message, sent_at, category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await executeQuery(insertQuery, [
        log.message_content,
        log.recipient_phone,
        log.recipient_name || null,
        mappedStatus,
        log.cost || 0.05,
        log.message_id,
        log.error_message || null,
        log.created_at || new Date().toISOString(),
        'Quick Send'
      ]);
    }
    
    logger.info(`Successfully backfilled ${logsToBackfill.length} records.`);
  } catch (err: any) {
    logger.error('Error backfilling', { error: err.message });
  } finally {
    process.exit(0);
  }
}

backfillQuickSend();
