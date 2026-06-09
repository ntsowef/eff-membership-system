const { Pool } = require('pg');
const pool = new Pool({
  host: '69.164.245.173', port: 5432, user: 'eff_admin',
  password: 'Frames!123', database: 'eff_membership_database', connectionTimeoutMillis: 10000,
});

async function run() {
  const client = await pool.connect();
  console.log('✅ Connected to production\n');

  // 1. Understand status columns
  const r1 = await client.query('SELECT DISTINCT membership_status_id, COUNT(*) as cnt FROM members_consolidated GROUP BY membership_status_id ORDER BY cnt DESC');
  console.log('membership_status_id distribution:');
  r1.rows.forEach(r => console.log(`  ID ${r.membership_status_id} → ${Number(r.cnt).toLocaleString()}`));

  const r2 = await client.query('SELECT DISTINCT payment_status, COUNT(*) as cnt FROM members_consolidated GROUP BY payment_status ORDER BY cnt DESC LIMIT 15');
  console.log('\npayment_status distribution:');
  r2.rows.forEach(r => console.log(`  "${r.payment_status || 'NULL'}" → ${Number(r.cnt).toLocaleString()}`));

  // 2. Check for lookup table
  const r3 = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%membership_status%' OR table_name ILIKE '%statuses%' ORDER BY table_name`);
  console.log('\nLookup tables:', r3.rows.map(r => r.table_name).join(', '));

  if (r3.rows.length > 0) {
    for (const t of r3.rows) {
      try {
        const lr = await client.query(`SELECT * FROM ${t.table_name} LIMIT 20`);
        console.log(`\n${t.table_name}:`);
        lr.rows.forEach(r => console.log('  ', JSON.stringify(r)));
      } catch (e) { console.log(`  Error reading ${t.table_name}: ${e.message}`); }
    }
  }

  // 3. SMS-eligible + active (not expired) + good standing
  const hasPhone = `cell_number IS NOT NULL AND TRIM(cell_number) != ''`;

  const main = await client.query(`
    SELECT
      COUNT(*) AS total_members,
      COUNT(CASE WHEN ${hasPhone} THEN 1 END) AS with_phone,
      COUNT(CASE WHEN ${hasPhone} AND expiry_date >= CURRENT_DATE THEN 1 END) AS active_with_phone,
      COUNT(CASE WHEN ${hasPhone} AND expiry_date >= CURRENT_DATE AND (payment_status IS NULL OR payment_status NOT ILIKE '%fail%') THEN 1 END) AS good_standing_with_phone
    FROM members_consolidated
  `);
  const m = main.rows[0];

  // 4. Detailed breakdown: active + phone + by payment_status
  const detail = await client.query(`
    SELECT
      COALESCE(payment_status, 'NULL') AS pstatus,
      COUNT(*) AS cnt
    FROM members_consolidated
    WHERE ${hasPhone} AND expiry_date >= CURRENT_DATE
    GROUP BY payment_status
    ORDER BY cnt DESC
  `);

  // 5. Breakdown by membership_status_id among active+phone
  const statusDetail = await client.query(`
    SELECT
      membership_status_id,
      COUNT(*) AS cnt
    FROM members_consolidated
    WHERE ${hasPhone} AND expiry_date >= CURRENT_DATE
    GROUP BY membership_status_id
    ORDER BY cnt DESC
  `);

  console.log('\n' + '═'.repeat(60));
  console.log('SMS ELIGIBLE & IN GOOD STANDING — PRODUCTION');
  console.log('═'.repeat(60));
  console.log(`  Total members:                    ${Number(m.total_members).toLocaleString()}`);
  console.log(`  With phone number:                ${Number(m.with_phone).toLocaleString()}`);
  console.log(`  Active + phone (not expired):     ${Number(m.active_with_phone).toLocaleString()}`);
  console.log(`  Good standing + active + phone:   ${Number(m.good_standing_with_phone).toLocaleString()}`);

  const pct = m.total_members > 0 ? ((m.good_standing_with_phone / m.total_members) * 100).toFixed(2) : '0';
  console.log(`  % of total membership:            ${pct}%`);

  console.log('\n─ Payment status breakdown (active + phone):');
  detail.rows.forEach(r => {
    console.log(`    ${(r.pstatus).padEnd(25)} ${Number(r.cnt).toLocaleString()}`);
  });

  console.log('\n─ Membership status ID breakdown (active + phone):');
  statusDetail.rows.forEach(r => {
    console.log(`    Status ID ${String(r.membership_status_id).padEnd(10)} ${Number(r.cnt).toLocaleString()}`);
  });

  // 6. Final recommended count
  console.log('\n' + '═'.repeat(60));
  console.log('RECOMMENDATION');
  console.log('═'.repeat(60));
  console.log(`  Members eligible to receive SMS (active, have phone,`);
  console.log(`  in good standing): ${Number(m.good_standing_with_phone).toLocaleString()}`);
  console.log('═'.repeat(60));

  client.release();
  await pool.end();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });

