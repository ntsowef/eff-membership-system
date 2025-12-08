const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function testMunicipalityFilter() {
  try {
    console.log('🔍 Testing municipality filter for MP324...\n');

    // First, check what's in the database
    console.log('📊 Checking members_consolidated for municipality_code = MP324...');
    const dbQuery = await pool.query(`
      SELECT COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code = 'MP324';
    `);
    console.log(`   Found in members_consolidated: ${dbQuery.rows[0].count} members\n`);

    // Check the view
    console.log('📊 Checking vw_enhanced_member_search for municipality_code = MP324...');
    const viewQuery = await pool.query(`
      SELECT COUNT(*) as count
      FROM vw_enhanced_member_search
      WHERE municipality_code = 'MP324';
    `);
    console.log(`   Found in vw_enhanced_member_search: ${viewQuery.rows[0].count} members\n`);

    // Check what municipality codes exist in members_consolidated
    console.log('📊 Sample municipality codes in members_consolidated:');
    const sampleCodes = await pool.query(`
      SELECT municipality_code, COUNT(*) as count
      FROM members_consolidated
      WHERE municipality_code IS NOT NULL
      GROUP BY municipality_code
      ORDER BY count DESC
      LIMIT 10;
    `);
    console.table(sampleCodes.rows);
    console.log('');

    // Check what municipality codes exist in municipalities table
    console.log('📊 Sample municipality codes in municipalities table:');
    const municipalityCodes = await pool.query(`
      SELECT municipality_code, municipality_name
      FROM municipalities
      WHERE municipality_code LIKE 'MP%'
      ORDER BY municipality_code
      LIMIT 10;
    `);
    console.table(municipalityCodes.rows);
    console.log('');

    // Check if MP324 exists in municipalities table
    console.log('📊 Checking if MP324 exists in municipalities table...');
    const mp324Check = await pool.query(`
      SELECT municipality_code, municipality_name, district_code
      FROM municipalities
      WHERE municipality_code = 'MP324';
    `);
    if (mp324Check.rows.length > 0) {
      console.log('   ✅ MP324 found in municipalities table:');
      console.table(mp324Check.rows);
    } else {
      console.log('   ⚠️  MP324 NOT found in municipalities table\n');
    }

    // Now test the API endpoint
    console.log('🌐 Testing API endpoint...\n');
    
    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');

    const headers = { 'Authorization': `Bearer ${token}` };

    // Test the municipality filter
    console.log('📊 Testing /api/v1/members?municipality_code=MP324...\n');
    const response = await axios.get('http://localhost:5000/api/v1/members', {
      params: {
        page: 1,
        limit: 10,
        municipality_code: 'MP324'
      },
      headers
    });

    console.log('✅ API Response:');
    console.log('   Total Members Found:', response.data.pagination.total);
    console.log('   Page:', response.data.pagination.page);
    console.log('   Limit:', response.data.pagination.limit);
    console.log('');

    if (response.data.data.length > 0) {
      console.log('📋 Sample Members:\n');
      response.data.data.slice(0, 5).forEach((member, index) => {
        console.log(`${index + 1}. ${member.firstname} ${member.surname || '(no surname)'}`);
        console.log(`   Member ID: ${member.member_id}`);
        console.log(`   Municipality: ${member.municipality_name || 'N/A'} (${member.municipality_code || 'N/A'})`);
        console.log(`   District: ${member.district_name || 'N/A'} (${member.district_code || 'N/A'})`);
        console.log(`   Province: ${member.province_name || 'N/A'} (${member.province_code || 'N/A'})`);
        console.log('');
      });
    } else {
      console.log('⚠️  No members returned by API');
    }

    await pool.end();
    console.log('✅ Test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    await pool.end();
    process.exit(1);
  }
}

testMunicipalityFilter();

