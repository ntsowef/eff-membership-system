const mysql = require('mysql2/promise');

async function createFinalVotingDistrictViews() {
  let connection;
  
  try {
    console.log('🔄 Creating final voting district views with correct column names...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected to database');
    
    // 1. Drop existing views if they exist
    console.log('🗑️  Dropping existing views...');
    await connection.execute('DROP VIEW IF EXISTS members_with_voting_districts');
    await connection.execute('DROP VIEW IF EXISTS members_by_voting_district_summary');
    
    // 2. Create main members with voting districts view
    console.log('📊 Creating members_with_voting_districts view...');
    await connection.execute(`
      CREATE VIEW members_with_voting_districts AS
      SELECT 
        -- Member basic information
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.age,
        m.date_of_birth,
        m.gender_id,
        g.gender_name,
        
        -- Contact information
        m.residential_address,
        m.cell_number,
        m.landline_number,
        m.email,
        
        -- Voter information
        m.voter_registration_number,
        m.voter_registration_date,
        m.voting_station_id,
        
        -- Complete Geographic Hierarchy
        m.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_number,
        
        m.ward_code,
        w.ward_name,
        w.ward_number,
        
        w.municipality_code,
        mu.municipality_name,
        
        mu.district_code,
        d.district_name,
        
        d.province_code,
        p.province_name,
        
        -- Geographic hierarchy as concatenated string
        CONCAT(
          COALESCE(p.province_name, 'Unknown Province'), ' → ',
          COALESCE(d.district_name, 'Unknown District'), ' → ',
          COALESCE(mu.municipality_name, 'Unknown Municipality'), ' → ',
          'Ward ', COALESCE(w.ward_number, 'Unknown'),
          CASE 
            WHEN vd.voting_district_name IS NOT NULL 
            THEN CONCAT(' → VD ', vd.voting_district_number, ' (', vd.voting_district_name, ')')
            ELSE ''
          END
        ) as full_geographic_hierarchy,
        
        -- Membership information
        m.membership_type,
        m.application_id,
        
        -- Timestamps
        m.created_at as member_created_at,
        m.updated_at as member_updated_at,
        
        -- Calculated fields
        CASE 
          WHEN m.voting_district_code IS NOT NULL THEN 'Yes'
          ELSE 'No'
        END as has_voting_district,
        
        CASE 
          WHEN m.voter_registration_number IS NOT NULL THEN 'Registered'
          ELSE 'Not Registered'
        END as voter_registration_status,
        
        -- Age group classification
        CASE 
          WHEN m.age IS NULL THEN 'Unknown'
          WHEN m.age < 18 THEN 'Under 18'
          WHEN m.age BETWEEN 18 AND 25 THEN '18-25'
          WHEN m.age BETWEEN 26 AND 35 THEN '26-35'
          WHEN m.age BETWEEN 36 AND 45 THEN '36-45'
          WHEN m.age BETWEEN 46 AND 55 THEN '46-55'
          WHEN m.age BETWEEN 56 AND 65 THEN '56-65'
          ELSE '65+'
        END as age_group

      FROM members m

      -- Geographic joins (complete hierarchy)
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code

      -- Lookup table joins with correct primary keys
      LEFT JOIN genders g ON m.gender_id = g.gender_id
    `);
    
    // 3. Create voting district summary view
    console.log('📊 Creating members_by_voting_district_summary view...');
    await connection.execute(`
      CREATE VIEW members_by_voting_district_summary AS
      SELECT 
        vd.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_number,
        w.ward_code,
        w.ward_name,
        w.ward_number,
        mu.municipality_name,
        d.district_name,
        p.province_name,
        COUNT(m.member_id) as total_members,
        COUNT(CASE WHEN m.voter_registration_number IS NOT NULL THEN 1 END) as registered_voters,
        COUNT(CASE WHEN m.gender_id = 1 THEN 1 END) as male_members,
        COUNT(CASE WHEN m.gender_id = 2 THEN 1 END) as female_members,
        ROUND(AVG(m.age), 1) as average_age,
        MIN(m.created_at) as first_member_joined,
        MAX(m.created_at) as latest_member_joined
      FROM voting_districts vd
      LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE vd.is_active = TRUE
      GROUP BY 
        vd.voting_district_code, vd.voting_district_name, vd.voting_district_number,
        w.ward_code, w.ward_name, w.ward_number,
        mu.municipality_name, d.district_name, p.province_name
      ORDER BY p.province_name, d.district_name, mu.municipality_name, w.ward_number, vd.voting_district_number
    `);
    
    // 4. Create a simple voting districts with member counts view for the API
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
        w.ward_number,
        mu.municipality_name,
        d.district_name,
        p.province_name
      FROM voting_districts vd
      LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE vd.is_active = TRUE
      GROUP BY 
        vd.voting_district_code, vd.voting_district_name, vd.voting_district_number,
        vd.ward_code, vd.is_active,
        w.ward_name, w.ward_number,
        mu.municipality_name, d.district_name, p.province_name
      ORDER BY vd.voting_district_number
    `);
    
    // 5. Create indexes for performance
    console.log('🔧 Creating performance indexes...');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_members_voting_district_code ON members(voting_district_code)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_members_ward_code ON members(ward_code)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_voting_districts_ward_code ON voting_districts(ward_code)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_voting_districts_active ON voting_districts(is_active)');
    
    // 6. Test the views
    console.log('\n🧪 Testing created views...');
    
    // Test members with voting districts view
    const [membersWithVD] = await connection.execute(`
      SELECT COUNT(*) as total_members, 
             COUNT(voting_district_code) as members_with_vd,
             COUNT(DISTINCT voting_district_code) as unique_voting_districts
      FROM members_with_voting_districts
    `);
    
    console.log('📊 Members with Voting Districts View:');
    console.log(`   Total Members: ${membersWithVD[0].total_members}`);
    console.log(`   Members with VD: ${membersWithVD[0].members_with_vd}`);
    console.log(`   Unique VDs: ${membersWithVD[0].unique_voting_districts}`);
    
    // Test voting district summary
    const [vdSummary] = await connection.execute(`
      SELECT COUNT(*) as total_voting_districts,
             SUM(total_members) as total_members_in_vds,
             AVG(total_members) as avg_members_per_vd
      FROM members_by_voting_district_summary
    `);
    
    console.log('\n📊 Voting District Summary View:');
    console.log(`   Total Voting Districts: ${vdSummary[0].total_voting_districts}`);
    console.log(`   Total Members in VDs: ${vdSummary[0].total_members_in_vds}`);
    console.log(`   Avg Members per VD: ${parseFloat(vdSummary[0].avg_members_per_vd || 0).toFixed(1)}`);
    
    // Test specific ward voting districts
    const [specificWardVDs] = await connection.execute(`
      SELECT voting_district_code, voting_district_name, voting_district_number, member_count
      FROM voting_districts_with_members
      WHERE ward_code = '59500105'
      ORDER BY voting_district_number
      LIMIT 10
    `);
    
    console.log(`\n🎯 Voting Districts for Ward 59500105 (${specificWardVDs.length} found):`);
    specificWardVDs.forEach((vd, index) => {
      console.log(`   ${index + 1}. VD ${vd.voting_district_number} - ${vd.voting_district_name}`);
      console.log(`      Code: ${vd.voting_district_code}, Members: ${vd.member_count}`);
    });
    
    // Test members with full geographic hierarchy
    const [sampleMembers] = await connection.execute(`
      SELECT full_name, full_geographic_hierarchy, has_voting_district, gender_name
      FROM members_with_voting_districts
      WHERE voting_district_code IS NOT NULL
      LIMIT 5
    `);
    
    console.log('\n👥 Sample members with full geographic hierarchy:');
    sampleMembers.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.full_name} (${member.gender_name || 'Unknown'})`);
      console.log(`      ${member.full_geographic_hierarchy}`);
      console.log(`      Has VD: ${member.has_voting_district}`);
    });
    
    console.log('\n🎉 Voting district views created successfully!');
    console.log('📝 Views created:');
    console.log('   ✅ members_with_voting_districts');
    console.log('   ✅ members_by_voting_district_summary');
    console.log('   ✅ voting_districts_with_members');
    console.log('📊 Performance indexes created');
    console.log('\n🚀 Views are ready for use in the frontend!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update backend API to use these views');
    console.log('   2. Test frontend voting districts display');
    console.log('   3. Verify GeographicSelector shows voting districts');
    
  } catch (error) {
    console.error('❌ Error creating views:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createFinalVotingDistrictViews();
