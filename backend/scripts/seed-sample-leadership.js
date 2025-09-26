const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_new'
};

async function seedSampleLeadership() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🌱 Seeding sample leadership appointments...');
    
    // First, let's check what entities we have
    console.log('\n📋 Checking available entities...');
    
    const [provinces] = await connection.execute('SELECT id, province_name, province_code FROM provinces LIMIT 3');
    console.log('Provinces:', provinces.map(p => `${p.province_name} (${p.province_code}) - ID: ${p.id}`));
    
    const [municipalities] = await connection.execute('SELECT id, municipality_name, municipality_code FROM municipalities LIMIT 3');
    console.log('Municipalities:', municipalities.map(m => `${m.municipality_name} (${m.municipality_code}) - ID: ${m.id}`));
    
    const [wards] = await connection.execute('SELECT id, ward_code FROM wards LIMIT 3');
    console.log('Wards:', wards.map(w => `Ward ${w.ward_code} - ID: ${w.id}`));
    
    // Check available leadership positions
    const [positions] = await connection.execute(`
      SELECT id, position_name, position_code, hierarchy_level 
      FROM leadership_positions 
      WHERE is_active = TRUE 
      ORDER BY hierarchy_level, order_index
    `);
    console.log('\n📋 Available leadership positions:');
    positions.forEach(p => console.log(`  ${p.hierarchy_level}: ${p.position_name} (${p.position_code}) - ID: ${p.id}`));
    
    // Get some sample members
    const [members] = await connection.execute('SELECT member_id, firstname, surname FROM members LIMIT 10');
    console.log('\n👥 Sample members available:', members.length);
    
    if (members.length === 0) {
      console.log('❌ No members found in database. Cannot seed leadership appointments.');
      return;
    }
    
    // Sample leadership appointments to create
    const appointments = [];
    
    // Provincial leadership (KZN)
    if (provinces.length > 0 && positions.some(p => p.hierarchy_level === 'Province')) {
      const kznProvince = provinces.find(p => p.province_code === 'KZN') || provinces[0];
      const provincialPositions = positions.filter(p => p.hierarchy_level === 'Province');
      
      for (let i = 0; i < Math.min(3, provincialPositions.length, members.length); i++) {
        appointments.push({
          member_id: members[i].member_id,
          position_id: provincialPositions[i].id,
          entity_id: kznProvince.id,
          hierarchy_level: 'Province',
          appointment_status: 'Active',
          start_date: '2024-01-01',
          member_name: `${members[i].firstname} ${members[i].surname || ''}`.trim(),
          position_name: provincialPositions[i].position_name
        });
      }
    }
    
    // Municipal leadership
    if (municipalities.length > 0 && positions.some(p => p.hierarchy_level === 'Municipality')) {
      const municipality = municipalities[0];
      const municipalPositions = positions.filter(p => p.hierarchy_level === 'Municipality');
      
      for (let i = 0; i < Math.min(2, municipalPositions.length, members.length - 3); i++) {
        appointments.push({
          member_id: members[i + 3].member_id,
          position_id: municipalPositions[i].id,
          entity_id: municipality.id,
          hierarchy_level: 'Municipality',
          appointment_status: 'Active',
          start_date: '2024-01-01',
          member_name: `${members[i + 3].firstname} ${members[i + 3].surname || ''}`.trim(),
          position_name: municipalPositions[i].position_name
        });
      }
    }
    
    // Ward leadership
    if (wards.length > 0 && positions.some(p => p.hierarchy_level === 'Ward')) {
      const ward = wards[0];
      const wardPositions = positions.filter(p => p.hierarchy_level === 'Ward');
      
      for (let i = 0; i < Math.min(2, wardPositions.length, members.length - 5); i++) {
        appointments.push({
          member_id: members[i + 5].member_id,
          position_id: wardPositions[i].id,
          entity_id: ward.id,
          hierarchy_level: 'Ward',
          appointment_status: 'Active',
          start_date: '2024-01-01',
          member_name: `${members[i + 5].firstname} ${members[i + 5].surname || ''}`.trim(),
          position_name: wardPositions[i].position_name
        });
      }
    }
    
    console.log(`\n🎯 Creating ${appointments.length} leadership appointments...`);
    
    // Insert appointments
    for (const appointment of appointments) {
      try {
        await connection.execute(`
          INSERT INTO leadership_appointments
          (member_id, position_id, entity_id, hierarchy_level, appointment_status, start_date, appointed_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `, [
          appointment.member_id,
          appointment.position_id,
          appointment.entity_id,
          appointment.hierarchy_level,
          appointment.appointment_status,
          appointment.start_date
        ]);
        
        console.log(`✅ Appointed ${appointment.member_name} as ${appointment.position_name} (${appointment.hierarchy_level})`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  ${appointment.member_name} already appointed as ${appointment.position_name}`);
        } else {
          console.log(`❌ Failed to appoint ${appointment.member_name}: ${error.message}`);
        }
      }
    }
    
    // Verify appointments were created
    const [appointmentCount] = await connection.execute(`
      SELECT 
        hierarchy_level,
        COUNT(*) as count
      FROM leadership_appointments 
      WHERE appointment_status = 'Active'
      GROUP BY hierarchy_level
    `);
    
    console.log('\n📊 Active leadership appointments by level:');
    appointmentCount.forEach(row => {
      console.log(`  ${row.hierarchy_level}: ${row.count} appointments`);
    });
    
    console.log('\n✅ Sample leadership seeding completed!');
    console.log('💡 You can now test meeting invitations - they should generate invitations for these leaders.');
    
  } catch (error) {
    console.error('❌ Error seeding leadership:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the seeding
seedSampleLeadership().catch(error => {
  console.error('💥 Seeding failed:', error.message);
  process.exit(1);
});
