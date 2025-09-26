const mysql = require('mysql2/promise');

(async function run(){
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'membership_new'});
  async function show(table){
    const [cols] = await conn.execute(`SHOW COLUMNS FROM ${table}`);
    console.log(`\n=== ${table} columns ===`);
    console.log(cols.map(c=>`${c.Field}(${c.Type})`).join(', '));
    const [rows] = await conn.execute(`SELECT * FROM ${table} LIMIT 5`);
    console.table(rows);
  }
  await show('provinces').catch(e=>console.error('provinces error', e.message));
  await show('districts').catch(()=>{});
  await show('municipalities').catch(e=>console.error('municipalities error', e.message));
  await show('wards').catch(e=>console.error('wards error', e.message));
  await show('leadership_positions').catch(e=>console.error('leadership_positions error', e.message));
  await show('leadership_appointments').catch(e=>console.error('leadership_appointments error', e.message));
  await conn.end();
})().catch(e=>{console.error(e); process.exit(1);});

