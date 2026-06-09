
import { executeQuery, initializeDatabase } from './src/config/database-hybrid';
async function inspectSchema() {
    try {
        await initializeDatabase();
        const cols = await executeQuery("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sms_send_log'");
        console.log(JSON.stringify(cols, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
inspectSchema();
