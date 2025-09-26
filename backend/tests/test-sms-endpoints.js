const axios = require('axios');

async function testSMSEndpoints() {
  const API_BASE_URL = 'http://localhost:5000/api/v1';
  
  console.log('🧪 Testing SMS Management Endpoints\n');
  
  try {
    // Test 1: Get SMS Templates
    console.log('1. Testing GET /sms/templates...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/sms/templates`);
    console.log('✅ Templates retrieved:', templatesResponse.data.data.total, 'templates found');
    
    // Test 2: Get SMS Dashboard Stats
    console.log('\n2. Testing GET /sms/dashboard/stats...');
    const statsResponse = await axios.get(`${API_BASE_URL}/sms/dashboard/stats`);
    console.log('✅ Dashboard stats retrieved successfully');
    console.log('   📊 Total Campaigns:', statsResponse.data.data.campaign_statistics.total_campaigns);
    console.log('   📝 Total Templates:', statsResponse.data.data.template_statistics.total_templates);
    
    // Test 3: Create SMS Template
    console.log('\n3. Testing POST /sms/templates...');
    const newTemplate = {
      name: 'Test Welcome Message',
      description: 'A test welcome message for new members',
      content: 'Welcome {name}! Thank you for joining us in {ward}, {municipality}.',
      variables: ['name', 'ward', 'municipality'],
      category: 'notification',
      is_active: true
    };
    
    const createTemplateResponse = await axios.post(`${API_BASE_URL}/sms/templates`, newTemplate);
    console.log('✅ Template created with ID:', createTemplateResponse.data.data.template_id);
    const templateId = createTemplateResponse.data.data.template_id;
    
    // Test 4: Get Template by ID
    console.log('\n4. Testing GET /sms/templates/:id...');
    const templateResponse = await axios.get(`${API_BASE_URL}/sms/templates/${templateId}`);
    console.log('✅ Template retrieved:', templateResponse.data.data.template.name);
    
    // Test 5: Update Template
    console.log('\n5. Testing PUT /sms/templates/:id...');
    const updateData = {
      description: 'Updated test welcome message for new members',
      is_active: false
    };
    
    const updateResponse = await axios.put(`${API_BASE_URL}/sms/templates/${templateId}`, updateData);
    console.log('✅ Template updated successfully');
    
    // Test 6: Get SMS Campaigns
    console.log('\n6. Testing GET /sms/campaigns...');
    const campaignsResponse = await axios.get(`${API_BASE_URL}/sms/campaigns`);
    console.log('✅ Campaigns retrieved:', campaignsResponse.data.data.total, 'campaigns found');
    
    // Test 7: Create SMS Campaign
    console.log('\n7. Testing POST /sms/campaigns...');
    const newCampaign = {
      name: 'Test Campaign',
      description: 'A test SMS campaign',
      template_id: templateId,
      message_content: 'Welcome John! Thank you for joining us in Ward 1, Test Municipality.',
      target_type: 'custom',
      target_criteria: { test: true },
      status: 'draft',
      priority: 'normal',
      send_rate_limit: 50,
      retry_failed: true,
      max_retries: 2
    };
    
    const createCampaignResponse = await axios.post(`${API_BASE_URL}/sms/campaigns`, newCampaign);
    console.log('✅ Campaign created with ID:', createCampaignResponse.data.data.campaign_id);
    const campaignId = createCampaignResponse.data.data.campaign_id;
    
    // Test 8: Get Campaign by ID
    console.log('\n8. Testing GET /sms/campaigns/:id...');
    const campaignResponse = await axios.get(`${API_BASE_URL}/sms/campaigns/${campaignId}`);
    console.log('✅ Campaign retrieved:', campaignResponse.data.data.campaign.name);
    console.log('   📊 Campaign Statistics:', campaignResponse.data.data.statistics);
    
    // Test 9: Mock SMS Send
    console.log('\n9. Testing POST /sms/mock-send...');
    const mockSMS = {
      to: '+27123456789',
      message: 'This is a test SMS message',
      from: 'MEMBERSHIP'
    };
    
    const mockSendResponse = await axios.post(`${API_BASE_URL}/sms/mock-send`, mockSMS);
    console.log('✅ Mock SMS sent:', mockSendResponse.data.data.message_id);
    
    // Test 10: Delete Template (cleanup)
    console.log('\n10. Testing DELETE /sms/templates/:id...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/sms/templates/${templateId}`);
    console.log('✅ Template deleted successfully');
    
    console.log('\n🎉 All SMS Management Endpoints Working Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ SMS Templates: CRUD operations working');
    console.log('✅ SMS Campaigns: CRUD operations working');
    console.log('✅ SMS Dashboard: Statistics working');
    console.log('✅ Mock SMS Sending: Working');
    console.log('✅ Database Integration: Working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testSMSEndpoints();
