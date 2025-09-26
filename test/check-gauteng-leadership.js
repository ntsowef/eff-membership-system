const mysql = require('mysql2/promise');

async function checkGauteng() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
  
  try {
    console.log('🔍 Checking Gauteng province...');
    const [provinces] = await connection.execute('SELECT * FROM provinces WHERE province_name LIKE "%Gauteng%"');
    console.log('Gauteng Province:', JSON.stringify(provinces, null, 2));
    
    console.log('\n🔍 Checking provincial leadership positions...');
    const [positions] = await connection.execute('SELECT * FROM leadership_positions WHERE hierarchy_level = "Province" LIMIT 5');
    console.log('Provincial Positions:', JSON.stringify(positions, null, 2));
    
    console.log('\n🔍 Checking active provincial appointments for Gauteng...');
    const [appointments] = await connection.execute(`
      SELECT la.*, lp.position_name, CONCAT(m.firstname, ' ', m.surname) as member_name
      FROM leadership_appointments la
      JOIN leadership_positions lp ON la.position_id = lp.id
      JOIN members m ON la.member_id = m.member_id
      WHERE la.hierarchy_level = 'Province' 
      AND la.entity_id IN (SELECT id FROM provinces WHERE province_name LIKE '%Gauteng%')
      AND la.appointment_status = 'Active'
      LIMIT 10
    `);
    console.log('Gauteng Leadership:', JSON.stringify(appointments, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkGauteng();
