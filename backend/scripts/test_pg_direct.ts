import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function testQuery() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    
    console.log("Executing SELECT count...");
    const countRes = await client.query(`
      SELECT source_type, COUNT(*) 
      FROM sms_send_log 
      WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration')
      GROUP BY source_type
    `);
    console.table(countRes.rows);

    console.log("Executing SELECT rows with LIMIT...");
    const rowsRes = await client.query(`
      SELECT * 
      FROM sms_send_log 
      WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration')
      LIMIT 5
    `);
    console.log(`Returned ${rowsRes.rows.length} rows`);
    console.dir(rowsRes.rows[0]);
    
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

testQuery();
