/**
 * Inspect the VSListing_20260601.xlsb master data file.
 * Prints sheet names, headers, sample rows and row counts so we can
 * understand the structure before building the sync script.
 *
 * Run from backend/ so the `xlsx` dependency resolves:
 *   node ../test/geographic/inspect-vslisting.js
 */
const path = require('path');
const XLSX = require('xlsx');

const FILE = process.env.VS_FILE ||
  'C:/Development/NewProj/Membership-newV2/VSListing_20260601.xlsb';

function main() {
  console.log(`Reading: ${FILE}`);
  const wb = XLSX.readFile(FILE);
  console.log(`Sheet names: ${JSON.stringify(wb.SheetNames)}`);

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws['!ref'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    console.log('\n==============================');
    console.log(`Sheet: "${name}"  ref=${ref}  totalRows=${rows.length}`);

    // Print first 6 rows to detect header location
    const preview = rows.slice(0, 6);
    preview.forEach((r, i) => {
      console.log(`  row[${i}] (${r.length} cols): ${JSON.stringify(r)}`);
    });

    // Try object-mode parse (assumes first row is header)
    const objs = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
    if (objs.length) {
      console.log(`  -> object keys: ${JSON.stringify(Object.keys(objs[0]))}`);
      console.log(`  -> sample object[0]: ${JSON.stringify(objs[0])}`);
      console.log(`  -> sample object[1]: ${JSON.stringify(objs[1] || null)}`);
      console.log(`  -> object row count: ${objs.length}`);
    }
  }
}

main();
