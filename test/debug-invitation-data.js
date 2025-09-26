const mysql = require('mysql2/promise');

async function debugInvitationData() {
  console.log('🔍 Debugging Invitation Preview Data...\n');

  // Database connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // 1. Check total members
    console.log('📊 CHECKING DATABASE CONTENT:');
    const [members] = await connection.execute('SELECT COUNT(*) as count FROM members');
    console.log(`   Total Members: ${members[0].count}`);

    // 2. Check member roles
    const [memberRoles] = await connection.execute('SELECT COUNT(*) as count FROM member_roles WHERE is_active = TRUE');
    console.log(`   Active Member Roles: ${memberRoles[0].count}`);

    // 3. Check organizational roles
    const [orgRoles] = await connection.execute('SELECT COUNT(*) as count FROM organizational_roles WHERE is_active = TRUE');
    console.log(`   Active Organizational Roles: ${orgRoles[0].count}`);

    // 4. Check memberships
    const [memberships] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM memberships ms 
      JOIN membership_statuses mst ON ms.status_id = mst.status_id 
      WHERE mst.is_active = TRUE
    `);
    console.log(`   Active Memberships: ${memberships[0].count}`);

    console.log('\n🔍 CHECKING SPECIFIC ROLES FOR NPA MEETING:');
    
    // 5. Check for branch delegates, ward chairpersons, ward secretaries
    const [branchRoles] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM members m
      INNER JOIN member_roles mr ON m.member_id = mr.member_id
      INNER JOIN organizational_roles or_role ON mr.role_id = or_role.role_id
      INNER JOIN memberships ms ON m.member_id = ms.member_id
      INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE mr.is_active = TRUE 
        AND or_role.is_active = TRUE
        AND mst.is_active = TRUE
        AND (ms.expiry_date IS NULL OR ms.expiry_date >= CURDATE())
        AND or_role.role_code IN ('branch_delegate', 'ward_chairperson', 'ward_secretary')
    `);
    console.log(`   Members with Branch/Ward Roles: ${branchRoles[0].count}`);

    // 6. Check what role codes actually exist
    console.log('\n📋 AVAILABLE ROLE CODES:');
    const [roleCodes] = await connection.execute(`
      SELECT DISTINCT role_code, role_name, hierarchy_level 
      FROM organizational_roles 
      WHERE is_active = TRUE 
      ORDER BY hierarchy_level, role_code
    `);
    
    roleCodes.forEach(role => {
      console.log(`   ${role.hierarchy_level}: ${role.role_code} (${role.role_name})`);
    });

    // 7. Check for national leadership
    console.log('\n👑 NATIONAL LEADERSHIP ROLES:');
    const [nationalRoles] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM members m
      INNER JOIN member_roles mr ON m.member_id = mr.member_id
      INNER JOIN organizational_roles or_role ON mr.role_id = or_role.role_id
      WHERE mr.is_active = TRUE 
        AND or_role.is_active = TRUE
        AND or_role.hierarchy_level = 'National'
        AND (or_role.role_category = 'Executive' OR or_role.role_category = 'Leadership')
    `);
    console.log(`   National Leadership Members: ${nationalRoles[0].count}`);

    // 8. Check what categories exist
    console.log('\n📂 AVAILABLE ROLE CATEGORIES:');
    const [categories] = await connection.execute(`
      SELECT DISTINCT role_category, COUNT(*) as count
      FROM organizational_roles 
      WHERE is_active = TRUE 
      GROUP BY role_category
      ORDER BY role_category
    `);
    
    categories.forEach(cat => {
      console.log(`   ${cat.role_category}: ${cat.count} roles`);
    });

    // 9. Sample some actual members with roles
    console.log('\n👥 SAMPLE MEMBERS WITH ROLES:');
    const [sampleMembers] = await connection.execute(`
      SELECT 
        m.firstname, 
        m.surname, 
        or_role.role_name, 
        or_role.role_code,
        or_role.hierarchy_level,
        or_role.role_category
      FROM members m
      INNER JOIN member_roles mr ON m.member_id = mr.member_id
      INNER JOIN organizational_roles or_role ON mr.role_id = or_role.role_id
      INNER JOIN memberships ms ON m.member_id = ms.member_id
      INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE mr.is_active = TRUE 
        AND or_role.is_active = TRUE
        AND mst.is_active = TRUE
        AND (ms.expiry_date IS NULL OR ms.expiry_date >= CURDATE())
      LIMIT 10
    `);
    
    if (sampleMembers.length > 0) {
      sampleMembers.forEach(member => {
        console.log(`   ${member.firstname} ${member.surname}: ${member.role_name} (${member.role_code}) - ${member.hierarchy_level} ${member.role_category || 'N/A'}`);
      });
    } else {
      console.log('   ❌ No active members with roles found!');
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the debug
debugInvitationData().catch(console.error);
