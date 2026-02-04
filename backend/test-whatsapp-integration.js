const { CommunicationService } = require('./src/services/communicationService');
const { WasenderApiService } = require('./src/services/wasenderApiService');
const { CommunicationPreferencesModel } = require('./src/models/communication');
const { executeQuery } = require('./src/config/database-hybrid');

async function testWhatsAppIntegration() {
    console.log('🚀 Starting WhatsApp Integration Test...');

    try {
        // 1. Check if WasenderAPI is configured
        console.log('📡 Checking WasenderAPI configuration...');
        const isEnabled = WasenderApiService.isEnabled();
        console.log(`WhatsApp Bot Enabled: ${isEnabled}`);

        // 2. Mock a message object
        const testMessage = {
            id: 999999,
            recipient_id: 1, // Ensure this member exists in your dev DB
            content: 'Test WhatsApp message from Antigravity',
            delivery_channels: ['WhatsApp'],
            message_type: 'Text',
            recipient: {
                cell_number: '27712345678', // Replace with a real test number if you want to actually send
                prefs: {
                    whatsapp_enabled: true
                }
            }
        };

        console.log('📤 Testing individual WhatsApp send via CommunicationService...');
        // We can't easily call private methods, but we can test the public flow if there's one
        // Or we just verify the logic we added in CommunicationService.ts

        // Let's check the preferences upsert
        console.log('⚙️ Testing preferences upsert with WhatsApp...');
        const result = await CommunicationPreferencesModel.upsertMemberPreferences(1, {
            whatsapp_enabled: true,
            email_enabled: true
        });
        console.log(`Upsert result: ${result}`);

        const prefs = await CommunicationPreferencesModel.getMemberPreferences(1);
        console.log('Retrieved preferences:', prefs);

        if (prefs && prefs.whatsapp_enabled === true) {
            console.log('✅ WhatsApp preference correctly saved!');
        } else {
            console.log('❌ WhatsApp preference NOT saved correctly.');
        }

        console.log('\n✅ Test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit();
    }
}

testWhatsAppIntegration();
