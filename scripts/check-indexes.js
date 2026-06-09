const { Pool } = require('pg');
const p = new Pool({
  host: 'localhost', port: 5432, user: 'eff_admin',
  password: 'Frames!123', database: 'eff_membership_database'
});

async function main() {
  try {
    let r = await p.query("SELECT indexname FROM pg_indexes WHERE tablename = 'audit_logs' ORDER BY indexname");
    console.log('--- audit_logs indexes ---');
    r.rows.forEach(row => console.log(' ', row.indexname));

    r = await p.query("SELECT indexname FROM pg_indexes WHERE tablename = 'member_renewal_log' ORDER BY indexname");
    console.log('--- member_renewal_log indexes ---');
    r.rows.forEach(row => console.log(' ', row.indexname));

    r = await p.query("SELECT indexname FROM pg_indexes WHERE tablename = 'members_consolidated' ORDER BY indexname");
    console.log('--- members_consolidated indexes ---');
    r.rows.forEach(row => console.log(' ', row.indexname));

    r = await p.query("SELECT COUNT(*) as cnt FROM audit_logs");
    console.log('audit_logs rows:', r.rows[0].cnt);

    r = await p.query("SELECT COUNT(*) as cnt FROM member_renewal_log");
    console.log('member_renewal_log rows:', r.rows[0].cnt);

    r = await p.query("SELECT COUNT(*) as cnt FROM users WHERE admin_level = 'province' AND is_active = true");
    console.log('provincial admins:', r.rows[0].cnt);

    // Check if there's an index on members_consolidated.province_code
    r = await p.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'members_consolidated' AND indexdef LIKE '%province_code%'");
    console.log('--- members_consolidated province_code indexes ---');
    r.rows.forEach(row => console.log(' ', row.indexname, '-', row.indexdef));

    // Check audit_logs user_id index
    r = await p.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'audit_logs' AND indexdef LIKE '%user_id%'");
    console.log('--- audit_logs user_id indexes ---');
    r.rows.forEach(row => console.log(' ', row.indexname, '-', row.indexdef));

  } finally {
    p.end();
  }
}
main();

