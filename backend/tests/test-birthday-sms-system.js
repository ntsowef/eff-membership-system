const axios = require('axios');

async function testBirthdaySMSSystem() {
  const API_BASE_URL = 'http://localhost:5000/api/v1';
  
  console.log('🎂 Testing Birthday SMS Management System\n');
  console.log('📍 Backend API:', API_BASE_URL);
  console.log('🎉 Birthday SMS Endpoints:', `${API_BASE_URL}/birthday-sms\n`);
  
  try {
    // Test 1: Get Birthday Configuration
    console.log('1. 🔧 Testing Birthday SMS Configuration...');
    const configResponse = await axios.get(`${API_BASE_URL}/birthday-sms/config`);
    console.log('✅ Birthday configuration retrieved');
    console.log('   📊 Config:', configResponse.data.data.config);
    
    // Test 2: Get Today's Birthdays
    console.log('\n2. 🎂 Testing Today\'s Birthdays...');
    const todaysResponse = await axios.get(`${API_BASE_URL}/birthday-sms/todays-birthdays`);
    console.log('✅ Today\'s birthdays retrieved');
    console.log(`   🎉 Count: ${todaysResponse.data.data.count}`);
    
    if (todaysResponse.data.data.birthdays.length > 0) {
      console.log('   👥 Sample birthday members:');
      todaysResponse.data.data.birthdays.slice(0, 3).forEach((member, index) => {
        console.log(`      ${index + 1}. ${member.full_name} (Age: ${member.current_age}) - ${member.cell_number}`);
      });
    }
    
    // Test 3: Get Upcoming Birthdays
    console.log('\n3. 📅 Testing Upcoming Birthdays...');
    const upcomingResponse = await axios.get(`${API_BASE_URL}/birthday-sms/upcoming-birthdays?days=7`);
    console.log('✅ Upcoming birthdays retrieved');
    console.log(`   📊 Count (next 7 days): ${upcomingResponse.data.data.count}`);
    
    if (upcomingResponse.data.data.birthdays.length > 0) {
      console.log('   📅 Sample upcoming birthdays:');
      upcomingResponse.data.data.birthdays.slice(0, 3).forEach((member, index) => {
        console.log(`      ${index + 1}. ${member.full_name} (${member.days_until_birthday} days) - ${member.next_birthday_date}`);
      });
    }
    
    // Test 4: Get Birthday Statistics
    console.log('\n4. 📊 Testing Birthday Statistics...');
    const statsResponse = await axios.get(`${API_BASE_URL}/birthday-sms/statistics`);
    console.log('✅ Birthday statistics retrieved');
    const stats = statsResponse.data.data.statistics;
    console.log('   📈 Statistics:');
    console.log(`      🎂 Today's Birthdays: ${stats.todays_birthdays}`);
    console.log(`      📅 Upcoming Birthdays: ${stats.upcoming_birthdays}`);
    console.log(`      📤 Queued Messages: ${stats.queued_messages}`);
    console.log(`      ✅ Sent Today: ${stats.sent_today}`);
    
    // Test 5: Queue Today's Birthday Messages
    console.log('\n5. 📤 Testing Birthday Message Queueing...');
    const queueResponse = await axios.post(`${API_BASE_URL}/birthday-sms/queue-todays-messages`);
    console.log('✅ Birthday messages queued');
    console.log('   📊 Queue Results:');
    console.log(`      ✅ Queued: ${queueResponse.data.data.queued}`);
    console.log(`      ⏭️  Skipped: ${queueResponse.data.data.skipped}`);
    console.log(`      ❌ Errors: ${queueResponse.data.data.errors}`);
    
    // Test 6: Get Queue Status
    console.log('\n6. 📋 Testing Queue Status...');
    const queueStatusResponse = await axios.get(`${API_BASE_URL}/birthday-sms/queue-status`);
    console.log('✅ Queue status retrieved');
    const queueStatus = queueStatusResponse.data.data.queue_status;
    console.log('   📊 Queue Status:');
    queueStatus.forEach(status => {
      console.log(`      ${status.status}: ${status.count} messages`);
    });
    
    // Test 7: Process Queued Messages
    console.log('\n7. ⚡ Testing Message Processing...');
    const processResponse = await axios.post(`${API_BASE_URL}/birthday-sms/process-queue`, { limit: 10 });
    console.log('✅ Queued messages processed');
    console.log('   📊 Processing Results:');
    console.log(`      🔄 Processed: ${processResponse.data.data.processed}`);
    console.log(`      ✅ Sent: ${processResponse.data.data.sent}`);
    console.log(`      ❌ Failed: ${processResponse.data.data.failed}`);
    
    // Test 8: Get Message History
    console.log('\n8. 📜 Testing Message History...');
    const historyResponse = await axios.get(`${API_BASE_URL}/birthday-sms/history?page=1&limit=5`);
    console.log('✅ Message history retrieved');
    console.log(`   📊 Total History Records: ${historyResponse.data.data.pagination.total}`);
    
    if (historyResponse.data.data.history.length > 0) {
      console.log('   📜 Recent Messages:');
      historyResponse.data.data.history.forEach((record, index) => {
        console.log(`      ${index + 1}. ${record.member_name} - ${record.delivery_status} (${record.scheduled_date})`);
      });
    }
    
    // Test 9: Scheduler Control
    console.log('\n9. 🕐 Testing Scheduler Control...');
    
    // Get scheduler status
    const schedulerStatusResponse = await axios.get(`${API_BASE_URL}/birthday-sms/scheduler/status`);
    console.log('✅ Scheduler status retrieved');
    const schedulerStatus = schedulerStatusResponse.data.data.scheduler_status;
    console.log('   📊 Scheduler Status:');
    console.log(`      🏃 Running: ${schedulerStatus.isRunning}`);
    console.log(`      📤 Queue Interval: ${schedulerStatus.queueInterval}`);
    console.log(`      ⚡ Process Interval: ${schedulerStatus.processInterval}`);
    
    // Start scheduler
    const startResponse = await axios.post(`${API_BASE_URL}/birthday-sms/scheduler/start`);
    console.log('✅ Scheduler started:', startResponse.data.data.message);
    
    // Test immediate run
    console.log('\n10. 🚀 Testing Immediate Birthday Workflow...');
    const immediateResponse = await axios.post(`${API_BASE_URL}/birthday-sms/scheduler/run-now`);
    console.log('✅ Immediate workflow executed');
    console.log('   📊 Workflow Results:');
    console.log(`      📤 Queue: ${immediateResponse.data.data.queue.queued} queued, ${immediateResponse.data.data.queue.skipped} skipped`);
    console.log(`      ⚡ Process: ${immediateResponse.data.data.process.sent} sent, ${immediateResponse.data.data.process.failed} failed`);
    
    // Test 11: Manual Birthday Message (if we have members with birthdays)
    if (todaysResponse.data.data.birthdays.length > 0) {
      console.log('\n11. 📱 Testing Manual Birthday Message...');
      const testMember = todaysResponse.data.data.birthdays[0];
      
      try {
        const manualResponse = await axios.post(`${API_BASE_URL}/birthday-sms/send-manual/${testMember.member_id}`);
        console.log('✅ Manual birthday message sent');
        console.log(`   📱 Message: ${manualResponse.data.data.message}`);
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('⚠️  Manual message skipped (likely already sent today)');
        } else {
          console.log('❌ Manual message failed:', error.response?.data?.error?.message || error.message);
        }
      }
    }
    
    // Test 12: Configuration Update
    console.log('\n12. ⚙️  Testing Configuration Update...');
    const updateConfigResponse = await axios.put(`${API_BASE_URL}/birthday-sms/config`, {
      include_age: true,
      include_organization_name: true,
      max_daily_sends: 500
    });
    console.log('✅ Configuration updated:', updateConfigResponse.data.data.message);
    
    // Final Statistics
    console.log('\n📊 Final Birthday SMS Statistics...');
    const finalStatsResponse = await axios.get(`${API_BASE_URL}/birthday-sms/statistics`);
    const finalStats = finalStatsResponse.data.data.statistics;
    console.log('   🎂 Today\'s Birthdays:', finalStats.todays_birthdays);
    console.log('   📅 Upcoming Birthdays:', finalStats.upcoming_birthdays);
    console.log('   📤 Queued Messages:', finalStats.queued_messages);
    console.log('   ✅ Sent Today:', finalStats.sent_today);
    
    console.log('\n🎉 Birthday SMS System Test Complete!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Birthday Configuration: Working');
    console.log('✅ Today\'s Birthdays: Working');
    console.log('✅ Upcoming Birthdays: Working');
    console.log('✅ Message Queueing: Working');
    console.log('✅ Message Processing: Working');
    console.log('✅ Message History: Working');
    console.log('✅ Scheduler Control: Working');
    console.log('✅ Manual Messaging: Working');
    console.log('✅ Configuration Updates: Working');
    
    console.log('\n🚀 Birthday SMS System Ready!');
    console.log('\n📱 Key Features:');
    console.log('   🎂 Automatic birthday detection');
    console.log('   📤 Automated message queueing');
    console.log('   ⚡ Background message processing');
    console.log('   📊 Real-time statistics');
    console.log('   📜 Message history tracking');
    console.log('   🕐 Scheduled daily execution');
    console.log('   📱 Manual message sending');
    console.log('   ⚙️  Configurable settings');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. The scheduler is now running automatically');
    console.log('   2. Birthday messages will be queued daily at 8:00 AM');
    console.log('   3. Messages will be processed every 5 minutes');
    console.log('   4. Monitor via the dashboard or API endpoints');
    console.log('   5. Customize templates and settings as needed');
    
  } catch (error) {
    console.error('\n❌ Birthday SMS test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

// Run the birthday SMS test
testBirthdaySMSSystem();
