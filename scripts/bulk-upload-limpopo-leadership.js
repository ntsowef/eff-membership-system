/**
 * Bulk Upload Script: Limpopo Province SRCT Leadership Appointments
 *
 * Reads the "Limpopo SRCT.xlsx" spreadsheet and creates leadership appointments
 * for each municipality's SRCT (Sub-Regional Command Team) members.
 *
 * Usage:
 *   node scripts/bulk-upload-limpopo-leadership.js [--dry-run] [--sheet "SheetName"]
 *
 * Options:
 *   --dry-run   Validate data without inserting into the database
 *   --sheet     Process only the specified sheet (municipality)
 */

const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const SHEET_FILTER = (() => {
  const idx = process.argv.indexOf('--sheet');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const EXCEL_FILE = path.resolve(__dirname, '..', 'Limpopo SRCT.xlsx');
const START_DATE = new Date().toISOString().split('T')[0]; // Today's date
const APPOINTMENT_TYPE = 'Appointed';
const HIERARCHY_LEVEL = 'Municipality';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

// ─── Sheet Name → Municipality Mapping ──────────────────────────────────────────
const SHEET_TO_MUNICIPALITY = {
  'Molemole-1': { id: 428, code: 'LIM353', name: 'Molemole' },
  'Musina': { id: 322, code: 'LIM341', name: 'Musina' },
  'Mogalakwena': { id: 427, code: 'LIM367', name: 'Mogalakwena' },
  'Greater Giyani': { id: 418, code: 'LIM331', name: 'Greater Giyani' },
  'Thulamela': { id: 323, code: 'LIM343', name: 'Thulamela' },
  'Makhado': { id: 324, code: 'LIM344', name: 'Makhado' },
  'Bela-bela': { id: 412, code: 'LIM366', name: 'Bela-Bela' },
  'Blouberg': { id: 413, code: 'LIM351', name: 'Blouberg' },
  'Collins Chabane': { id: 414, code: 'LIM345', name: 'Collins Chabane' },
  'Polokwane': { id: 321, code: 'LIM354', name: 'Polokwane' },
  'Fetakgomo': { id: 417, code: 'LIM476', name: 'Fetakgomo Tubatse' },
  'Modimolle-Mokgophong': { id: 426, code: 'LIM368', name: 'Modimolle-Mookgophong' },
  'Thabazimbi': { id: 431, code: 'LIM361', name: 'Thabazimbi' },
  'Ellias Motswaledi': { id: 415, code: 'LIM472', name: 'Elias Motsoaledi' },
  'Greater Tzaneen': { id: 420, code: 'LIM333', name: 'Greater Tzaneen' },
  'Ephraim Mogale': { id: 416, code: 'LIM471', name: 'Ephraim Mogale' },
  'Maruleng': { id: 425, code: 'LIM335', name: 'Maruleng' },
  'Ba-Phalaborwa': { id: 325, code: 'LIM334', name: 'Ba-Phalaborwa' },
  'Makhuthamanga -1': { id: 424, code: 'LIM473', name: 'Makhuduthamaga' },
  'Lepellenkumpi-1': { id: 421, code: 'LIM355', name: 'Lepele-Nkumpi' },
  'Greater Letaba': { id: 419, code: 'LIM332', name: 'Greater Letaba' },
};

// Sheets with separate NAME and Surname columns (columns 2 and 3)
const SPLIT_NAME_SHEETS = ['Greater Tzaneen', 'Greater Letaba'];

// ─── Counters / Report ──────────────────────────────────────────────────────────
const report = {
  totalSheets: 0,
  totalRows: 0,
  appointmentsCreated: 0,
  membersNotFound: [],
  duplicateAppointments: [],
  positionsNotFound: [],
  errors: [],
  skippedRows: 0,
  sheetSummaries: [],
};

// ─── Helper Functions ───────────────────────────────────────────────────────────

/** Extract a clean string value from an ExcelJS cell */
function getCellString(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  // Rich text / hyperlink objects
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
  // Remove any non-digit characters
  str = str.replace(/[^0-9]/g, '');
  if (str.length === 0) return null;
  // Pad with leading zeros to 13 digits
  while (str.length < 13) str = '0' + str;
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

/**
 * Build position code from position label and municipality code.
 * Returns the position_code that should match the DB.
 */
function getPositionCode(positionLabel, muniCode, srctIndex) {
  const label = (positionLabel || '').toString().trim().toUpperCase();
  if (label === 'CHAIRPERSON') return `MCHAIR_${muniCode}`;
  if (label === 'SECRETARY') return `MSEC_${muniCode}`;
  if (label === 'TREASURER') return `MTREAS_${muniCode}`;
  // For rows with no position label → SRCT Member (sequential)
  if (srctIndex !== null && srctIndex >= 1 && srctIndex <= 15) {
    return `MADD${String(srctIndex).padStart(2, '0')}_${muniCode}`;
  }
  return null;
}

// ─── Main Processing ────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Limpopo SRCT Leadership Appointments – Bulk Upload');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no database changes)' : '🚀 LIVE (will insert appointments)'}`);
  if (SHEET_FILTER) console.log(`  Filter: Sheet "${SHEET_FILTER}" only`);
  console.log(`  Date: ${START_DATE}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Read Excel file
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE);
  console.log(`📄 Loaded workbook: ${EXCEL_FILE}`);
  console.log(`   Sheets: ${workbook.worksheets.map(w => w.name).join(', ')}\n`);

  // 2. Get system user for appointed_by
  const userResult = await pool.query('SELECT user_id FROM users ORDER BY user_id LIMIT 1');
  const appointedBy = userResult.rows.length > 0 ? userResult.rows[0].user_id : 1;
  console.log(`👤 Using appointed_by user ID: ${appointedBy}\n`);

  // 3. Process each sheet
  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;
    if (SHEET_FILTER && sheetName !== SHEET_FILTER) continue;

    const muniInfo = SHEET_TO_MUNICIPALITY[sheetName];
    if (!muniInfo) {
      console.log(`⚠️  Sheet "${sheetName}" – No municipality mapping found. Skipping.`);
      report.errors.push({ sheet: sheetName, error: 'No municipality mapping' });
      continue;
    }

    report.totalSheets++;
    await processSheet(worksheet, muniInfo, appointedBy);
  }

  // 4. Print summary report
  printReport();
  await pool.end();
}

// ─── Process a Single Sheet ─────────────────────────────────────────────────────

async function processSheet(worksheet, muniInfo, appointedBy) {
  const sheetName = worksheet.name;
  const isSplitName = SPLIT_NAME_SHEETS.includes(sheetName);
  const muniCode = muniInfo.code;
  const muniId = muniInfo.id;

  console.log(`\n────────────────────────────────────────────────────────────────`);
  console.log(`📋 Processing: ${sheetName} → ${muniInfo.name} (${muniCode})`);
  console.log(`   Column format: ${isSplitName ? 'Separate NAME + Surname' : 'Combined NAME&SURNAME'}`);

  // Pre-load all positions for this municipality
  const positionsResult = await pool.query(
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
    sheet: sheetName,
    municipality: muniInfo.name,
    code: muniCode,
    totalRows: 0,
    created: 0,
    membersNotFound: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
  };

  let srctIndex = 0; // Counter for SRCT members (1-13)

  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);

    // ── Extract data based on column format ──
    let positionLabel, fullName, idRaw, gender, cellNumber, email;

    if (isSplitName) {
      // Greater Tzaneen & Greater Letaba: separate NAME (col2) and Surname (col3)
      positionLabel = getCellString(row.getCell(1));
      const firstName = getCellString(row.getCell(2));
      const surname = getCellString(row.getCell(3));
      fullName = [firstName, surname].filter(Boolean).join(' ');
      idRaw = row.getCell(4).value;
      gender = getCellString(row.getCell(5));
      cellNumber = getCellString(row.getCell(6));
      email = extractEmail(row.getCell(7));
    } else {
      // Standard format: NAME&SURNAME in col2
      positionLabel = getCellString(row.getCell(1));
      fullName = getCellString(row.getCell(2));
      idRaw = row.getCell(3).value;
      gender = getCellString(row.getCell(4));
      cellNumber = getCellString(row.getCell(5));
      email = extractEmail(row.getCell(6));
    }

    // Skip empty rows
    if (!fullName && !idRaw) continue;

    // Skip the "ADDITIONAL MEMBERS" label row
    const posUpper = positionLabel.toUpperCase();
    if (posUpper === 'ADDITIONAL MEMBERS' || posUpper === 'ADDITIONAL MEMBER') {
      report.skippedRows++;
      sheetSummary.skipped++;
      continue;
    }

    report.totalRows++;
    sheetSummary.totalRows++;

    // ── Determine position ──
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

    // Look up position in DB
    const position = positionsMap[positionCode];
    if (!position) {
      console.log(`    Row ${rowNum}: Position ${positionCode} not found in DB`);
      report.positionsNotFound.push({ sheet: sheetName, row: rowNum, code: positionCode, name: fullName });
      sheetSummary.errors++;
      continue;
    }

    // ── Normalize ID number and look up member ──
    const idNumber = normaliseIdNumber(idRaw);
    if (!idNumber) {
      console.log(`    Row ${rowNum}: No valid ID number for "${fullName}" – skipping member lookup`);
      report.membersNotFound.push({ sheet: sheetName, row: rowNum, name: fullName, id: idRaw, reason: 'Invalid/missing ID' });
      sheetSummary.membersNotFound++;
      continue;
    }

    // Look up member by ID number
    const memberResult = await pool.query(
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

    // ── Check for existing active appointment ──
    const existingResult = await pool.query(
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

    // Also check if any other member holds this position actively
    const positionOccupied = await pool.query(
      `SELECT id, member_id FROM leadership_appointments
       WHERE position_id = $1 AND appointment_status = 'Active'
       LIMIT 1`,
      [position.id]
    );

    if (positionOccupied.rows.length > 0) {
      console.log(`     Row ${rowNum}: Position ${positionCode} already occupied by member ${positionOccupied.rows[0].member_id}. Terminating old appointment.`);
      if (!DRY_RUN) {
        await pool.query(
          `UPDATE leadership_appointments
           SET appointment_status = 'Terminated',
               termination_reason = 'Replaced by bulk upload - Limpopo SRCT',
               terminated_at = NOW()
           WHERE id = $1`,
          [positionOccupied.rows[0].id]
        );
      }
    }

    // ── Create appointment ──
    if (DRY_RUN) {
      console.log(`    Row ${rowNum}: [DRY RUN] Would create: ${position.position_name} → "${fullName}" (member_id: ${memberId})`);
    } else {
      try {
        const insertResult = await pool.query(
          `INSERT INTO leadership_appointments (
            position_id, member_id, hierarchy_level, entity_id, appointment_type,
            start_date, appointment_status, appointed_by, appointment_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, $8)
          RETURNING id`,
          [
            position.id,
            memberId,
            HIERARCHY_LEVEL,
            muniId,
            APPOINTMENT_TYPE,
            START_DATE,
            appointedBy,
            `Bulk upload - Limpopo SRCT - ${sheetName}`
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
  console.log(`   Summary: ${sheetSummary.created} created, ${sheetSummary.membersNotFound} not found, ${sheetSummary.duplicates} duplicates, ${sheetSummary.errors} errors`);
}


// ─── Summary Report ─────────────────────────────────────────────────────────────

function printReport() {
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:                 ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Sheets processed:     ${report.totalSheets}`);
  console.log(`  Total data rows:      ${report.totalRows}`);
  console.log(`  Appointments created: ${report.appointmentsCreated}`);
  console.log(`  Members not found:    ${report.membersNotFound.length}`);
  console.log(`  Duplicate appointments: ${report.duplicateAppointments.length}`);
  console.log(`  Positions not found:  ${report.positionsNotFound.length}`);
  console.log(`  Skipped label rows:   ${report.skippedRows}`);
  console.log(`  Errors:               ${report.errors.length}`);

  // Per-sheet breakdown
  console.log('\n── Per-Municipality Breakdown ──');
  console.log('  Sheet                     | Municipality               | Rows | Created | Not Found | Dupes | Errors');
  console.log('  --------------------------+----------------------------+------+---------+-----------+-------+-------');
  for (const s of report.sheetSummaries) {
    console.log(`  ${s.sheet.padEnd(26)}| ${s.municipality.padEnd(27)}| ${String(s.totalRows).padStart(4)} | ${String(s.created).padStart(7)} | ${String(s.membersNotFound).padStart(9)} | ${String(s.duplicates).padStart(5)} | ${String(s.errors).padStart(5)}`);
  }

  // Members not found detail
  if (report.membersNotFound.length > 0) {
    console.log('\n── Members Not Found (for manual review) ──');
    for (const m of report.membersNotFound) {
      console.log(`  Sheet: ${m.sheet}, Row: ${m.row}, Name: "${m.name}", ID: ${m.id}, Reason: ${m.reason}`);
    }
  }

  // Positions not found detail
  if (report.positionsNotFound.length > 0) {
    console.log('\n── Positions Not Found ──');
    for (const p of report.positionsNotFound) {
      console.log(`  Sheet: ${p.sheet}, Row: ${p.row}, Code: ${p.code}, Name: "${p.name}"`);
    }
  }

  // Duplicate appointments detail
  if (report.duplicateAppointments.length > 0) {
    console.log('\n── Duplicate Appointments (skipped) ──');
    for (const d of report.duplicateAppointments) {
      console.log(`  Sheet: ${d.sheet}, Row: ${d.row}, Name: "${d.name}", Position: ${d.position}, Existing ID: ${d.existingId}`);
    }
  }

  // Errors detail
  if (report.errors.length > 0) {
    console.log('\n── Errors ──');
    for (const e of report.errors) {
      console.log(`  Sheet: ${e.sheet}, Row: ${e.row || 'N/A'}, Name: "${e.name || 'N/A'}", Error: ${e.error}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ─── Entry Point ────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n Fatal error:', err);
  pool.end();
  process.exit(1);
});