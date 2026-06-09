const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  port: 5432
});

async function check() {
  try {
    // Query 1: Expired members province breakdown (FIXED - uses JOIN with provinces table)
    const q1 = await pool.query(`
      SELECT
        m.province_code,
        p.province_name,
        COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) as expired_count,
        COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon_count,
        COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_urgent_count,
        COUNT(m.member_id) as total_members,
        ROUND(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) * 100.0 / NULLIF(COUNT(m.member_id), 0), 2) as expired_percentage
      FROM members_consolidated m
      JOIN provinces p ON m.province_code = p.province_code
      WHERE m.province_code IS NOT NULL
      GROUP BY m.province_code, p.province_name
      ORDER BY expired_count DESC
    `);
    console.log('=== EXPIRED MEMBERS PROVINCE BREAKDOWN (FIXED) ===');
    q1.rows.forEach(r => console.log(`  ${r.province_code}: ${r.province_name} (expired: ${r.expired_count}, total: ${r.total_members})`));

    // Query 2: Voter registration province breakdown (FIXED - uses JOIN with provinces table)
    const q2 = await pool.query(`
      SELECT
        mc.province_code,
        p.province_name,
        COUNT(*) as total_members,
        COUNT(CASE WHEN mc.voter_registration_id = 1 OR (mc.voter_registration_id IS NULL AND mc.voting_district_code != '222222222' AND mc.is_registered_voter = true) THEN 1 END) as registered_voters,
        COUNT(CASE WHEN mc.voter_registration_id = 2 OR (mc.voter_registration_id IS NULL AND mc.is_registered_voter = false) THEN 1 END) as not_registered_voters
      FROM members_consolidated mc
      JOIN provinces p ON mc.province_code = p.province_code
      WHERE mc.province_code IS NOT NULL
      GROUP BY mc.province_code, p.province_name
      ORDER BY registered_voters DESC
    `);
    console.log('\n=== VOTER REGISTRATION PROVINCE BREAKDOWN (FIXED) ===');
    q2.rows.forEach(r => console.log(`  ${r.province_code}: ${r.province_name} (registered: ${r.registered_voters}, total: ${r.total_members})`));

    // Verify: Each province_code should map to exactly one province_name
    const allNames = [...q1.rows, ...q2.rows].map(r => `${r.province_code}:${r.province_name}`);
    const uniqueNames = [...new Set(allNames)];
    console.log(`\n=== VERIFICATION ===`);
    console.log(`Total rows: ${allNames.length}, Unique code:name pairs: ${uniqueNames.length}`);
    uniqueNames.forEach(n => console.log(`  ${n}`));

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();

