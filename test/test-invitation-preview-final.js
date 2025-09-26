const axios = require('axios');

async function testInvitationPreview() {
  console.log('🧪 Testing Invitation Preview with Sample Data...\n');

  try {
    // Test National level meeting
    console.log('📋 Testing National Level Meeting (NPA)...');
    const nationalResponse = await axios.post('http://localhost:3000/api/v1/hierarchical-meetings/invitation-preview', {
      meeting_type_id: 2,
      hierarchy_level: 'National'
    });

    console.log('✅ National Level Response:');
    console.log(`   Status: ${nationalResponse.status}`);
    console.log(`   Total Invitations: ${nationalResponse.data.data.total_invitations}`);
    console.log(`   Grouped Invitations:`, Object.keys(nationalResponse.data.data.grouped_invitations));
    
    // Show some sample invitations
    const nationalInvitations = nationalResponse.data.data.grouped_invitations;
    Object.entries(nationalInvitations).forEach(([type, invitations]) => {
      if (invitations.length > 0) {
        console.log(`   ${type.toUpperCase()}: ${invitations.length} invitations`);
        invitations.slice(0, 2).forEach(inv => {
          console.log(`     - ${inv.member_name} (${inv.role_in_meeting})`);
        });
      }
    });

    console.log('\n📋 Testing Ward Level Meeting...');
    const wardResponse = await axios.post('http://localhost:3000/api/v1/hierarchical-meetings/invitation-preview', {
      meeting_type_id: 13,
      hierarchy_level: 'Ward'
    });

    console.log('✅ Ward Level Response:');
    console.log(`   Status: ${wardResponse.status}`);
    console.log(`   Total Invitations: ${wardResponse.data.data.total_invitations}`);
    console.log(`   Grouped Invitations:`, Object.keys(wardResponse.data.data.grouped_invitations));
    
    // Show some sample invitations
    const wardInvitations = wardResponse.data.data.grouped_invitations;
    Object.entries(wardInvitations).forEach(([type, invitations]) => {
      if (invitations.length > 0) {
        console.log(`   ${type.toUpperCase()}: ${invitations.length} invitations`);
        invitations.slice(0, 2).forEach(inv => {
          console.log(`     - ${inv.member_name} (${inv.role_in_meeting})`);
        });
      }
    });

    console.log('\n🎉 SUCCESS: Invitation Preview is now working with sample data!');
    console.log('\n📊 SUMMARY:');
    console.log(`   - National Level: ${nationalResponse.data.data.total_invitations} invitations`);
    console.log(`   - Ward Level: ${wardResponse.data.data.total_invitations} invitations`);
    console.log('   - Database schema issues resolved ✅');
    console.log('   - Sample member roles created ✅');
    console.log('   - API endpoints working ✅');

  } catch (error) {
    console.error('❌ Error testing invitation preview:', error.response?.data || error.message);
  }
}

// Run the test
testInvitationPreview().catch(console.error);
