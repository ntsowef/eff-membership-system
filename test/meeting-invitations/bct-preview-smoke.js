const mysql = require('mysql2/promise');

(async()=>{
  const c=await mysql.createConnection({host:'localhost',user:'root',password:'',database:'membership_new'});
  const wardCode = process.env.WARD_CODE || '10503001';
  const [ward] = await c.execute('SELECT id, ward_number FROM wards WHERE ward_code = ?', [wardCode]);
  if (!ward.length) { console.error('Ward code not found:', wardCode); process.exit(1); }
  const wardId = ward[0].id;
  console.log(`Ward ${wardCode} (Ward ${ward[0].ward_number}) -> id=${wardId}`);

  const [rows] = await c.execute(`
    SELECT m.member_id, TRIM(CONCAT(COALESCE(m.firstname,''),' ',COALESCE(m.surname,''))) AS name,
           lp.position_name, lp.position_code
    FROM leadership_appointments la
    JOIN leadership_positions lp ON la.position_id = lp.id
    JOIN members m ON la.member_id = m.member_id
    WHERE la.appointment_status = 'Active'
      AND la.hierarchy_level = 'Ward'
      AND la.entity_id = ?
      AND lp.is_active = TRUE
    ORDER BY lp.order_index
  `, [wardId]);

  console.log(`Found ${rows.length} active ward leaders for ${wardCode}`);
  rows.slice(0,10).forEach((r,i)=>console.log(`${i+1}. ${r.name} - ${r.position_name} (${r.position_code})`));

  await c.end();
})().catch(e=>{console.error(e); process.exit(1);});

