import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function backfillAllCategories() {
  console.log("Starting Prisma backfill...");
  try {
    // Check sms_send_log source types
    // Map source types to category names
    const typeToCategory: Record<string, string> = {
      'quick_send': 'Quick Send',
      'birthday': 'Birthday',
      'campaign': 'Campaign',
      'expiration_reminder': 'Membership Renewal',
      'bulk': 'Campaign',
      'manual': 'General',
      'voter_registration': 'Voter Registration',
    };

    let inserted = 0;
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching batch offset ${offset}...`);
      const chunk: any[] = await prisma.$queryRawUnsafe(`
        SELECT *
        FROM sms_send_log 
        WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration')
        ORDER BY id ASC
        LIMIT $1 OFFSET $2
      `, batchSize, offset);

      if (chunk.length === 0) {
        hasMore = false;
        break;
      }
      
      const valueSets: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      for (const log of chunk) {
        let mappedStatus = 'Pending';
        const rawStatus = (log.status || '').toLowerCase();
        if (['sent', 'delivered'].includes(rawStatus)) mappedStatus = 'Sent';
        else if (['failed', 'expired'].includes(rawStatus)) mappedStatus = 'Failed';
        else if (['sending'].includes(rawStatus)) mappedStatus = 'Sending';
        
        let category = typeToCategory[log.source_type] || 'General';

        valueSets.push(`(
          $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 
          $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}
        )`);
        
        const costVal = log.cost && typeof log.cost.toNumber === 'function' ? log.cost.toNumber() : (log.cost || 0.05);

        queryParams.push(
          log.message_content,
          log.recipient_phone,
          log.recipient_name || null,
          mappedStatus,
          costVal,
          log.message_id,
          log.error_message || null,
          log.created_at || new Date(),
          category
        );
      }

      const insertQuery = `
        INSERT INTO sms_messages (
          message_text, recipient_number, recipient_name, 
          status, cost_per_message, provider_message_id, error_message, sent_at, category
        ) VALUES ${valueSets.join(', ')}
        ON CONFLICT DO NOTHING
      `;

      await prisma.$executeRawUnsafe(insertQuery, ...queryParams);
      inserted += chunk.length;
      offset += batchSize;
      console.log(`Inserted ${inserted}...`);
    }
    
    console.log(`Successfully backfilled ${inserted} records.`);
  } catch (err: any) {
    console.error('Error backfilling', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

backfillAllCategories();
