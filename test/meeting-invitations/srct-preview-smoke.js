const mysql = require('mysql2/promise');

(async()=>{
  const c=await mysql.createConnection({host:'localhost',user:'root',password:'',database:'membership_new'});
  const muniCode = process.env.MUNICIPALITY_CODE || 'BUF';
  const [mun] = await c.execute('SELECT id, municipality_name FROM municipalities WHERE municipality_code = ?', [muniCode]);
  if (!mun.length) { console.error('Municipality code not found:', muniCode); process.exit(1); }
  const muniId = mun[0].id;
  console.log(`Municipality ${muniCode} (${mun[0].municipality_name}) -> id=${muniId}`);

  const [rows] = await c.execute(`
    SELECT m.member_id, TRIM(CONCAT(COALESCE(m.firstname,''),' ',COALESCE(m.surname,''))) AS name,
           lp.position_name, lp.position_code
    FROM leadership_appointments la
    JOIN leadership_positions lp ON la.position_id = lp.id
    JOIN members m ON la.member_id = m.member_id
    WHERE la.appointment_status = 'Active'
      AND la.hierarchy_level = 'Municipality'
      AND la.entity_id = ?
      AND lp.is_active = TRUE
    ORDER BY lp.order_index
  `, [muniId]);

  console.log(`Found ${rows.length} active municipal leaders for ${muniCode}`);
  rows.slice(0,10).forEach((r,i)=>console.log(`${i+1}. ${r.name} - ${r.position_name} (${r.position_code})`));

  await c.end();
})().catch(e=>{console.error(e); process.exit(1);});

