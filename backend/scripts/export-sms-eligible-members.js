/**
 * Export SMS-Eligible Active Members to CSV
 * Queries production database for members who:
 *   - Have a valid cell number
 *   - Are active (expiry_date >= today)
 *   - Are in good standing (membership_status_id = 1)
 *
 * Usage: node backend/scripts/export-sms-eligible-members.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  connectionTimeoutMillis: 15000,
});

const OUTPUT_DIR = path.join(__dirname, '..', '..', '_exports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTPUT_FILE = path.join(OUTPUT_DIR, `sms_eligible_active_members_${timestamp}.csv`);

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = await pool.connect();
  console.log('✅ Connected to production database\n');

  try {
    // Get total count first
    const countResult = await client.query(`
      SELECT COUNT(*) AS total
      FROM members_consolidated
      WHERE cell_number IS NOT NULL
        AND TRIM(cell_number) != ''
        AND REGEXP_REPLACE(cell_number, '[^0-9]', '', 'g') ~ '^[0-9]{9,12}$'
        AND expiry_date >= CURRENT_DATE
        AND membership_status_id = 1
    `);
    const totalRows = parseInt(countResult.rows[0].total);
    console.log(`📊 Total eligible members: ${totalRows.toLocaleString()}`);
    console.log(`📁 Output file: ${OUTPUT_FILE}\n`);

    // CSV header
    const header = [
      'member_id', 'firstname', 'surname', 'cell_number',
      'id_number', 'province_name', 'municipality_name', 'ward_code',
      'expiry_date', 'membership_status_id', 'payment_status'
    ].join(',');

    // Write header
    fs.writeFileSync(OUTPUT_FILE, header + '\n', 'utf8');

    // Stream in batches to handle large dataset
    const BATCH_SIZE = 50000;
    let offset = 0;
    let written = 0;

    while (offset < totalRows) {
      const batch = await client.query(`
        SELECT
          member_id, firstname, surname, cell_number,
          id_number, province_name, municipality_name, ward_code,
          TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date,
          membership_status_id, payment_status
        FROM members_consolidated
        WHERE cell_number IS NOT NULL
          AND TRIM(cell_number) != ''
          AND REGEXP_REPLACE(cell_number, '[^0-9]', '', 'g') ~ '^[0-9]{9,12}$'
          AND expiry_date >= CURRENT_DATE
          AND membership_status_id = 1
        ORDER BY province_name, surname, firstname
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      if (batch.rows.length === 0) break;

      const csvLines = batch.rows.map(row => {
        return [
          row.member_id,
          escapeCsv(row.firstname),
          escapeCsv(row.surname),
          formatPhone(row.cell_number),
          escapeCsv(row.id_number),
          escapeCsv(row.province_name),
          escapeCsv(row.municipality_name),
          escapeCsv(row.ward_code),
          row.expiry_date,
          row.membership_status_id,
          escapeCsv(row.payment_status),
        ].join(',');
      }).join('\n');

      fs.appendFileSync(OUTPUT_FILE, csvLines + '\n', 'utf8');
      written += batch.rows.length;
      offset += BATCH_SIZE;

      const pct = ((written / totalRows) * 100).toFixed(1);
      process.stdout.write(`\r⏳ Exported ${written.toLocaleString()} / ${totalRows.toLocaleString()} (${pct}%)`);
    }

    // File size
    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n\n${'═'.repeat(60)}`);
    console.log('EXPORT COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Records exported:  ${written.toLocaleString()}`);
    console.log(`  File size:         ${sizeMB} MB`);
    console.log(`  Output file:       ${OUTPUT_FILE}`);
    console.log('═'.repeat(60));

  } finally {
    client.release();
    await pool.end();
  }
}

function formatPhone(value) {
  if (!value) return '';
  // Strip all non-digit characters
  let num = String(value).replace(/[^0-9]/g, '');
  // Must be digits only and between 9-12 digits long
  if (!/^[0-9]{9,12}$/.test(num)) return '';
  // 0xx... → 27xx...
  if (num.startsWith('0')) num = '27' + num.substring(1);
  // 9 digits starting with 6/7/8 → prepend 27
  if (/^[678]/.test(num) && num.length === 9) num = '27' + num;
  // Final validation: must be 11 digits starting with 27
  if (!/^27[0-9]{9}$/.test(num)) return '';
  return num;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

