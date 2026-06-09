import { Pool } from 'pg';

const PROD_CONFIG = {
    host: '69.164.245.173',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database',
    ssl: false
};

async function run() {
    const pool = new Pool(PROD_CONFIG);
    const client = await pool.connect();

    try {
        console.log('[PROD MIGRATION] Connected to production database');

        // 1. Check current state
        const check = await client.query(
            `SELECT relkind, relname FROM pg_class WHERE relname = 'vw_birthday_monthly_stats'`
        );
        if (check.rows.length > 0) {
            const kind = check.rows[0].relkind;
            console.log(`[PROD MIGRATION] Current type: ${kind === 'v' ? 'Regular VIEW' : kind === 'm' ? 'MATERIALIZED VIEW' : kind}`);
            if (kind === 'm') {
                console.log('[PROD MIGRATION] Already a materialized view — refreshing it instead.');
                await client.query(`REFRESH MATERIALIZED VIEW vw_birthday_monthly_stats`);
                console.log('[PROD MIGRATION] Refreshed successfully.');
                return;
            }
        } else {
            console.log('[PROD MIGRATION] View does not exist yet');
        }

        // 2. Drop old regular view
        console.log('[PROD MIGRATION] Dropping old regular view...');
        await client.query(`DROP VIEW IF EXISTS vw_birthday_monthly_stats CASCADE`);

        // 3. Create materialized view
        console.log('[PROD MIGRATION] Creating MATERIALIZED VIEW (this will take ~45s as it computes once)...');
        await client.query(`
      CREATE MATERIALIZED VIEW vw_birthday_monthly_stats AS
      WITH monthly_birthdays AS (
          SELECT
              EXTRACT(MONTH FROM m.date_of_birth)::INTEGER AS birth_month,
              TO_CHAR(TO_DATE(EXTRACT(MONTH FROM m.date_of_birth)::TEXT, 'MM'), 'Month') AS month_name,
              m.member_id,
              m.cell_number,
              m.membership_status_id,
              m.expiry_date,
              m.date_of_birth,
              CASE 
                  WHEN mst.is_active = true 
                       AND (m.expiry_date IS NULL OR m.expiry_date >= CURRENT_DATE - INTERVAL '90 days')
                  THEN true
                  ELSE false
              END AS is_good_standing,
              CASE 
                  WHEN m.cell_number IS NOT NULL 
                       AND m.cell_number != '' 
                       AND LENGTH(TRIM(m.cell_number)) >= 10
                  THEN true
                  ELSE false
              END AS has_valid_phone
          FROM members_consolidated m
          LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
          WHERE m.date_of_birth IS NOT NULL
      )
      SELECT
          birth_month,
          TRIM(month_name) AS month_name,
          COUNT(*) AS total_birthdays,
          COUNT(*) FILTER (WHERE is_good_standing = true) AS good_standing_count,
          COUNT(*) FILTER (WHERE is_good_standing = true AND has_valid_phone = true) AS sms_eligible_count,
          COUNT(*) FILTER (WHERE is_good_standing = false) AS not_good_standing_count,
          COUNT(*) FILTER (WHERE has_valid_phone = false) AS no_phone_count,
          ROUND(
              (COUNT(*) FILTER (WHERE is_good_standing = true) * 100.0) / NULLIF(COUNT(*), 0),
              2
          ) AS good_standing_percentage,
          ROUND(
              (COUNT(*) FILTER (WHERE is_good_standing = true AND has_valid_phone = true) * 100.0) / NULLIF(COUNT(*), 0),
              2
          ) AS sms_eligible_percentage
      FROM monthly_birthdays
      GROUP BY birth_month, month_name
      ORDER BY birth_month
    `);
        console.log('[PROD MIGRATION] Materialized view created!');

        // 4. Create unique index for REFRESH CONCURRENTLY
        console.log('[PROD MIGRATION] Creating unique index on birth_month...');
        await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_birthday_monthly_stats_month
      ON vw_birthday_monthly_stats (birth_month)
    `);
        console.log('[PROD MIGRATION] Index created!');

        // 5. Verify
        const result = await client.query(`SELECT * FROM vw_birthday_monthly_stats ORDER BY birth_month`);
        console.log(`[PROD MIGRATION] ✅ Success! ${result.rows.length} months of data:`);
        result.rows.forEach((r: any) => {
            console.log(`  Month ${r.birth_month} (${r.month_name.trim()}): ${r.total_birthdays} birthdays, ${r.sms_eligible_count} SMS-eligible`);
        });

    } catch (err: any) {
        console.error('[PROD MIGRATION] ❌ Error:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(() => process.exit(1));
