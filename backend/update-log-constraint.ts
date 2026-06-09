
import { executeQuery, initializeDatabase, closeDatabaseConnections } from './src/config/database-hybrid';
async function updateConstraint() {
    try {
        await initializeDatabase();
        console.log('🔄 Dropping old constraint...');
        await executeQuery('ALTER TABLE sms_send_log DROP CONSTRAINT IF EXISTS sms_send_log_source_type_check');
        
        console.log('🔄 Adding new constraint...');
        await executeQuery(`
            ALTER TABLE sms_send_log 
            ADD CONSTRAINT sms_send_log_source_type_check 
            CHECK (source_type::text = ANY (ARRAY[
                'quick_send', 'birthday', 'campaign', 'expiration_reminder', 
                'bulk', 'manual', 'voter_registration', 'system', 'otp'
            ]::text[]))
        `);
        console.log('✅ Constraint updated successfully');
    } catch (e) {
        console.error('❌ Failed to update constraint:', e);
    } finally {
        await closeDatabaseConnections();
    }
    process.exit(0);
}
updateConstraint();
