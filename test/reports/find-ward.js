/**
 * List ward codes matching a ward number (optionally filtered by municipality),
 * with active/registered member counts, to resolve the right ward_code for the
 * attendance-register generator.
 *
 * Usage:
 *   node test/reports/find-ward.js <wardNumber> [municipalityNameLike]
 *
 * Example:
 *   node test/reports/find-ward.js 4 "Sol Plaatje"
 */
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../../backend');
const fromBackend = (mod) => require(path.join(BACKEND_DIR, 'node_modules', mod));

const { Pool } = fromBackend('pg');
fromBackend('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  const wardNumber = process.argv[2];
  const muniLike = process.argv[3];
  if (!wardNumber) {
    console.error('Usage: node test/reports/find-ward.js <wardNumber> [municipalityNameLike]');
    process.exit(1);
  }

  const params = [String(wardNumber)];
  let sql = `
    SELECT
      v.ward_code,
      v.ward_number,
      v.municipality_name,
      COUNT(*) FILTER (
        WHERE m.membership_status_id = 1 AND m.voter_status_id = 1
      ) AS active_registered_members,
      COUNT(*) AS total_members
    FROM vw_member_details v
    LEFT JOIN members_consolidated m ON m.member_id = v.member_id
    WHERE v.ward_number::TEXT = $1
  `;
  if (muniLike) {
    params.push(`%${muniLike}%`);
    sql += ` AND v.municipality_name ILIKE $2`;
  }
  sql += `
    GROUP BY v.ward_code, v.ward_number, v.municipality_name
    ORDER BY active_registered_members DESC
  `;

  const client = await pool.connect();
  try {
    const r = await client.query(sql, params);
    if (!r.rows.length) {
      console.log(`No wards found for ward number ${wardNumber}${muniLike ? ` in municipality like "${muniLike}"` : ''}.`);
    } else {
      console.log(`Wards matching number ${wardNumber}${muniLike ? ` (municipality like "${muniLike}")` : ''}:`);
      console.table(r.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
