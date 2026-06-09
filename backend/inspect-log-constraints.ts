
import { executeQuery, initializeDatabase } from './src/config/database-hybrid';
async function inspectConstraints() {
    try {
        await initializeDatabase();
        const results = await executeQuery(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE conrelid = 'sms_send_log'::regclass
        `);
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
inspectConstraints();
