import { Pool } from 'pg';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

// Connect to Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function parseDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  // Format: DD/MM/YYYY
  const parts = String(dateStr).split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

function parseQuorum(val: string | null | undefined): { met: boolean; achieved: number | null } {
  if (!val) return { met: false, achieved: null };
  const str = String(val).toUpperCase();
  const met = str.includes('YES') || str.includes('PASSED');
  
  // Extract number if formatted like "YES/118"
  const match = str.match(/\d+/);
  const achieved = match ? parseInt(match[0], 10) : null;
  
  return { met, achieved };
}

function parseVdcc(val: string | null | undefined): { met: boolean; compliant: number | null; total: number | null } {
  if (!val) return { met: false, compliant: null, total: null };
  const str = String(val).toUpperCase();
  
  // Format like "3 OUT OF 3" or "2/3"
  const match = str.match(/(\d+)\s*(?:OUT OF|\/)\s*(\d+)/i);
  if (match) {
    const compliant = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    return {
      met: compliant >= total && total > 0,
      compliant,
      total
    };
  }
  
  const met = str.includes('YES');
  return { met, compliant: null, total: null };
}

function parseIdNumber(val: any): string | null {
  if (!val) return null;
  let str = String(val).trim();
  // If it's loaded as float e.g. 9903246267088.0
  if (str.endsWith('.0')) {
    str = str.replace('.0', '');
  }
  return str;
}

async function getAdminUserId(): Promise<number> {
  const result = await pool.query(`SELECT user_id FROM users WHERE is_active = TRUE AND role_id = 1 LIMIT 1`);
  if (result.rows.length > 0) return result.rows[0].user_id;
  
  const fallback = await pool.query(`SELECT user_id FROM users WHERE is_active = TRUE LIMIT 1`);
  if (fallback.rows.length > 0) return fallback.rows[0].user_id;
  
  return 1; // absolute fallback
}

async function main() {
  const adminUserId = await getAdminUserId();
  const filePath = path.resolve(process.cwd(), 'work/2026 LGE CLLR CANDIDATE AUDIT REPORT 07.07.2026.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Loading excel file: ${filePath}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error('No worksheet found');
    process.exit(1);
  }

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  const headers: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    headers[String(cell.value).trim().toUpperCase()] = colNumber;
  });

  console.log('Headers:', Object.keys(headers).join(', '));

  let processedCount = 0;
  let successCount = 0;
  let missingMemberCount = 0;
  let skippedCount = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    
    // Safely get cell value
    const getVal = (headerName: string) => {
      const colIdx = headers[headerName];
      if (!colIdx) return null;
      const val = row.getCell(colIdx).value;
      if (val === null || val === undefined) return null;
      if (typeof val === 'object' && 'formula' in val) {
        return (val as any).result; // Handle formula result
      }
      return val;
    };

    const wardCode = getVal('WARD');
    const idNumberRaw = getVal('ID NUMBER');
    
    // Skip empty rows
    if (!wardCode && !idNumberRaw) {
      continue;
    }
    
    processedCount++;

    const idNumber = parseIdNumber(idNumberRaw);
    if (!idNumber || idNumber === 'nan') {
      console.warn(`[Row ${rowNumber}] Skipped: No ID Number provided for Ward ${wardCode}`);
      skippedCount++;
      continue;
    }

    // 1. Lookup Member
    const memberResult = await pool.query(
      `SELECT member_id FROM members_consolidated WHERE id_number = $1 LIMIT 1`, 
      [idNumber]
    );

    if (memberResult.rows.length === 0) {
      console.warn(`[Row ${rowNumber}] Warning: Member with ID ${idNumber} not found in database. Cannot create candidate for Ward ${wardCode}.`);
      missingMemberCount++;
      // We will skip creating the candidate, but we can still create the ward audit log
    }

    const memberId = memberResult.rows.length > 0 ? memberResult.rows[0].member_id : null;

    // 2. Prepare Audit Data
    const dateOfBga = parseDate(getVal('DATE OF BGA'));
    const branchMembership = parseInt(String(getVal('BRANCH MEMBERSHIP')), 10) || 0;
    const branchQuorum = parseQuorum(getVal('BRANCH QUORUM MET? YES/NO'));
    const vdccQuorum = parseVdcc(getVal('VDCC QUORUM MET? YES/NO?'));
    const passed = String(getVal('FAILED/PASSED')).toUpperCase() === 'PASSED';
    const comments = getVal('COMMENTS') && getVal('COMMENTS') !== 'nan' ? String(getVal('COMMENTS')) : null;

    // Upsert ward_compliance_audit_log
    const strWardCode = String(wardCode).trim();
    if (strWardCode && strWardCode !== 'nan') {
      try {
        await pool.query(`
          INSERT INTO ward_compliance_audit_log (
            ward_code, audit_date, audited_by, total_members, quorum_met, quorum_achieved, 
            meets_vd_threshold, total_voting_districts, compliant_voting_districts, 
            overall_compliant, audit_notes, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
          )
        `, [
          strWardCode, 
          dateOfBga, 
          adminUserId, 
          branchMembership, 
          branchQuorum.met, 
          branchQuorum.achieved,
          vdccQuorum.met, 
          vdccQuorum.total || 0, 
          vdccQuorum.compliant || 0,
          passed, 
          comments
        ]);
      } catch (err: any) {
        console.error(`[Row ${rowNumber}] Error inserting audit log for Ward ${strWardCode}:`, err.message);
      }
    }

    // 3. Upsert lge2026_candidates (if member found)
    if (memberId && strWardCode && strWardCode !== 'nan') {
      try {
        const candidateStatus = passed ? 'approved' : 'nominated';
        
        // Check if candidate already exists
        const existingCandidate = await pool.query(
          `SELECT candidate_id FROM lge2026_candidates WHERE member_id = $1 AND ward_code = $2`,
          [memberId, strWardCode]
        );

        if (existingCandidate.rows.length > 0) {
          // Update
          await pool.query(`
            UPDATE lge2026_candidates 
            SET status = $1, decided_by = $2, decided_at = CURRENT_TIMESTAMP, notes = $3
            WHERE candidate_id = $4
          `, [
            candidateStatus, adminUserId, comments, existingCandidate.rows[0].candidate_id
          ]);
        } else {
          // Insert
          await pool.query(`
            INSERT INTO lge2026_candidates (
              ward_code, member_id, status, nominated_by, notes, nominated_at
            ) VALUES (
              $1, $2, $3, $4, $5, CURRENT_TIMESTAMP
            )
          `, [
            strWardCode, memberId, candidateStatus, adminUserId, comments
          ]);
        }
        successCount++;
      } catch (err: any) {
        console.error(`[Row ${rowNumber}] Error inserting candidate for member ${memberId}:`, err.message);
      }
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Ingestion Complete!`);
  console.log(`Total rows processed: ${processedCount}`);
  console.log(`Successfully added/updated candidates: ${successCount}`);
  console.log(`Skipped (no ID provided): ${skippedCount}`);
  console.log(`Missing members (ID not in DB): ${missingMemberCount}`);
  console.log('--------------------------------------------------');

  await pool.end();
}

main().catch(console.error);
