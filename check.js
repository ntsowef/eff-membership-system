const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://eff_admin:Frames!123@69.164.245.173:5432/eff_membership_database?schema=public' });
pool.query("SELECT definition FROM pg_matviews WHERE matviewname = 'mv_ward_compliance_summary'").then(res => { console.log(res.rows[0].definition); pool.end(); }).catch(console.error);
