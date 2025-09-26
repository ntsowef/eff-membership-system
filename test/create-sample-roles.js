const mysql = require('mysql2/promise');

async function createSampleRoles() {
  console.log('🎭 Creating Sample Member Roles for Invitation Testing...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Get some sample members
    console.log('📋 Getting sample members...');
    const [members] = await connection.execute(`
      SELECT m.member_id, m.firstname, m.surname 
      FROM members m 
      INNER JOIN memberships ms ON m.member_id = ms.member_id
      INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE mst.is_active = TRUE
      LIMIT 20
    `);

    if (members.length === 0) {
      console.log('❌ No active members found!');
      return;
    }

    console.log(`   Found ${members.length} active members to assign roles to`);

    // Get organizational roles
    const [roles] = await connection.execute(`
      SELECT role_id, role_name, role_code, hierarchy_level 
      FROM organizational_roles 
      WHERE is_active = TRUE
      ORDER BY hierarchy_level, role_code
    `);

    console.log(`   Found ${roles.length} organizational roles available`);

    // Create sample role assignments
    console.log('\n🎯 Assigning roles to members...');
    
    let assignmentCount = 0;
    
    // Assign National roles (President, Secretary General, etc.)
    const nationalRoles = roles.filter(r => r.hierarchy_level === 'National');
    for (let i = 0; i < Math.min(5, nationalRoles.length, members.length); i++) {
      const member = members[i];
      const role = nationalRoles[i];
      
      await connection.execute(`
        INSERT INTO member_roles (member_id, role_id, entity_type, entity_id, is_active, appointment_date)
        VALUES (?, ?, 'National', 1, TRUE, CURDATE())
      `, [member.member_id, role.role_id]);
      
      console.log(`   ✅ ${member.firstname} ${member.surname} → ${role.role_name}`);
      assignmentCount++;
    }

    // Assign Provincial roles
    const provincialRoles = roles.filter(r => r.hierarchy_level === 'Provincial');
    for (let i = 0; i < Math.min(4, provincialRoles.length, members.length - 5); i++) {
      const member = members[i + 5];
      const role = provincialRoles[i];
      
      await connection.execute(`
        INSERT INTO member_roles (member_id, role_id, entity_type, entity_id, is_active, appointment_date)
        VALUES (?, ?, 'Province', 1, TRUE, CURDATE())
      `, [member.member_id, role.role_id]);
      
      console.log(`   ✅ ${member.firstname} ${member.surname} → ${role.role_name}`);
      assignmentCount++;
    }

    // Assign Ward/Branch roles (these are key for NPA meetings)
    const wardRoles = roles.filter(r => r.hierarchy_level === 'Ward');
    for (let i = 0; i < Math.min(6, wardRoles.length, members.length - 9); i++) {
      const member = members[i + 9];
      const role = wardRoles[i % wardRoles.length]; // Cycle through ward roles
      
      await connection.execute(`
        INSERT INTO member_roles (member_id, role_id, entity_type, entity_id, is_active, appointment_date)
        VALUES (?, ?, 'Ward', ?, TRUE, CURDATE())
      `, [member.member_id, role.role_id, i + 1]); // Different ward IDs
      
      console.log(`   ✅ ${member.firstname} ${member.surname} → ${role.role_name} (Ward ${i + 1})`);
      assignmentCount++;
    }

    // Assign Municipal roles
    const municipalRoles = roles.filter(r => r.hierarchy_level === 'Municipal');
    for (let i = 0; i < Math.min(2, municipalRoles.length, members.length - 15); i++) {
      const member = members[i + 15];
      const role = municipalRoles[i];
      
      await connection.execute(`
        INSERT INTO member_roles (member_id, role_id, entity_type, entity_id, is_active, appointment_date)
        VALUES (?, ?, 'Municipality', 1, TRUE, CURDATE())
      `, [member.member_id, role.role_id]);
      
      console.log(`   ✅ ${member.firstname} ${member.surname} → ${role.role_name}`);
      assignmentCount++;
    }

    console.log(`\n🎉 Successfully assigned ${assignmentCount} roles to members!`);

    // Verify the assignments
    console.log('\n🔍 Verifying role assignments...');
    const [verification] = await connection.execute(`
      SELECT COUNT(*) as count FROM member_roles WHERE is_active = TRUE
    `);
    console.log(`   Total active member roles: ${verification[0].count}`);

    // Test invitation query
    console.log('\n🧪 Testing invitation query for NPA meeting...');
    const [invitationTest] = await connection.execute(`
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
    console.log(`   Members eligible for NPA invitations: ${invitationTest[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the script
createSampleRoles().catch(console.error);
