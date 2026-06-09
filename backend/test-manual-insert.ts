
import { executeQuery, initializeDatabase, closeDatabaseConnections } from './src/config/database-hybrid';
async function testInsert() {
    try {
        await initializeDatabase();
        const trackingId = `test_otp_${Date.now()}`;
        console.log(`🔄 Attempting manual insert for ${trackingId}...`);
        
        await executeQuery(`
            INSERT INTO sms_send_log (
                message_id, provider_message_id, source_type, source_reference_id,
                recipient_phone, recipient_name, recipient_member_id,
                message_content, message_length, sender_id, sender_name,
                status, error_code, error_message, cost, provider_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
            trackingId,
            null,
            'otp',
            '8633',
            '27123456789',
            null,
            null,
            'Test OTP message',
            15,
            null,
            null,
            'sending',
            null,
            null,
            0,
            'JSON Applink'
        ]);
        console.log('✅ Manual insert successful');
    } catch (e) {
        console.error('❌ Manual insert failed:', e);
    } finally {
        await closeDatabaseConnections();
    }
    process.exit(0);
}
testInsert();
