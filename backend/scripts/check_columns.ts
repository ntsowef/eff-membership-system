import { executeQuery } from '../src/config/database';
import { initializeDatabase } from '../src/config/database-hybrid';

async function test() {
  try {
    await initializeDatabase();
    const res = await executeQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sms_messages'
    `, []);
    console.log(JSON.stringify(res.map((r: any) => r.column_name), null, 2));
  } catch (err: any) {
    console.error(err.message);
  } finally {
    process.exit(0);
  }
}
test();
