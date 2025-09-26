const mysql = require('mysql2/promise');

async function checkMembersSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('=== MEMBERS TABLE SCHEMA ===');
    const [membersSchema] = await connection.execute('DESCRIBE members');
    console.table(membersSchema);

    console.log('\n=== MEMBER_ROLES TABLE SCHEMA ===');
    const [memberRolesSchema] = await connection.execute('DESCRIBE member_roles');
    console.table(memberRolesSchema);

    console.log('\n=== ORGANIZATIONAL_ROLES TABLE SCHEMA ===');
    const [orgRolesSchema] = await connection.execute('DESCRIBE organizational_roles');
    console.table(orgRolesSchema);

    console.log('\n=== SAMPLE MEMBERS DATA ===');
    const [sampleMembers] = await connection.execute('SELECT * FROM members LIMIT 3');
    console.table(sampleMembers);

    console.log('\n=== SAMPLE MEMBER_ROLES DATA ===');
    const [sampleMemberRoles] = await connection.execute('SELECT * FROM member_roles LIMIT 3');
    console.table(sampleMemberRoles);

    console.log('\n=== SAMPLE ORGANIZATIONAL_ROLES DATA ===');
    const [sampleOrgRoles] = await connection.execute('SELECT * FROM organizational_roles LIMIT 3');
    console.table(sampleOrgRoles);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMembersSchema();
