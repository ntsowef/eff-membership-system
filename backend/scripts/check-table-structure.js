const mysql = require('mysql2/promise');

async function checkTableStructure() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking table structures for voting districts views...\n');
    
    // Check members table structure
    const [membersColumns] = await connection.execute('DESCRIBE members');
    console.log('📋 Members table columns:');
    membersColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n📋 Voting Districts table columns:');
    const [vdColumns] = await connection.execute('DESCRIBE voting_districts');
    vdColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n📋 Wards table columns:');
    const [wardsColumns] = await connection.execute('DESCRIBE wards');
    wardsColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n📋 Municipalities table columns:');
    const [municipalitiesColumns] = await connection.execute('DESCRIBE municipalities');
    municipalitiesColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check if voting_districts table has the expected columns
    const vdColumnNames = vdColumns.map(col => col.Field);
    const expectedVDColumns = ['voting_district_code', 'voting_district_name', 'voting_district_number', 'ward_code', 'is_active'];
    
    console.log('\n🔍 Checking voting_districts table structure:');
    expectedVDColumns.forEach(col => {
      const exists = vdColumnNames.includes(col);
      console.log(`   ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
    
    // Check if members table has voting_district_code column
    const membersColumnNames = membersColumns.map(col => col.Field);
    const hasVotingDistrictCode = membersColumnNames.includes('voting_district_code');
    console.log(`\n🔍 Members table has voting_district_code: ${hasVotingDistrictCode ? '✅ YES' : '❌ NO'}`);
    
    // Check if wards table has the expected columns
    const wardsColumnNames = wardsColumns.map(col => col.Field);
    const expectedWardsColumns = ['ward_code', 'ward_name', 'ward_number', 'municipality_code'];
    
    console.log('\n🔍 Checking wards table structure:');
    expectedWardsColumns.forEach(col => {
      const exists = wardsColumnNames.includes(col);
      console.log(`   ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
    
    // Check municipalities table
    const municipalitiesColumnNames = municipalitiesColumns.map(col => col.Field);
    const expectedMunicipalitiesColumns = ['municipality_code', 'municipality_name', 'district_code'];
    
    console.log('\n🔍 Checking municipalities table structure:');
    expectedMunicipalitiesColumns.forEach(col => {
      const exists = municipalitiesColumnNames.includes(col);
      console.log(`   ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
    
    // Check for any existing views
    const [existingViews] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = 'membership_new'
      AND TABLE_NAME LIKE '%voting%'
    `);
    
    console.log('\n📊 Existing voting-related views:');
    if (existingViews.length > 0) {
      existingViews.forEach(view => {
        console.log(`   ${view.TABLE_NAME}`);
      });
    } else {
      console.log('   No voting-related views found');
    }
    
    // Sample data check
    const [sampleMembers] = await connection.execute(`
      SELECT member_id, firstname, surname, ward_code, voting_district_code
      FROM members 
      WHERE voting_district_code IS NOT NULL
      LIMIT 5
    `);
    
    console.log('\n📊 Sample members with voting districts:');
    if (sampleMembers.length > 0) {
      sampleMembers.forEach(member => {
        console.log(`   ${member.member_id}: ${member.firstname} ${member.surname || ''}`);
        console.log(`      Ward: ${member.ward_code}, VD: ${member.voting_district_code}`);
      });
    } else {
      console.log('   No members found with voting_district_code');
    }
    
    // Check voting districts data
    const [sampleVDs] = await connection.execute(`
      SELECT voting_district_code, voting_district_name, voting_district_number, ward_code, is_active
      FROM voting_districts 
      WHERE ward_code = '59500105'
      LIMIT 5
    `);
    
    console.log('\n📊 Sample voting districts for ward 59500105:');
    if (sampleVDs.length > 0) {
      sampleVDs.forEach(vd => {
        console.log(`   ${vd.voting_district_code}: VD ${vd.voting_district_number} - ${vd.voting_district_name}`);
        console.log(`      Ward: ${vd.ward_code}, Active: ${vd.is_active ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No voting districts found for ward 59500105');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTableStructure();
