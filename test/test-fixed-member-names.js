const axios = require('axios');

async function testFixedMemberNames() {
  console.log('🧪 Testing Fixed Member Names in Leadership Roster...\n');

  try {
    // Test the leadership appointments API endpoint
    console.log('📡 Testing Leadership Appointments API...');
    const response = await axios.get('http://localhost:3000/api/v1/leadership/appointments', {
      params: {
        page: 1,
        limit: 20,
        appointment_status: 'Active'
      }
    });

    if (response.data.success) {
      const appointments = response.data.data.appointments;
      console.log(`✅ Retrieved ${appointments.length} active appointments\n`);

      console.log('👥 Member Names Check:');
      console.log('='.repeat(80));
      
      appointments.forEach((appt, index) => {
        const memberName = appt.member_name || 'NO NAME';
        const memberNumber = appt.member_number || 'NO NUMBER';
        const position = appt.position_name || 'NO POSITION';
        const level = appt.hierarchy_level || 'NO LEVEL';
        
        // Check if member name is showing properly (not just membership number)
        const hasProperName = memberName && memberName !== memberNumber && memberName.trim().length > 0;
        const status = hasProperName ? '✅' : '❌';
        
        console.log(`${status} ${index + 1}. ${position} (${level})`);
        console.log(`    Member: ${memberName}`);
        console.log(`    Number: ${memberNumber}`);
        console.log(`    Entity: ${appt.entity_name || 'N/A'}`);
        console.log('');
      });

      // Summary
      const withProperNames = appointments.filter(appt => 
        appt.member_name && 
        appt.member_name !== appt.member_number && 
        appt.member_name.trim().length > 0
      ).length;
      
      const withoutProperNames = appointments.length - withProperNames;
      
      console.log('📊 SUMMARY:');
      console.log(`✅ Leaders with proper names: ${withProperNames}/${appointments.length}`);
      console.log(`❌ Leaders without proper names: ${withoutProperNames}/${appointments.length}`);
      
      if (withoutProperNames === 0) {
        console.log('\n🎉 SUCCESS! All leaders now show their full names!');
      } else {
        console.log('\n⚠️  Some leaders still missing proper names. Check database data.');
      }

      // Test specific hierarchy levels
      console.log('\n🏛️ Testing by Hierarchy Level:');
      const levels = ['National', 'Province', 'Municipality', 'Ward'];
      
      for (const level of levels) {
        const levelAppointments = appointments.filter(appt => appt.hierarchy_level === level);
        if (levelAppointments.length > 0) {
          const withNames = levelAppointments.filter(appt => 
            appt.member_name && 
            appt.member_name !== appt.member_number && 
            appt.member_name.trim().length > 0
          ).length;
          
          console.log(`  ${level}: ${withNames}/${levelAppointments.length} with proper names`);
        }
      }

    } else {
      console.error('❌ API request failed:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Error testing member names:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test with different filters
async function testWithFilters() {
  console.log('\n🔍 Testing with Different Filters...\n');

  const filters = [
    { hierarchy_level: 'National', name: 'National Level' },
    { hierarchy_level: 'Province', name: 'Provincial Level' },
    { hierarchy_level: 'Ward', name: 'Ward Level' }
  ];

  for (const filter of filters) {
    try {
      console.log(`📋 Testing ${filter.name}...`);
      const response = await axios.get('http://localhost:3000/api/v1/leadership/appointments', {
        params: {
          page: 1,
          limit: 10,
          appointment_status: 'Active',
          hierarchy_level: filter.hierarchy_level
        }
      });

      if (response.data.success) {
        const appointments = response.data.data.appointments;
        console.log(`   Found ${appointments.length} appointments`);
        
        appointments.forEach(appt => {
          const hasProperName = appt.member_name && 
                               appt.member_name !== appt.member_number && 
                               appt.member_name.trim().length > 0;
          const status = hasProperName ? '✅' : '❌';
          console.log(`   ${status} ${appt.position_name}: ${appt.member_name}`);
        });
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Error testing ${filter.name}:`, error.message);
    }
  }
}

// Run the tests
async function runAllTests() {
  await testFixedMemberNames();
  await testWithFilters();
  
  console.log('\n🏁 Testing Complete!');
  console.log('If you see ✅ for all leaders, the fix is working correctly.');
  console.log('If you see ❌ for some leaders, they may have incomplete data in the database.');
}

runAllTests().catch(console.error);
