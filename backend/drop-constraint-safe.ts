
import { executeQuery, initializeDatabase, closeDatabaseConnections } from './src/config/database-hybrid';
async function persistentDrop() {
    try {
        await initializeDatabase();
        console.log('🔄 Setting lock timeout and dropping constraint...');
        await executeQuery('SET lock_timeout = "10s"');
        await executeQuery('ALTER TABLE sms_send_log DROP CONSTRAINT IF EXISTS chk_source_type');
        console.log('✅ chk_source_type dropped successfully');
    } catch (e) {
        console.error('❌ Failed to drop constraint:', e);
    } finally {
        await closeDatabaseConnections();
    }
    process.exit(0);
}
persistentDrop();
