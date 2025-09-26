const mysql = require('mysql2/promise');
(async()=>{
  const c=await mysql.createConnection({host:'localhost',user:'root',password:'',database:'membership_new'});
  const [rows]=await c.execute("SELECT type_id,type_code,hierarchy_level FROM meeting_types WHERE type_code IN ('pct_ordinary','srct_ordinary','bct_ordinary')");
  console.table(rows);
  await c.end();
})().catch(e=>{console.error(e);process.exit(1);});

