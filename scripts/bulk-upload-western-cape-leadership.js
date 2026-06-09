/**
 * Bulk Upload Script: Western Cape Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-western-cape-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'Western Cape',
  excelFile: path.resolve(__dirname, '..', 'Western cape SRCT 2026-02-10.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'CPT - Zone 1': { id: 560, code: 'CPT001', name: 'CPT - Zone 1' },
    'CPT- Zone 2': { id: 562, code: 'CPT003', name: 'CPT - Zone 2' },
    'CPT- Zone 3': { id: 563, code: 'CPT004', name: 'CPT - Zone 3' },
    'CPT- Zone 4': { id: 564, code: 'CPT005', name: 'CPT - Zone 4' },
    'CPT-Zone 5&9': { id: 565, code: 'CPT006', name: 'CPT - Zone 5' },
    'CPT-Zone6': { id: 566, code: 'CPT007', name: 'CPT - Zone 6' },
    'CPT-Zone7': { id: 567, code: 'CPT008', name: 'CPT - Zone 7' },
    'CPT-Zone10': { id: 561, code: 'CPT002', name: 'CPT - Zone 10' },
    'Stellenbosch': { id: 346, code: 'WC024', name: 'Stellenbosch' },
    'Witzenberg': { id: 350, code: 'WC022', name: 'Witzenberg' },
    'George': { id: 334, code: 'WC044', name: 'George' },
    'Drakenstein': { id: 333, code: 'WC023', name: 'Drakenstein' },
    'THEEWATERSKLOOF ': { id: 349, code: 'WC031', name: 'Theewaterskloof' },
    'SALDANHA BAY': { id: 345, code: 'WC014', name: 'Saldanha Bay' },
    'KnysnaBitou': { id: 337, code: 'WC048', name: 'Knysna' },
    'MATZIKAMA': { id: 340, code: 'WC011', name: 'Matzikama' },
    'BREEDE VALLEY': { id: 329, code: 'WC025', name: 'Breede Valley' },
    'CPT - ZONE 8': { id: 568, code: 'CPT009', name: 'CPT - Zone 8' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

