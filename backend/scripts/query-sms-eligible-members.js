const { Pool } = require('pg');

const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  connectionTimeoutMillis: 10000,
});

async function run() {
  const client = await pool.connect();
  console.log('✅ Connected to production database\n');

  try {
    // 1. Find phone columns
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
        AND (column_name ILIKE '%phone%' OR column_name ILIKE '%cell%'
             OR column_name ILIKE '%mobile%' OR column_name ILIKE '%contact%'
             OR column_name ILIKE '%sms%' OR column_name ILIKE '%tel%')
      ORDER BY ordinal_position
    `);
    const phoneCols = cols.rows.map(r => r.column_name);
    console.log(`📱 Phone-related columns found: ${phoneCols.join(', ') || 'NONE'}\n`);

    // 2. Count per phone column
    if (phoneCols.length > 0) {
      console.log('─'.repeat(60));
      console.log('PHONE COLUMN BREAKDOWN');
      console.log('─'.repeat(60));
      for (const col of phoneCols) {
        const r = await client.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN ${col} IS NOT NULL AND TRIM(${col}) != '' THEN 1 END) AS has_value,
            COUNT(CASE WHEN ${col} IS NULL OR TRIM(${col}) = '' THEN 1 END) AS empty
          FROM members_consolidated
        `);
        const row = r.rows[0];
        console.log(`  ${col.padEnd(25)} has_value: ${String(row.has_value).padStart(8)}  |  empty: ${String(row.empty).padStart(8)}  |  total: ${row.total}`);
      }
    }

    // 3. Overall SMS eligibility (any phone column has a value)
    const anyPhoneExpr = phoneCols.length > 0
      ? phoneCols.map(c => `(${c} IS NOT NULL AND TRIM(${c}) != '')`).join(' OR ')
      : 'FALSE';

    const summary = await client.query(`
      SELECT
        COUNT(*) AS total_members,
        COUNT(CASE WHEN ${anyPhoneExpr} THEN 1 END) AS sms_eligible,
        COUNT(CASE WHEN NOT (${anyPhoneExpr}) THEN 1 END) AS not_eligible
      FROM members_consolidated
    `);
    const s = summary.rows[0];
    const pct = s.total_members > 0 ? ((s.sms_eligible / s.total_members) * 100).toFixed(2) : '0.00';

    console.log('\n' + '═'.repeat(60));
    console.log('SMS ELIGIBILITY SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Total members:              ${Number(s.total_members).toLocaleString()}`);
    console.log(`  SMS-eligible (have phone):  ${Number(s.sms_eligible).toLocaleString()}`);
    console.log(`  Not SMS-eligible:           ${Number(s.not_eligible).toLocaleString()}`);
    console.log(`  SMS-eligible percentage:    ${pct}%`);

    // 4. Active vs expired among SMS-eligible
    // Check which status/expiry columns exist
    const statusCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
        AND (column_name ILIKE '%expiry%' OR column_name ILIKE '%status%'
             OR column_name ILIKE '%membership_status%' OR column_name ILIKE '%active%')
      ORDER BY ordinal_position
    `);
    const statusColNames = statusCols.rows.map(r => r.column_name);
    console.log(`\n📊 Status/expiry columns: ${statusColNames.join(', ') || 'NONE'}`);

    const hasExpiry = statusColNames.includes('expiry_date');
    const hasStatus = statusColNames.includes('membership_status');

    if (hasExpiry || hasStatus) {
      let activeExpr = 'TRUE';
      if (hasExpiry && hasStatus) {
        activeExpr = `(expiry_date >= CURRENT_DATE OR membership_status ILIKE 'active')`;
      } else if (hasExpiry) {
        activeExpr = `expiry_date >= CURRENT_DATE`;
      } else if (hasStatus) {
        activeExpr = `membership_status ILIKE 'active'`;
      }

      const activeResult = await client.query(`
        SELECT
          COUNT(*) AS sms_eligible_total,
          COUNT(CASE WHEN ${activeExpr} THEN 1 END) AS active_sms_eligible,
          COUNT(CASE WHEN NOT (${activeExpr}) THEN 1 END) AS expired_sms_eligible
        FROM members_consolidated
        WHERE ${anyPhoneExpr}
      `);
      const a = activeResult.rows[0];
      const activePct = a.sms_eligible_total > 0 ? ((a.active_sms_eligible / a.sms_eligible_total) * 100).toFixed(2) : '0.00';

      console.log('\n' + '═'.repeat(60));
      console.log('ACTIVE vs EXPIRED (among SMS-eligible members)');
      console.log('═'.repeat(60));
      console.log(`  SMS-eligible total:         ${Number(a.sms_eligible_total).toLocaleString()}`);
      console.log(`  Active (can receive SMS):   ${Number(a.active_sms_eligible).toLocaleString()}  (${activePct}%)`);
      console.log(`  Expired:                    ${Number(a.expired_sms_eligible).toLocaleString()}`);

      // Bonus: breakdown by membership_status if it exists
      if (hasStatus) {
        const statusBreakdown = await client.query(`
          SELECT membership_status, COUNT(*) AS cnt
          FROM members_consolidated
          WHERE ${anyPhoneExpr}
          GROUP BY membership_status
          ORDER BY cnt DESC
        `);
        console.log('\n  Status breakdown (SMS-eligible):');
        statusBreakdown.rows.forEach(r => {
          console.log(`    ${(r.membership_status || 'NULL').padEnd(20)} ${Number(r.cnt).toLocaleString()}`);
        });
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Query complete');
    console.log('═'.repeat(60));

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });

