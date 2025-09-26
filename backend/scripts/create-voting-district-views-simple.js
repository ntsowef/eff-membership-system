const mysql = require('mysql2/promise');

async function createVotingDistrictViewsSimple() {
  let connection;
  
  try {
    console.log('🔄 Creating voting district views (simple version)...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected to database');
    
    // 1. Drop existing views
    console.log('🗑️  Dropping existing views...');
    try {
      await connection.execute('DROP VIEW IF EXISTS voting_districts_with_members');
      console.log('   ✅ Dropped voting_districts_with_members');
    } catch (e) {
      console.log('   ⚠️  voting_districts_with_members did not exist');
    }
    
    // 2. Create simple voting districts with member counts view
    console.log('📊 Creating voting_districts_with_members view...');
    await connection.execute(`
      CREATE VIEW voting_districts_with_members AS
      SELECT 
        vd.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_number,
        vd.ward_code,
        vd.is_active,
        COUNT(m.member_id) as member_count,
        w.ward_name,
        w.ward_number
      FROM voting_districts vd
      LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      WHERE vd.is_active = TRUE
      GROUP BY 
        vd.voting_district_code, vd.voting_district_name, vd.voting_district_number,
        vd.ward_code, vd.is_active, w.ward_name, w.ward_number
      ORDER BY vd.voting_district_number
    `);
    console.log('   ✅ Created voting_districts_with_members view');
    
    // 3. Test the view
    console.log('\n🧪 Testing the view...');
    
    const [testResults] = await connection.execute(`
      SELECT COUNT(*) as total_voting_districts,
             SUM(member_count) as total_members_in_vds
      FROM voting_districts_with_members
    `);
    
    console.log('📊 View Test Results:');
    console.log(`   Total Voting Districts: ${testResults[0].total_voting_districts}`);
    console.log(`   Total Members in VDs: ${testResults[0].total_members_in_vds}`);
    
    // Test specific ward
    const [wardVDs] = await connection.execute(`
      SELECT voting_district_code, voting_district_name, voting_district_number, member_count
      FROM voting_districts_with_members
      WHERE ward_code = '59500105'
      ORDER BY voting_district_number
      LIMIT 5
    `);
    
    console.log(`\n🎯 Sample Voting Districts for Ward 59500105:`);
    wardVDs.forEach((vd, index) => {
      console.log(`   ${index + 1}. VD ${vd.voting_district_number} - ${vd.voting_district_name}`);
      console.log(`      Code: ${vd.voting_district_code}, Members: ${vd.member_count}`);
    });
    
    // 4. Create indexes
    console.log('\n🔧 Creating indexes...');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_voting_districts_ward_code ON voting_districts(ward_code)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_voting_districts_active ON voting_districts(is_active)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_members_voting_district_code ON members(voting_district_code)');
    console.log('   ✅ Indexes created');
    
    console.log('\n🎉 Voting district view created successfully!');
    console.log('📝 View created: voting_districts_with_members');
    console.log('🚀 Ready for frontend integration!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createVotingDistrictViewsSimple();
