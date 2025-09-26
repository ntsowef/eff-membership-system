const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runVotingDistrictViewsMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting voting district views migration...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new',
      multipleStatements: true
    });

    console.log('✅ Connected to database');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '014_members_voting_district_view.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Execute the migration
    const [results] = await connection.execute(migrationSQL);
    
    console.log('✅ Migration executed successfully');
    
    // Test the views
    console.log('\n🧪 Testing created views...');
    
    // Test 1: Check members_with_voting_districts view
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
    
    // Test 2: Check voting district summary
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
    
    // Test 3: Sample voting districts with members
    const [sampleVDs] = await connection.execute(`
      SELECT voting_district_code, voting_district_name, ward_name, 
             municipal_name, total_members
      FROM members_by_voting_district_summary
      WHERE total_members > 0
      ORDER BY total_members DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Top 10 Voting Districts by Member Count:');
    sampleVDs.forEach((vd, index) => {
      console.log(`   ${index + 1}. ${vd.voting_district_name} (${vd.voting_district_code})`);
      console.log(`      Ward: ${vd.ward_name}, Municipality: ${vd.municipal_name}`);
      console.log(`      Members: ${vd.total_members}`);
    });
    
    // Test 4: Check geographic distribution
    const [geoDistribution] = await connection.execute(`
      SELECT level_type, COUNT(*) as count, SUM(member_count) as total_members
      FROM geographic_membership_distribution
      GROUP BY level_type
      ORDER BY FIELD(level_type, 'Province', 'District', 'Municipality', 'Ward', 'Voting District')
    `);
    
    console.log('\n🗺️  Geographic Distribution:');
    geoDistribution.forEach(geo => {
      console.log(`   ${geo.level_type}: ${geo.count} units, ${geo.total_members} members`);
    });
    
    // Test 5: Check if voting districts are properly linked to wards
    const [vdWardCheck] = await connection.execute(`
      SELECT 
        COUNT(*) as total_voting_districts,
        COUNT(w.ward_code) as voting_districts_with_wards,
        COUNT(DISTINCT vd.ward_code) as unique_wards_with_vds
      FROM voting_districts vd
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      WHERE vd.is_active = TRUE
    `);
    
    console.log('\n🔗 Voting District → Ward Linkage:');
    console.log(`   Total Active VDs: ${vdWardCheck[0].total_voting_districts}`);
    console.log(`   VDs with Ward Links: ${vdWardCheck[0].voting_districts_with_wards}`);
    console.log(`   Unique Wards with VDs: ${vdWardCheck[0].unique_wards_with_vds}`);
    
    // Test 6: Check specific ward that should have voting districts
    const [specificWardVDs] = await connection.execute(`
      SELECT vd.voting_district_code, vd.voting_district_name, vd.voting_district_number,
             COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
      WHERE vd.ward_code = '59500105' AND vd.is_active = TRUE
      GROUP BY vd.voting_district_code, vd.voting_district_name, vd.voting_district_number
      ORDER BY vd.voting_district_number
    `);
    
    console.log(`\n🎯 Voting Districts for Ward 59500105 (${specificWardVDs.length} found):`);
    specificWardVDs.slice(0, 5).forEach((vd, index) => {
      console.log(`   ${index + 1}. VD ${vd.voting_district_number} - ${vd.voting_district_name}`);
      console.log(`      Code: ${vd.voting_district_code}, Members: ${vd.member_count}`);
    });
    
    if (specificWardVDs.length > 5) {
      console.log(`   ... and ${specificWardVDs.length - 5} more voting districts`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Views created:');
    console.log('   - members_with_voting_districts');
    console.log('   - members_by_voting_district_summary');
    console.log('   - geographic_membership_distribution');
    console.log('📊 Indexes created for performance optimization');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runVotingDistrictViewsMigration();
