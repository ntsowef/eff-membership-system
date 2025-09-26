const { executeQuery, initializeDatabase } = require('../dist/config/database');

async function testExpiredMembersQueries() {
  try {
    console.log('🧪 Testing Expired Members Database Queries...\n');
    
    // Initialize database connection
    await initializeDatabase();

    // Test 1: Check if we have any members with expiry dates
    console.log('📊 Test 1: Checking member expiry data...');
    const memberExpiryQuery = `
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN membership_expiry_date < CURDATE() THEN 1 END) as expired_count,
        COUNT(CASE WHEN membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon_count,
        COUNT(CASE WHEN membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as expiring_urgent_count
      FROM vw_member_details
      LIMIT 1
    `;

    const [memberStats] = await executeQuery(memberExpiryQuery);
    console.log('✅ Member expiry statistics:');
    console.log(`   Total members: ${memberStats.total_members}`);
    console.log(`   Expired: ${memberStats.expired_count}`);
    console.log(`   Expiring soon (30 days): ${memberStats.expiring_soon_count}`);
    console.log(`   Expiring urgent (7 days): ${memberStats.expiring_urgent_count}`);

    // Test 2: Check province breakdown
    console.log('\n📊 Test 2: Province breakdown...');
    const provinceQuery = `
      SELECT 
        p.province_code,
        p.province_name,
        COUNT(m.member_id) as total_members,
        COUNT(CASE WHEN m.membership_expiry_date < CURDATE() THEN 1 END) as expired_count,
        COUNT(CASE WHEN m.membership_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon_count
      FROM provinces p
      LEFT JOIN vw_member_details m ON p.province_code = m.province_code
      GROUP BY p.province_code, p.province_name
      ORDER BY expired_count DESC
      LIMIT 5
    `;

    const provinceStats = await executeQuery(provinceQuery);
    console.log('✅ Top 5 provinces by expired members:');
    provinceStats.forEach((province, index) => {
      console.log(`   ${index + 1}. ${province.province_name}: ${province.expired_count} expired, ${province.expiring_soon_count} expiring soon (${province.total_members} total)`);
    });

    // Test 3: Check if membership_expiry_date field exists and has data
    console.log('\n📊 Test 3: Checking membership expiry date field...');
    const expiryFieldQuery = `
      SELECT 
        membership_expiry_date,
        COUNT(*) as count
      FROM vw_member_details 
      WHERE membership_expiry_date IS NOT NULL
      GROUP BY membership_expiry_date
      ORDER BY membership_expiry_date DESC
      LIMIT 10
    `;

    const expiryDates = await executeQuery(expiryFieldQuery);
    if (expiryDates.length > 0) {
      console.log('✅ Sample expiry dates found:');
      expiryDates.forEach((date, index) => {
        console.log(`   ${index + 1}. ${date.membership_expiry_date}: ${date.count} members`);
      });
    } else {
      console.log('⚠️  No expiry dates found - membership_expiry_date might be NULL for all members');
    }

    // Test 4: Check view structure
    console.log('\n📊 Test 4: Checking vw_member_details structure...');
    const viewStructureQuery = `DESCRIBE vw_member_details`;
    const viewStructure = await executeQuery(viewStructureQuery);
    
    const expiryField = viewStructure.find(field => field.Field === 'membership_expiry_date');
    if (expiryField) {
      console.log('✅ membership_expiry_date field found:');
      console.log(`   Type: ${expiryField.Type}`);
      console.log(`   Null: ${expiryField.Null}`);
      console.log(`   Default: ${expiryField.Default}`);
    } else {
      console.log('❌ membership_expiry_date field not found in vw_member_details');
      console.log('Available fields:');
      viewStructure.forEach(field => {
        if (field.Field.includes('expir') || field.Field.includes('date')) {
          console.log(`   - ${field.Field}: ${field.Type}`);
        }
      });
    }

    // Test 5: Create sample expired members data if none exists
    console.log('\n📊 Test 5: Sample data creation (if needed)...');
    if (memberStats.expired_count === 0 && memberStats.expiring_soon_count === 0) {
      console.log('⚠️  No expired/expiring members found. This is expected for a new system.');
      console.log('💡 In a real scenario, members would have expiry dates set during registration.');
      console.log('💡 For testing, you could manually update some membership_expiry_date values.');
      
      // Show how to create test data (but don't actually do it)
      console.log('\n📝 Example SQL to create test expired members:');
      console.log(`
        -- Update some members to be expired (past dates)
        UPDATE vw_member_details 
        SET membership_expiry_date = DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
        WHERE member_id IN (SELECT member_id FROM (SELECT member_id FROM vw_member_details LIMIT 5) as temp);
        
        -- Update some members to be expiring soon
        UPDATE vw_member_details 
        SET membership_expiry_date = DATE_ADD(CURDATE(), INTERVAL 15 DAY) 
        WHERE member_id IN (SELECT member_id FROM (SELECT member_id FROM vw_member_details LIMIT 5, 5) as temp);
      `);
    } else {
      console.log('✅ Expired/expiring members data is available for testing');
    }

    console.log('\n🎉 Database query tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error testing expired members queries:', error);
    process.exit(1);
  }
}

testExpiredMembersQueries();
