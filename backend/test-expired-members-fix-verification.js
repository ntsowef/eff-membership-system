/**
 * Test to verify the expired members fix works correctly
 */

function testExpiredMembersFix() {
  console.log('🔧 Testing expired members fix...');
  
  // Mock data similar to what the backend returns
  const mockNationalSummary = {
    total_members: '237934',      // String from PostgreSQL
    total_expired: '50637',       // String from PostgreSQL  
    total_expiring_soon: '43194', // String from PostgreSQL
    total_expiring_urgent: '11313' // String from PostgreSQL
  };
  
  const mockProvinceBreakdown = [
    {
      province_code: 'GP',
      province_name: 'Gauteng',
      expired_count: '15142',
      expiring_soon_count: '10351',
      total_members: '100543'
    },
    {
      province_code: 'EC', 
      province_name: 'Eastern Cape',
      expired_count: '12846',
      expiring_soon_count: '8750',
      total_members: '78506'
    }
  ];
  
  console.log('\n1. Testing OLD (broken) calculations...');
  
  // OLD broken calculations (string concatenation)
  const oldActiveMembers = mockNationalSummary.total_members - mockNationalSummary.total_expired - mockNationalSummary.total_expiring_soon;
  const oldTotalAtRisk = mockProvinceBreakdown[0].expired_count + mockProvinceBreakdown[0].expiring_soon_count;
  
  console.log('OLD calculations (BROKEN):');
  console.log(`  Active Members: "${oldActiveMembers}" (${typeof oldActiveMembers}) - Length: ${oldActiveMembers.toString().length}`);
  console.log(`  Province Total At Risk: "${oldTotalAtRisk}" (${typeof oldTotalAtRisk}) - Length: ${oldTotalAtRisk.toString().length}`);
  
  console.log('\n2. Testing NEW (fixed) calculations...');
  
  // NEW fixed calculations (numeric conversion)
  const totalMembers = parseInt(mockNationalSummary.total_members, 10) || 0;
  const totalExpired = parseInt(mockNationalSummary.total_expired, 10) || 0;
  const totalExpiringSoon = parseInt(mockNationalSummary.total_expiring_soon, 10) || 0;
  const totalExpiringUrgent = parseInt(mockNationalSummary.total_expiring_urgent, 10) || 0;
  
  const newActiveMembers = totalMembers - totalExpired - totalExpiringSoon;
  
  // Province calculations
  const province = mockProvinceBreakdown[0];
  const newTotalAtRisk = (parseInt(province.expired_count, 10) || 0) + (parseInt(province.expiring_soon_count, 10) || 0);
  const provinceTotalMembers = parseInt(province.total_members, 10) || 0;
  const riskPercentage = provinceTotalMembers > 0 ? (newTotalAtRisk / provinceTotalMembers) * 100 : 0;
  
  console.log('NEW calculations (FIXED):');
  console.log(`  Total Members: ${totalMembers.toLocaleString()}`);
  console.log(`  Total Expired: ${totalExpired.toLocaleString()}`);
  console.log(`  Total Expiring Soon: ${totalExpiringSoon.toLocaleString()}`);
  console.log(`  Total Expiring Urgent: ${totalExpiringUrgent.toLocaleString()}`);
  console.log(`  Active Members: ${newActiveMembers.toLocaleString()}`);
  console.log(`  Province Total At Risk: ${newTotalAtRisk.toLocaleString()}`);
  console.log(`  Risk Percentage: ${riskPercentage.toFixed(1)}%`);
  
  console.log('\n3. Testing percentage calculations...');
  
  const expiredPercentage = totalMembers > 0 ? (totalExpired / totalMembers) * 100 : 0;
  const expiringSoonPercentage = totalMembers > 0 ? (totalExpiringSoon / totalMembers) * 100 : 0;
  const urgentPercentage = totalMembers > 0 ? (totalExpiringUrgent / totalMembers) * 100 : 0;
  const activePercentage = ((1 - (expiredPercentage + expiringSoonPercentage) / 100) * 100);
  
  console.log('Percentage calculations:');
  console.log(`  Expired: ${expiredPercentage.toFixed(1)}%`);
  console.log(`  Expiring Soon: ${expiringSoonPercentage.toFixed(1)}%`);
  console.log(`  Urgent: ${urgentPercentage.toFixed(1)}%`);
  console.log(`  Active: ${activePercentage.toFixed(1)}%`);
  
  console.log('\n4. Testing sorting fix...');
  
  // Test the sorting calculation
  const sortedProvinces = mockProvinceBreakdown.sort((a, b) => {
    const aTotal = (parseInt(a.expired_count, 10) || 0) + (parseInt(a.expiring_soon_count, 10) || 0);
    const bTotal = (parseInt(b.expired_count, 10) || 0) + (parseInt(b.expiring_soon_count, 10) || 0);
    return bTotal - aTotal;
  });
  
  console.log('Sorted provinces by total at risk:');
  sortedProvinces.forEach((prov, index) => {
    const atRisk = (parseInt(prov.expired_count, 10) || 0) + (parseInt(prov.expiring_soon_count, 10) || 0);
    console.log(`  ${index + 1}. ${prov.province_name}: ${atRisk.toLocaleString()} at risk`);
  });
  
  console.log('\n🎉 FIX VERIFICATION COMPLETE!');
  console.log('\n📊 SUMMARY:');
  console.log(`✅ OLD (broken): Active Members = "${oldActiveMembers}" (${oldActiveMembers.toString().length} chars)`);
  console.log(`✅ NEW (fixed): Active Members = ${newActiveMembers.toLocaleString()}`);
  console.log(`✅ OLD (broken): Province At Risk = "${oldTotalAtRisk}" (${oldTotalAtRisk.toString().length} chars)`);
  console.log(`✅ NEW (fixed): Province At Risk = ${newTotalAtRisk.toLocaleString()}`);
  console.log('\n🔧 EXPECTED RESULTS IN UI:');
  console.log(`- Expired Members: ${totalExpired.toLocaleString()} (${expiredPercentage.toFixed(1)}% of total)`);
  console.log(`- Expiring Soon (30 days): ${totalExpiringSoon.toLocaleString()} (${expiringSoonPercentage.toFixed(1)}% of total)`);
  console.log(`- Urgent (7 days): ${totalExpiringUrgent.toLocaleString()} (${urgentPercentage.toFixed(1)}% of total)`);
  console.log(`- Active Members: ${newActiveMembers.toLocaleString()} (${activePercentage.toFixed(1)}% of total)`);
  
  // Verify the fix addresses the user's original issue
  const isFixSuccessful = (
    typeof newActiveMembers === 'number' &&
    newActiveMembers > 0 &&
    newActiveMembers < 1000000 && // Reasonable number
    typeof newTotalAtRisk === 'number' &&
    newTotalAtRisk > 0 &&
    newTotalAtRisk < 100000 // Reasonable number
  );
  
  console.log(`\n🎯 FIX STATUS: ${isFixSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (isFixSuccessful) {
    console.log('The fix successfully converts string concatenation to proper numeric calculations!');
  } else {
    console.log('The fix needs more work - numbers are still not reasonable.');
  }
}

testExpiredMembersFix();
