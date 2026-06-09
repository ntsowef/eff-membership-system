/**
 * Shared SRCT Bulk Upload Engine
 *
 * Common logic for all province SRCT leadership bulk upload scripts.
 * Each province script provides its configuration and calls runBulkUpload().
 */
const { Pool } = require('pg');
const ExcelJS = require('exceljs');

// ─── Retry Helper ────────────────────────────────────────────────────────────

/** Execute a pool.query with automatic retry on connection errors */
async function queryWithRetry(pool, sql, params = [], retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const isConnectionError = err.message.includes('Connection terminated') ||
        err.message.includes('connection') || err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' || err.code === '57P01';
      if (isConnectionError && attempt < retries) {
        console.log(`      ⚠️ Connection error (attempt ${attempt}/${retries}), retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/** Extract a clean string value from an ExcelJS cell */
function getCellString(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  if (typeof val === 'object') {
    if (val.richText) return val.richText.map(r => r.text).join('').trim();
    if (val.text) return String(val.text).trim();
    if (val.hyperlink) return String(val.hyperlink).trim();
    if (val.result) return String(val.result).trim();
    return String(val).trim();
  }
  return String(val).trim();
}

/** Normalise an ID number: convert to string, pad to 13 digits */
function normaliseIdNumber(raw) {
  if (!raw) return null;
  let str = typeof raw === 'number' ? String(raw) : String(raw).trim();
  str = str.replace(/[^0-9]/g, '');
  if (str.length === 0) return null;
  while (str.length < 13) str = '0' + str;
  return str;
}

/** Normalise a phone number: remove spaces/dashes, ensure starts with 0 or + */
function normalisePhoneNumber(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  // Remove all non-digit characters except leading +
  const hasPlus = str.startsWith('+');
  str = str.replace(/[^0-9]/g, '');
  if (str.length === 0) return null;
  if (hasPlus) str = '+' + str;
  // Convert South African international format to local
  if (str.startsWith('27') && str.length === 11) str = '0' + str.substring(2);
  if (str.startsWith('+27')) str = '0' + str.substring(3);
  return str;
}

/** Extract email from cell (handles hyperlinks) */
function extractEmail(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  const val = cell.value;
  if (typeof val === 'object') {
    if (val.text) return String(val.text).trim();
    if (val.hyperlink) {
      let h = String(val.hyperlink).trim();
      if (h.startsWith('mailto:')) h = h.substring(7);
      return h;
    }
    if (val.richText) return val.richText.map(r => r.text).join('').trim();
  }
  return String(val).trim() || null;
}

/** Build position code from position label and municipality code. */
function getPositionCode(positionLabel, muniCode, srctIndex) {
  const label = (positionLabel || '').toString().trim().toUpperCase();
  if (label === 'CHAIRPERSON') return `MCHAIR_${muniCode}`;
  if (label === 'SECRETARY') return `MSEC_${muniCode}`;
  if (label === 'TREASURER') return `MTREAS_${muniCode}`;
  if (srctIndex !== null && srctIndex >= 1 && srctIndex <= 15) {
    return `MADD${String(srctIndex).padStart(2, '0')}_${muniCode}`;
  }
  return null;
}

// ─── Process a Single Sheet ─────────────────────────────────────────────────

async function processSheet(pool, worksheet, muniInfo, appointedBy, config, report) {
  const sheetName = worksheet.name;
  const isSplitName = (config.splitNameSheets || []).includes(sheetName);
  const muniCode = muniInfo.code;
  const muniId = muniInfo.id;

  console.log(`\n────────────────────────────────────────────────────────────────`);
  console.log(`📋 Processing: ${sheetName} → ${muniInfo.name} (${muniCode})`);
  console.log(`   Column format: ${isSplitName ? 'Separate NAME + Surname' : 'Combined NAME&SURNAME'}`);

  const positionsResult = await queryWithRetry(pool,
    `SELECT id, position_code, position_name
     FROM leadership_positions
     WHERE entity_id = $1 AND hierarchy_level = 'Municipality' AND is_active = true
     ORDER BY position_order`,
    [muniId]
  );
  const positionsMap = {};
  positionsResult.rows.forEach(p => { positionsMap[p.position_code] = p; });
  console.log(`   Loaded ${positionsResult.rows.length} positions from DB`);

  const sheetSummary = {
    sheet: sheetName, municipality: muniInfo.name, code: muniCode,
    totalRows: 0, created: 0, membersNotFound: 0, duplicates: 0, skipped: 0, errors: 0,
    contactUpdates: 0,
  };

  let srctIndex = 0;

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    let positionLabel, fullName, idRaw, gender, cellNumber, email;

    if (isSplitName) {
      positionLabel = getCellString(row.getCell(1));
      const firstName = getCellString(row.getCell(2));
      const surname = getCellString(row.getCell(3));
      fullName = [firstName, surname].filter(Boolean).join(' ');
      idRaw = row.getCell(4).value;
      gender = getCellString(row.getCell(5));
      cellNumber = getCellString(row.getCell(6));
      email = extractEmail(row.getCell(7));
    } else {
      positionLabel = getCellString(row.getCell(1));
      fullName = getCellString(row.getCell(2));
      idRaw = row.getCell(3).value;
      gender = getCellString(row.getCell(4));
      cellNumber = getCellString(row.getCell(5));
      email = extractEmail(row.getCell(6));
    }

    if (!fullName && !idRaw) continue;

    const posUpper = positionLabel.toUpperCase();
    if (posUpper === 'ADDITIONAL MEMBERS' || posUpper === 'ADDITIONAL MEMBER') {
      report.skippedRows++;
      sheetSummary.skipped++;
      continue;
    }

    report.totalRows++;
    sheetSummary.totalRows++;

    const isNamedPosition = ['CHAIRPERSON', 'SECRETARY', 'TREASURER'].includes(posUpper);
    let positionCode;
    if (isNamedPosition) {
      positionCode = getPositionCode(positionLabel, muniCode, null);
    } else {
      srctIndex++;
      positionCode = getPositionCode(null, muniCode, srctIndex);
    }

    if (!positionCode) {
      console.log(`    Row ${rowNum}: Could not determine position code for "${positionLabel}" (SRCT index: ${srctIndex})`);
      report.errors.push({ sheet: sheetName, row: rowNum, error: `Cannot determine position (srctIndex=${srctIndex})` });
      sheetSummary.errors++;
      continue;
    }

    const position = positionsMap[positionCode];
    if (!position) {
      console.log(`    Row ${rowNum}: Position ${positionCode} not found in DB`);
      report.positionsNotFound.push({ sheet: sheetName, row: rowNum, code: positionCode, name: fullName });
      sheetSummary.errors++;
      continue;
    }
    const idNumber = normaliseIdNumber(idRaw);
    if (!idNumber) {
      console.log(`    Row ${rowNum}: No valid ID number for "${fullName}" – skipping member lookup`);
      report.membersNotFound.push({ sheet: sheetName, row: rowNum, name: fullName, id: idRaw, reason: 'Invalid/missing ID' });
      sheetSummary.membersNotFound++;
      continue;
    }

    const memberResult = await queryWithRetry(pool,
      'SELECT member_id, firstname, surname FROM members_consolidated WHERE id_number = $1 LIMIT 1',
      [idNumber]
    );

    if (memberResult.rows.length === 0) {
      console.log(`     Row ${rowNum}: Member not found for ID ${idNumber} ("${fullName}")`);
      report.membersNotFound.push({ sheet: sheetName, row: rowNum, name: fullName, id: idNumber, reason: 'Not in members_consolidated' });
      sheetSummary.membersNotFound++;
      continue;
    }

    const member = memberResult.rows[0];
    const memberId = member.member_id;

    // ── Update cell_number and email in members_consolidated ──
    const cleanCell = normalisePhoneNumber(cellNumber);
    const cleanEmail = (email && email.trim()) ? email.trim() : null;

    if (cleanCell || cleanEmail) {
      if (config.dryRun) {
        console.log(`    Row ${rowNum}: [DRY RUN] Would update contact: cell=${cleanCell || '(no change)'}, email=${cleanEmail || '(no change)'} for ID ${idNumber}`);
      } else {
        try {
          await queryWithRetry(pool,
            `UPDATE members_consolidated
             SET cell_number = COALESCE($1, cell_number),
                 email = COALESCE($2, email),
                 updated_at = NOW()
             WHERE id_number = $3`,
            [cleanCell, cleanEmail, idNumber]
          );
          console.log(`    Row ${rowNum}: 📱 Updated contact info for "${fullName}" (cell=${cleanCell || 'unchanged'}, email=${cleanEmail || 'unchanged'})`);
        } catch (contactErr) {
          console.log(`    Row ${rowNum}: ⚠️ Contact update failed for "${fullName}": ${contactErr.message}`);
        }
      }
      sheetSummary.contactUpdates++;
      report.contactUpdates++;
    }

    const existingResult = await queryWithRetry(pool,
      `SELECT id FROM leadership_appointments
       WHERE position_id = $1 AND member_id = $2 AND appointment_status = 'Active'
       LIMIT 1`,
      [position.id, memberId]
    );

    if (existingResult.rows.length > 0) {
      console.log(`   ⏭️  Row ${rowNum}: Duplicate – "${fullName}" already has active appointment for ${positionCode}`);
      report.duplicateAppointments.push({ sheet: sheetName, row: rowNum, name: fullName, position: positionCode, existingId: existingResult.rows[0].id });
      sheetSummary.duplicates++;
      continue;
    }

    const positionOccupied = await queryWithRetry(pool,
      `SELECT id, member_id FROM leadership_appointments
       WHERE position_id = $1 AND appointment_status = 'Active'
       LIMIT 1`,
      [position.id]
    );

    if (positionOccupied.rows.length > 0) {
      console.log(`     Row ${rowNum}: Position ${positionCode} already occupied by member ${positionOccupied.rows[0].member_id}. Terminating old appointment.`);
      if (!config.dryRun) {
        await queryWithRetry(pool,
          `UPDATE leadership_appointments
           SET appointment_status = 'Terminated',
               termination_reason = $1,
               terminated_at = NOW()
           WHERE id = $2`,
          [`Replaced by bulk upload - ${config.provinceName} SRCT`, positionOccupied.rows[0].id]
        );
      }
    }

    if (config.dryRun) {
      console.log(`    Row ${rowNum}: [DRY RUN] Would create: ${position.position_name} → "${fullName}" (member_id: ${memberId})`);
    } else {
      try {
        const insertResult = await queryWithRetry(pool,
          `INSERT INTO leadership_appointments (
            position_id, member_id, hierarchy_level, entity_id, appointment_type,
            start_date, appointment_status, appointed_by, appointment_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, $8)
          RETURNING id`,
          [
            position.id, memberId, 'Municipality', muniId, 'Elected',
            config.startDate, appointedBy, `Bulk upload - ${config.provinceName} SRCT - ${sheetName}`
          ]
        );
        console.log(`    Row ${rowNum}: Created appointment #${insertResult.rows[0].id}: ${position.position_name} → "${fullName}"`);
      } catch (err) {
        console.log(`    Row ${rowNum}: DB error for "${fullName}": ${err.message}`);
        report.errors.push({ sheet: sheetName, row: rowNum, name: fullName, error: err.message });
        sheetSummary.errors++;
        continue;
      }
    }

    report.appointmentsCreated++;
    sheetSummary.created++;
  }

  report.sheetSummaries.push(sheetSummary);
  console.log(`   Summary: ${sheetSummary.created} created, ${sheetSummary.contactUpdates} contacts updated, ${sheetSummary.membersNotFound} not found, ${sheetSummary.duplicates} duplicates, ${sheetSummary.errors} errors`);
}

// ─── Summary Report ─────────────────────────────────────────────────────────

function printReport(report, config) {
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:                 ${config.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Sheets processed:     ${report.totalSheets}`);
  console.log(`  Total data rows:      ${report.totalRows}`);
  console.log(`  Appointments created: ${report.appointmentsCreated}`);
  console.log(`  Members not found:    ${report.membersNotFound.length}`);
  console.log(`  Duplicate appointments: ${report.duplicateAppointments.length}`);
  console.log(`  Positions not found:  ${report.positionsNotFound.length}`);
  console.log(`  Contact info updated: ${report.contactUpdates}`);
  console.log(`  Skipped label rows:   ${report.skippedRows}`);
  console.log(`  Errors:               ${report.errors.length}`);

  console.log('\n── Per-Municipality Breakdown ──');
  console.log('  Sheet                     | Municipality               | Rows | Created | Contact | Not Found | Dupes | Errors');
  console.log('  --------------------------+----------------------------+------+---------+---------+-----------+-------+-------');
  for (const s of report.sheetSummaries) {
    console.log(`  ${s.sheet.padEnd(26)}| ${s.municipality.padEnd(27)}| ${String(s.totalRows).padStart(4)} | ${String(s.created).padStart(7)} | ${String(s.contactUpdates).padStart(7)} | ${String(s.membersNotFound).padStart(9)} | ${String(s.duplicates).padStart(5)} | ${String(s.errors).padStart(5)}`);
  }

  if (report.membersNotFound.length > 0) {
    console.log('\n── Members Not Found (for manual review) ──');
    for (const m of report.membersNotFound) {
      console.log(`  Sheet: ${m.sheet}, Row: ${m.row}, Name: "${m.name}", ID: ${m.id}, Reason: ${m.reason}`);
    }
  }

  if (report.positionsNotFound.length > 0) {
    console.log('\n── Positions Not Found ──');
    for (const p of report.positionsNotFound) {
      console.log(`  Sheet: ${p.sheet}, Row: ${p.row}, Code: ${p.code}, Name: "${p.name}"`);
    }
  }

  if (report.duplicateAppointments.length > 0) {
    console.log('\n── Duplicate Appointments (skipped) ──');
    for (const d of report.duplicateAppointments) {
      console.log(`  Sheet: ${d.sheet}, Row: ${d.row}, Name: "${d.name}", Position: ${d.position}, Existing ID: ${d.existingId}`);
    }
  }

  if (report.errors.length > 0) {
    console.log('\n── Errors ──');
    for (const e of report.errors) {
      console.log(`  Sheet: ${e.sheet}, Row: ${e.row || 'N/A'}, Name: "${e.name || 'N/A'}", Error: ${e.error}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Run the bulk upload process.
 * @param {Object} config - Province-specific configuration
 * @param {string} config.provinceName - Display name of the province
 * @param {string} config.excelFile - Absolute path to the Excel file
 * @param {Object} config.sheetToMunicipality - Sheet name → { id, code, name } mapping
 * @param {string[]} [config.splitNameSheets] - Sheet names with separate NAME/Surname columns
 * @param {boolean} [config.dryRun] - Whether to run in dry-run mode
 * @param {string} [config.sheetFilter] - Process only this sheet
 * @param {string} [config.startDate] - Appointment start date (defaults to today)
 */
async function runBulkUpload(config) {
  config.dryRun = config.dryRun !== undefined ? config.dryRun : process.argv.includes('--dry-run');
  config.sheetFilter = config.sheetFilter || (() => {
    const idx = process.argv.indexOf('--sheet');
    return idx !== -1 ? process.argv[idx + 1] : null;
  })();
  config.startDate = config.startDate || new Date().toISOString().split('T')[0];
  config.splitNameSheets = config.splitNameSheets || [];

  const pool = new Pool({
    host: 'localhost', port: 5432, user: 'eff_admin',
   /**  host: '69.164.245.173', port: 5432, user: 'eff_admin',*/
    password: 'Frames!123', database: 'eff_membership_database',
    connectionTimeoutMillis: 30000,
    idle_in_transaction_session_timeout: 60000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    max: 3,
  });

  const report = {
    totalSheets: 0, totalRows: 0, appointmentsCreated: 0,
    membersNotFound: [], duplicateAppointments: [], positionsNotFound: [],
    errors: [], skippedRows: 0, sheetSummaries: [],
    contactUpdates: 0,
  };

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ${config.provinceName} SRCT Leadership Appointments – Bulk Upload`);
    console.log(`  Mode: ${config.dryRun ? '🔍 DRY RUN (no database changes)' : '🚀 LIVE (will insert appointments)'}`);
    if (config.sheetFilter) console.log(`  Filter: Sheet "${config.sheetFilter}" only`);
    console.log(`  Date: ${config.startDate}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(config.excelFile);
    console.log(`📄 Loaded workbook: ${config.excelFile}`);
    console.log(`   Sheets: ${workbook.worksheets.map(w => w.name).join(', ')}\n`);

    const userResult = await queryWithRetry(pool, 'SELECT user_id FROM users ORDER BY user_id LIMIT 1');
    const appointedBy = userResult.rows.length > 0 ? userResult.rows[0].user_id : 1;
    console.log(`👤 Using appointed_by user ID: ${appointedBy}\n`);

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      if (config.sheetFilter && sheetName !== config.sheetFilter) continue;

      const muniInfo = config.sheetToMunicipality[sheetName];
      if (!muniInfo) {
        console.log(`⚠️  Sheet "${sheetName}" – No municipality mapping found. Skipping.`);
        report.errors.push({ sheet: sheetName, error: 'No municipality mapping' });
        continue;
      }

      report.totalSheets++;
      await processSheet(pool, worksheet, muniInfo, appointedBy, config, report);
    }

    printReport(report, config);
  } finally {
    await pool.end();
  }
}

module.exports = { runBulkUpload };

