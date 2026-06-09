
import { OTPService } from './src/services/otpService';
import { executeQuerySingle, initializeDatabase } from './src/config/database-hybrid';

async function verifyOTPLogging() {
    console.log('Testing OTP Logging Integration...');

    try {
        await initializeDatabase();
    } catch (dbError) {
        console.error('❌ Failed to initialize database:', dbError);
        process.exit(1);
    }

    const userId = 8633; // Valid user from DB
    const phone = '27123456789';
    const userName = 'Test User';

    console.log('\n1. Generating OTP Record...');
    const otpResult = await OTPService.generateOTP(userId, phone);
    console.log(`✅ OTP Record generated: ID ${otpResult.otp_id}`);

    console.log('\n2. Sending OTP via SMS...');
    const result = await OTPService.sendOTPViaSMS(userId, otpResult.otp_id, otpResult.otp_code, phone, userName);

    if (result) {
        console.log('✅ OTP Send call successful.');
        
        console.log('\n2. Checking sms_send_log for OTP entry...');
        const logEntry = await executeQuerySingle(
            'SELECT * FROM sms_send_log WHERE source_type = $1 ORDER BY created_at DESC LIMIT 1',
            ['otp']
        ) as any;

        if (logEntry) {
            console.log('✅ Found OTP log entry:');
            console.log(`   Message ID: ${logEntry.message_id}`);
            console.log(`   Recipient: ${logEntry.recipient_phone}`);
            console.log(`   Content: ${logEntry.message_content}`);
            console.log(`   Status: ${logEntry.status}`);
        } else {
            console.log('❌ OTP log entry NOT found in sms_send_log.');
        }

        console.log('\n3. Checking sms_credit_transactions...');
        const creditEntry = await executeQuerySingle(
            'SELECT * FROM sms_credit_transactions ORDER BY created_at DESC LIMIT 1'
        ) as any;

        if (creditEntry) {
            console.log('✅ Found credit transaction:');
            console.log(`   Amount: ${creditEntry.amount}`);
            console.log(`   Description: ${creditEntry.description}`);
        } else {
            console.log('❌ Credit transaction NOT found.');
        }

    } else {
        console.log('❌ OTP Send failed.');
    }

    process.exit(0);
}

verifyOTPLogging();
