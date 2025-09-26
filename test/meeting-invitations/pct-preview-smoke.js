const mysql = require('mysql2/promise');

(async()=>{
  const c=await mysql.createConnection({host:'localhost',user:'root',password:'',database:'membership_new'});
  const provinceCode = process.env.PROVINCE_CODE || 'WC';
  const [prov] = await c.execute('SELECT id, province_name FROM provinces WHERE province_code = ?', [provinceCode]);
  if (!prov.length) { console.error('Province code not found:', provinceCode); process.exit(1); }
  const provinceId = prov[0].id;
  console.log(`Province ${provinceCode} (${prov[0].province_name}) -> id=${provinceId}`);

  const [rows] = await c.execute(`
    SELECT m.member_id, TRIM(CONCAT(COALESCE(m.firstname,''),' ',COALESCE(m.surname,''))) AS name,
           lp.position_name, lp.position_code
    FROM leadership_appointments la
    JOIN leadership_positions lp ON la.position_id = lp.id
    JOIN members m ON la.member_id = m.member_id
    WHERE la.appointment_status = 'Active'
      AND la.hierarchy_level = 'Province'
      AND la.entity_id = ?
      AND lp.is_active = TRUE
    ORDER BY lp.order_index
  `, [provinceId]);

  console.log(`Found ${rows.length} active provincial leaders for ${provinceCode}`);
  rows.slice(0,10).forEach((r,i)=>console.log(`${i+1}. ${r.name} - ${r.position_name} (${r.position_code})`));

  await c.end();
})().catch(e=>{console.error(e); process.exit(1);});

