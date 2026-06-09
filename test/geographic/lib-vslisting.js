/**
 * Shared helpers for the VSListing voting-data sync.
 * - Reads the .xlsb master file (SheetJS / xlsx).
 * - Sanitizes VD/ward codes (strips trailing ".0", trims whitespace) to stay
 *   consistent with vw_member_details_optimized expectations.
 */
const path = require('path');
const XLSX = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Pool } = require('pg');

const DEFAULT_FILE =
  'C:/Development/NewProj/Membership-newV2/VSListing_20260601.xlsb';

// Map full province names (as they appear in the file) to DB province_code.
const PROVINCE_NAME_TO_CODE = {
  'eastern cape': 'EC',
  'free state': 'FS',
  'gauteng': 'GP',
  'kwazulu-natal': 'KZN',
  'kwazulu natal': 'KZN',
  'limpopo': 'LP',
  'mpumalanga': 'MP',
  'northern cape': 'NC',
  'north west': 'NW',
  'western cape': 'WC',
};

/**
 * Sanitize a code value coming from Excel. Numbers are emitted by SheetJS as
 * JS numbers; floats such as 29200001.0 must become "29200001". Strings that
 * carry a trailing ".0" (legacy CSV artifact) are also cleaned.
 */
function sanitizeCode(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Integer-valued floats -> plain integer string (drops the .0)
    if (Number.isFinite(value)) return String(Math.trunc(value));
    return null;
  }
  let s = String(value).trim();
  if (s === '') return null;
  // Strip a single trailing ".0" suffix (data sanitization requirement)
  s = s.replace(/\.0+$/, '');
  return s;
}

function provinceCode(name) {
  if (!name) return null;
  return PROVINCE_NAME_TO_CODE[String(name).trim().toLowerCase()] || null;
}

function toNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read and normalize all rows from the master file.
 * Returns an array of objects with normalized fields.
 */
function readRows(file = process.env.VS_FILE || DEFAULT_FILE) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  return raw.map((r) => ({
    province_name: r['Province'] != null ? String(r['Province']).trim() : null,
    province_code: provinceCode(r['Province']),
    district_name: r['District'] != null ? String(r['District']).trim() : null,
    munic_code: r['Munic Code'] != null ? String(r['Munic Code']).trim() : null,
    municipality_name: r['Municipality'] != null ? String(r['Municipality']).trim() : null,
    ward_code: sanitizeCode(r['Ward']),
    vd_code: sanitizeCode(r['Voting District']),
    station_name: r['Voting Station Name'] != null ? String(r['Voting Station Name']).trim() : null,
    latitude: toNum(r['Latitude']),
    longitude: toNum(r['Longitude']),
    vs_type: r['VS Type'] != null ? String(r['VS Type']).trim() : null,
    address: r['Address'] != null ? String(r['Address']).trim() : null,
  }));
}

function makePool() {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 10,
  });
}

module.exports = {
  DEFAULT_FILE,
  PROVINCE_NAME_TO_CODE,
  sanitizeCode,
  provinceCode,
  toNum,
  readRows,
  makePool,
};
