const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function testMemCountsFiltered() {
  const start = Date.now();
  try {
    const result = await pool.query(`
      SELECT mc.province_code,
        COUNT(*) as total_members_managed,
        COUNT(CASE WHEN mc.membership_status_id = 1 THEN 1 END) as active_members_count,
        COUNT(CASE WHEN mc.membership_status_id != 1 THEN 1 END) as expired_members_count
      FROM members_consolidated mc
      WHERE mc.province_code IN (SELECT u.province_code FROM users u WHERE u.admin_level = 'province' AND u.is_active = true)
      GROUP BY mc.province_code
    `);
    const elapsed = Date.now() - start;
    console.log('mem_counts (filtered) took:', elapsed, 'ms');
    result.rows.forEach(row => console.log(row.province_code, 'total:', row.total_members_managed, 'active:', row.active_members_count));
  } catch(e) {
    console.error('mem_counts ERROR:', e.message);
  }
}

async function testQuery() {
  const start = Date.now();
  const dateFrom = '2026-01-23';
  const dateTo = '2026-02-22';
  try {
    // Exact query from backend provincialAdminPerformanceService.ts getLeaderboard()
    const result = await pool.query(`
      WITH reg_metrics AS (
        SELECT
          al.user_id,
          COUNT(CASE WHEN al.action IN ('approve', 'create') AND al.entity_type = 'membership_application' THEN 1 END) as registrations_approved,
          COUNT(CASE WHEN al.action = 'reject' AND al.entity_type = 'membership_application' THEN 1 END) as registrations_rejected,
          COUNT(CASE WHEN al.entity_type = 'membership_application' THEN 1 END) as new_registrations_count
        FROM audit_logs al
        WHERE al.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY al.user_id
      ),
      ren_metrics AS (
        SELECT
          mrl.processed_by as user_id,
          COUNT(*) as renewals_processed,
          COUNT(CASE WHEN mrl.payment_status = 'Completed' THEN 1 END) as renewals_completed,
          SUM(COALESCE(mrl.amount_paid, 0)) as renewal_revenue
        FROM member_renewal_log mrl
        WHERE mrl.renewal_date::date BETWEEN $1::date AND $2::date
        GROUP BY mrl.processed_by
      ),
      mem_counts AS (
        SELECT
          mc.province_code,
          COUNT(*) as total_members_managed,
          COUNT(CASE WHEN mc.membership_status_id = 1 THEN 1 END) as active_members_count,
          COUNT(CASE WHEN mc.membership_status_id != 1 THEN 1 END) as expired_members_count
        FROM members_consolidated mc
        GROUP BY mc.province_code
      ),
      act_metrics AS (
        SELECT
          al2.user_id,
          COUNT(*) as total_actions_count,
          COUNT(CASE WHEN al2.action = 'login' THEN 1 END) as login_count
        FROM audit_logs al2
        WHERE al2.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY al2.user_id
      )
      SELECT
        u.user_id,
        COALESCE(u.name, u.email) as full_name,
        u.email,
        COALESCE(u.province_code, '') as province_code,
        COALESCE(p.province_name, '') as province_name,
        COALESCE(reg.registrations_approved, 0) as registrations_approved,
        COALESCE(reg.registrations_rejected, 0) as registrations_rejected,
        COALESCE(reg.new_registrations_count, 0) as new_registrations_count,
        0 as registrations_pending,
        COALESCE(ren.renewals_processed, 0) as renewals_processed,
        COALESCE(ren.renewals_completed, 0) as renewals_completed,
        COALESCE(ren.renewal_revenue, 0) as renewal_revenue,
        COALESCE(mem.total_members_managed, 0) as total_members_managed,
        COALESCE(mem.active_members_count, 0) as active_members_count,
        COALESCE(mem.expired_members_count, 0) as expired_members_count,
        COALESCE(act.total_actions_count, 0) as total_actions_count,
        COALESCE(act.login_count, 0) as login_count,
        (
          COALESCE(reg.registrations_approved, 0) * 3 +
          COALESCE(ren.renewals_completed, 0) * 5 +
          COALESCE(act.total_actions_count, 0) * 1 +
          COALESCE(act.login_count, 0) * 2
        ) as score
      FROM users u
      LEFT JOIN provinces p ON u.province_code = p.province_code
      LEFT JOIN reg_metrics reg ON reg.user_id = u.user_id
      LEFT JOIN ren_metrics ren ON ren.user_id = u.user_id
      LEFT JOIN mem_counts mem ON mem.province_code = u.province_code
      LEFT JOIN act_metrics act ON act.user_id = u.user_id
      WHERE u.admin_level = 'province' AND u.is_active = true
      ORDER BY score DESC
      LIMIT $3
    `, [dateFrom, dateTo, 20]);
    const elapsed = Date.now() - start;
    console.log('Query took:', elapsed, 'ms');
    console.log('Rows returned:', result.rows.length);
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.full_name} | ${row.province_name} | reg:${row.registrations_approved} ren:${row.renewals_processed} mem:${row.total_members_managed} acts:${row.total_actions_count} score:${row.score}`);
    });
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('STACK:', e.stack);
  } finally {
    await pool.end();
  }
}

async function main() {
  await testMemCountsFiltered();
  // await testQuery();  // Skip for now - test mem_counts first
  await pool.end();
}
main();

