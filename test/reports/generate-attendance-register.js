/**
 * Generate a Ward Attendance Register PDF directly (reuses the real, fixed
 * HtmlPdfService via ts-node so the other-ward inclusion fix is applied).
 *
 * Usage:
 *   node test/reports/generate-attendance-register.js [wardCode]
 *
 * If no wardCode is given, it resolves Ward 29 / Sol Plaatje from the DB.
 */
const path = require('path');
const fs = require('fs');

// Dependencies live in backend/node_modules; resolve them from there.
const BACKEND_DIR = path.join(__dirname, '../../backend');
const fromBackend = (mod) => require(path.join(BACKEND_DIR, 'node_modules', mod));

const { Pool } = fromBackend('pg');
fromBackend('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

// Run with the backend as the working directory so cwd-relative resources
// (e.g. assets/logo.png embedded in the register) resolve exactly as they do
// when the live backend server generates the PDF.
process.chdir(BACKEND_DIR);

// Load the TypeScript service without a full build (transpile only).
fromBackend('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' },
});
const { HtmlPdfService } = require(path.join(BACKEND_DIR, 'src/services/htmlPdfService.ts'));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const MEMBERS_QUERY = `
  SELECT
    m.member_id,
    m.id_number,
    m.firstname AS first_name,
    COALESCE(m.surname, '') AS surname,
    m.firstname || ' ' || COALESCE(m.surname, '') AS full_name,
    COALESCE(m.cell_number, '') AS cell_number,
    COALESCE(m.voting_district_code, '') AS voting_district_code,
    COALESCE(vd.voting_district_name, '') AS voting_district_name,
    m.ward_code
  FROM members_consolidated m
  LEFT JOIN voting_districts vd
    ON m.voting_district_code = vd.voting_district_code
   AND (
        vd.ward_code = m.ward_code
        OR vd.voting_district_code IN ('22222222','33333333','99999999','222222222','333333333','999999999')
   )
  WHERE m.ward_code = $1
    AND m.membership_status_id = 1
    AND m.voter_status_id = 1
  ORDER BY m.firstname, m.surname
`;

async function resolveWardCode(client, argWardCode) {
  if (argWardCode) {
    const r = await client.query(
      'SELECT DISTINCT ward_code FROM vw_member_details WHERE ward_code = $1',
      [argWardCode]
    );
    if (r.rows.length) return argWardCode;
    console.log(`⚠️ Ward code ${argWardCode} not found, falling back to Sol Plaatje Ward 29`);
  }
  const r = await client.query(
    `SELECT DISTINCT ward_code, ward_number, municipality_name
       FROM vw_member_details
      WHERE ward_number::TEXT = '29'
        AND municipality_name ILIKE '%Sol Plaatje%'
      LIMIT 1`
  );
  if (!r.rows.length) throw new Error('Could not resolve Sol Plaatje Ward 29');
  console.log(`📍 Resolved ward_code=${r.rows[0].ward_code} (Ward ${r.rows[0].ward_number}, ${r.rows[0].municipality_name})`);
  return r.rows[0].ward_code;
}

async function main() {
  const argWardCode = process.argv[2];
  const client = await pool.connect();
  try {
    const wardCode = await resolveWardCode(client, argWardCode);

    const wardInfoRes = await client.query(
      `SELECT DISTINCT ward_code, ward_name, ward_number, municipality_code,
              municipality_name, district_code, district_name,
              province_code, province_name
         FROM vw_member_details
        WHERE ward_code = $1`,
      [wardCode]
    );
    if (!wardInfoRes.rows.length) throw new Error(`Ward ${wardCode} not found`);
    const wardInfo = wardInfoRes.rows[0];

    const membersRes = await client.query(MEMBERS_QUERY, [wardCode]);
    const members = membersRes.rows;
    console.log(`📊 Found ${members.length} active registered members in ward ${wardCode}`);

    const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, members);

    const outDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const muni = (wardInfo.municipality_name || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '_');
    const wardNumber = wardInfo.ward_number || wardCode;
    const outFile = path.join(outDir, `ATTENDANCE_REGISTER_WARD_${wardNumber}_${muni}_${datePart}_${timePart}.pdf`);
    fs.writeFileSync(outFile, pdfBuffer);

    console.log(`✅ Attendance register written to: ${outFile}`);
    console.log(`   Size: ${pdfBuffer.length} bytes`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Failed to generate attendance register:', err);
  process.exit(1);
});
