/**
 * Fetch Valid Lookup Data from Database
 * Queries the database for valid values to use in test data generation
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function fetchLookupData() {
  console.log('📊 Fetching valid lookup data from database...\n');
  
  try {
    // Fetch provinces
    console.log('   Fetching provinces...');
    const provinces = await pool.query('SELECT province_code, province_name FROM provinces ORDER BY province_name');
    console.log(`   ✅ Found ${provinces.rows.length} provinces`);
    
    // Fetch municipalities
    console.log('   Fetching municipalities...');
    const municipalities = await pool.query('SELECT municipality_code, municipality_name FROM municipalities ORDER BY municipality_name LIMIT 50');
    console.log(`   ✅ Found ${municipalities.rows.length} municipalities`);
    
    // Fetch wards
    console.log('   Fetching wards...');
    const wards = await pool.query('SELECT ward_code, ward_name FROM wards ORDER BY ward_code LIMIT 100');
    console.log(`   ✅ Found ${wards.rows.length} wards`);
    
    // Fetch voting districts (8-digit codes only)
    console.log('   Fetching voting districts...');
    const votingDistricts = await pool.query(`
      SELECT voting_district_code, voting_district_name 
      FROM voting_districts 
      WHERE LENGTH(voting_district_code) = 8 
        AND voting_district_code NOT IN ('00000000', '22222222', '99999999')
      ORDER BY voting_district_code 
      LIMIT 100
    `);
    console.log(`   ✅ Found ${votingDistricts.rows.length} voting districts`);
    
    // Prepare data
    const lookupData = {
      provinces: provinces.rows,
      municipalities: municipalities.rows,
      wards: wards.rows,
      votingDistricts: votingDistricts.rows,
      metadata: {
        fetchedAt: new Date().toISOString(),
        totalProvinces: provinces.rows.length,
        totalMunicipalities: municipalities.rows.length,
        totalWards: wards.rows.length,
        totalVotingDistricts: votingDistricts.rows.length
      }
    };
    
    // Save to file
    const outputPath = path.join(__dirname, 'valid-lookup-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(lookupData, null, 2));
    
    console.log('\n✅ Lookup data saved to:', outputPath);
    console.log('\n📊 Summary:');
    console.log(`   Provinces:         ${lookupData.metadata.totalProvinces}`);
    console.log(`   Municipalities:    ${lookupData.metadata.totalMunicipalities}`);
    console.log(`   Wards:             ${lookupData.metadata.totalWards}`);
    console.log(`   Voting Districts:  ${lookupData.metadata.totalVotingDistricts}`);
    
    // Display sample data
    console.log('\n📋 Sample Data:');
    console.log('\nProvinces:');
    provinces.rows.slice(0, 3).forEach((p: any) => {
      console.log(`   ${p.province_code} - ${p.province_name}`);
    });
    
    console.log('\nMunicipalities:');
    municipalities.rows.slice(0, 3).forEach((m: any) => {
      console.log(`   ${m.municipality_code} - ${m.municipality_name}`);
    });
    
    console.log('\nWards:');
    wards.rows.slice(0, 3).forEach((w: any) => {
      console.log(`   ${w.ward_code} - ${w.ward_name}`);
    });
    
    console.log('\nVoting Districts:');
    votingDistricts.rows.slice(0, 3).forEach((vd: any) => {
      console.log(`   ${vd.voting_district_code} - ${vd.voting_district_name}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fetchLookupData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

