const mysql = require('mysql2/promise');

async function debugDashboard() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Dashboard Debug - Checking Data Sources...\n');
    
    // Test 1: Check members table
    console.log('📋 Test 1: Members Table');
    try {
      const [memberCount] = await connection.execute('SELECT COUNT(*) as count FROM members');
      console.log('✅ Members count:', memberCount[0].count);
      
      if (memberCount[0].count > 0) {
        const [sampleMembers] = await connection.execute('SELECT * FROM members LIMIT 3');
        console.log('Sample members:', sampleMembers.length);
      }
    } catch (error) {
      console.log('❌ Members table error:', error.message);
    }
    
    // Test 2: Check memberships table
    console.log('\n📋 Test 2: Memberships Table');
    try {
      const [membershipCount] = await connection.execute('SELECT COUNT(*) as count FROM memberships');
      console.log('✅ Memberships count:', membershipCount[0].count);
    } catch (error) {
      console.log('❌ Memberships table error:', error.message);
    }
    
    // Test 3: Check users table
    console.log('\n📋 Test 3: Users Table');
    try {
      const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('✅ Users count:', userCount[0].count);
      
      if (userCount[0].count > 0) {
        const [sampleUsers] = await connection.execute('SELECT id, name, email, admin_level FROM users LIMIT 3');
        console.log('Sample users:');
        sampleUsers.forEach(user => {
          console.log(`  - ${user.name} (${user.email}) - Level: ${user.admin_level}`);
        });
      }
    } catch (error) {
      console.log('❌ Users table error:', error.message);
    }
    
    // Test 4: Check provinces table
    console.log('\n📋 Test 4: Geographic Tables');
    try {
      const [provinceCount] = await connection.execute('SELECT COUNT(*) as count FROM provinces');
      console.log('✅ Provinces count:', provinceCount[0].count);
      
      const [districtCount] = await connection.execute('SELECT COUNT(*) as count FROM districts');
      console.log('✅ Districts count:', districtCount[0].count);
      
      const [municipalityCount] = await connection.execute('SELECT COUNT(*) as count FROM municipalities');
      console.log('✅ Municipalities count:', municipalityCount[0].count);
      
      const [wardCount] = await connection.execute('SELECT COUNT(*) as count FROM wards');
      console.log('✅ Wards count:', wardCount[0].count);
    } catch (error) {
      console.log('❌ Geographic tables error:', error.message);
    }
    
    // Test 5: Check vw_member_details view
    console.log('\n📋 Test 5: Member Details View');
    try {
      const [viewCount] = await connection.execute('SELECT COUNT(*) as count FROM vw_member_details');
      console.log('✅ Member details view count:', viewCount[0].count);
    } catch (error) {
      console.log('❌ Member details view error:', error.message);
    }
    
    // Test 6: Test the actual system statistics query
    console.log('\n📋 Test 6: System Statistics Query');
    try {
      const systemStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM members) as members,
          (SELECT COUNT(*) FROM memberships) as memberships,
          (SELECT COUNT(*) FROM provinces) as provinces,
          (SELECT COUNT(*) FROM districts) as districts,
          (SELECT COUNT(*) FROM municipalities) as municipalities,
          (SELECT COUNT(*) FROM wards) as wards
      `;
      const [systemStats] = await connection.execute(systemStatsQuery);
      console.log('✅ System statistics:');
      console.log('   Members:', systemStats[0].members);
      console.log('   Memberships:', systemStats[0].memberships);
      console.log('   Provinces:', systemStats[0].provinces);
      console.log('   Districts:', systemStats[0].districts);
      console.log('   Municipalities:', systemStats[0].municipalities);
      console.log('   Wards:', systemStats[0].wards);
    } catch (error) {
      console.log('❌ System statistics query error:', error.message);
    }
    
    // Test 7: Check membership_statuses table
    console.log('\n📋 Test 7: Membership Statuses');
    try {
      const [statusCount] = await connection.execute('SELECT COUNT(*) as count FROM membership_statuses');
      console.log('✅ Membership statuses count:', statusCount[0].count);
      
      if (statusCount[0].count > 0) {
        const [statuses] = await connection.execute('SELECT * FROM membership_statuses');
        console.log('Available statuses:');
        statuses.forEach(status => {
          console.log(`  - ${status.status_name} (Active: ${status.is_active})`);
        });
      }
    } catch (error) {
      console.log('❌ Membership statuses error:', error.message);
    }
    
    console.log('\n✅ Dashboard debug completed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugDashboard().catch(console.error);
