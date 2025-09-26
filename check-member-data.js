const mysql = require('mysql2/promise');

async function checkMemberData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking vw_enhanced_member_search view...\n');

    // Check what columns are available
    const [columns] = await connection.execute('DESCRIBE vw_enhanced_member_search');
    console.log('📊 Available columns with date/join/created:');
    columns.forEach(col => {
      if (col.Field.includes('date') || col.Field.includes('join') || col.Field.includes('created')) {
        console.log(`   - ${col.Field}: ${col.Type}`);
      }
    });

    // Check a sample record for member 213812
    const [sample] = await connection.execute(
      'SELECT member_id, firstname, surname, created_at, membership_date_joined FROM vw_enhanced_member_search WHERE member_id = ? LIMIT 1',
      [213812]
    );
    
    if (sample.length > 0) {
      console.log('\n📋 Sample record for member 213812:');
      console.table(sample);

      const member = sample[0];
      if (!member.created_at && !member.membership_date_joined) {
        console.log('\n❌ ISSUE: Member has no created_at or membership_date_joined');
      } else {
        console.log('\n✅ Member has date information');
        console.log(`   - created_at: ${member.created_at}`);
        console.log(`   - membership_date_joined: ${member.membership_date_joined}`);
      }
    } else {
      console.log('\n❌ Member 213812 not found in vw_enhanced_member_search');
    }
    
    // Check how many members have missing membership_date_joined
    const [missingDateJoined] = await connection.execute(
      'SELECT COUNT(*) as count FROM vw_enhanced_member_search WHERE membership_date_joined IS NULL'
    );

    console.log(`\n📊 Members with missing membership_date_joined: ${missingDateJoined[0].count}`);

    // Check how many have created_at
    const [hasCreatedAt] = await connection.execute(
      'SELECT COUNT(*) as count FROM vw_enhanced_member_search WHERE created_at IS NOT NULL'
    );

    console.log(`📊 Members with created_at: ${hasCreatedAt[0].count}`);

    // Show a few examples of the data structure
    console.log('\n🔍 Sample of 3 members from vw_enhanced_member_search:');
    const [sampleMembers] = await connection.execute(
      'SELECT member_id, firstname, surname, created_at, membership_date_joined FROM vw_enhanced_member_search LIMIT 3'
    );
    console.table(sampleMembers);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMemberData();
