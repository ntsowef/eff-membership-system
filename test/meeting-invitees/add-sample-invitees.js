const mysql = require('mysql2/promise');

async function addSampleInvitees() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔄 Adding sample meeting invitees...');

    // First, let's check if we have any members
    const [members] = await connection.execute(
      'SELECT member_id, firstname, surname, id_number FROM members LIMIT 10'
    );

    if (members.length === 0) {
      console.log('❌ No members found in database. Please add some members first.');
      return;
    }

    console.log(`✅ Found ${members.length} members to invite`);

    // Check if meeting 28 exists
    const [meetings] = await connection.execute(
      'SELECT id, title FROM meetings WHERE id = 28'
    );

    if (meetings.length === 0) {
      console.log('❌ Meeting 28 not found. Please use a valid meeting ID.');
      return;
    }

    console.log(`✅ Found meeting: ${meetings[0].title}`);

    // Clear existing attendance records for this meeting
    await connection.execute(
      'DELETE FROM meeting_attendance WHERE meeting_id = 28'
    );

    console.log('🧹 Cleared existing attendance records');

    // Add sample invitees with different statuses (using existing table structure)
    const attendanceStatuses = [
      'Present',
      'Present',
      'Absent',
      'Excused',
      'Present',
      'Absent',
      'Late',
      'Excused',
    ];

    for (let i = 0; i < Math.min(members.length, attendanceStatuses.length); i++) {
      const member = members[i];
      const status = attendanceStatuses[i];

      await connection.execute(`
        INSERT INTO meeting_attendance (
          meeting_id, member_id, attendance_status, attendance_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `, [
        28, // meeting_id
        member.member_id,
        status,
        `Sample attendance record for ${member.firstname} ${member.surname}`
      ]);

      console.log(`✅ Added attendee: ${member.firstname} ${member.surname} - ${status}`);
    }

    // Verify the data was added
    const [attendanceRecords] = await connection.execute(`
      SELECT
        ma.*,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
        m.id_number as member_id_number
      FROM meeting_attendance ma
      LEFT JOIN members m ON ma.member_id = m.member_id
      WHERE ma.meeting_id = 28
      ORDER BY m.firstname, m.surname
    `);

    console.log(`\n📊 Summary for Meeting 28:`);
    console.log(`Total Attendees: ${attendanceRecords.length}`);
    console.log(`Present: ${attendanceRecords.filter(r => r.attendance_status === 'Present').length}`);
    console.log(`Absent: ${attendanceRecords.filter(r => r.attendance_status === 'Absent').length}`);
    console.log(`Late: ${attendanceRecords.filter(r => r.attendance_status === 'Late').length}`);
    console.log(`Excused: ${attendanceRecords.filter(r => r.attendance_status === 'Excused').length}`);

    console.log('\n🎉 Sample invitees added successfully!');
    console.log('You can now view the meeting at: http://localhost:3000/admin/meetings/28');

  } catch (error) {
    console.error('❌ Error adding sample invitees:', error);
  } finally {
    await connection.end();
  }
}

// Run the script
addSampleInvitees().catch(console.error);
