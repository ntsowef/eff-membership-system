/**
 * Bulk Upload Script: Gauteng Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-gauteng-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'Gauteng',
  excelFile: path.resolve(__dirname, '..', 'Gauteng SRCT.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'JHB-A': { id: 547, code: 'JHB001', name: 'JHB - A' },
    'Midvaal': { id: 483, code: 'GT422', name: 'Midvaal' },
    'JHB B': { id: 548, code: 'JHB002', name: 'JHB - B' },
    'JHB C': { id: 549, code: 'JHB003', name: 'JHB - C' },
    'JHB F': { id: 552, code: 'JHB006', name: 'JHB - F' },
    'JHB-G': { id: 553, code: 'JHB007', name: 'JHB - G' },
    'Mogale City': { id: 484, code: 'GT481', name: 'Mogale City' },
    'TSH-3': { id: 556, code: 'TSH003', name: 'TSH - 3' },
    'Eku-East': { id: 543, code: 'EKU002', name: 'EKU - East' },
    'TSH-56': { id: 558, code: 'TSH005', name: 'TSH - 5' },
    'Randwest': { id: 485, code: 'GT485', name: 'Rand West City' },
    'Tsh-2': { id: 555, code: 'TSH002', name: 'TSH - 2' },
    'JHB-D': { id: 550, code: 'JHB004', name: 'JHB - D' },
    'Emfuleni': { id: 480, code: 'GT421', name: 'Emfuleni' },
    'Eku  -Far East': { id: 544, code: 'EKU003', name: 'EKU - Far East' },
    'Eku South-1': { id: 546, code: 'EKU005', name: 'EKU - South' },
    'Merafong city-1': { id: 482, code: 'GT484', name: 'Merafong City' },
    'Tshwane-1': { id: 554, code: 'TSH001', name: 'TSH - 1' },
    'Eku North-1': { id: 545, code: 'EKU004', name: 'EKU - North' },
    'Eku Central': { id: 542, code: 'EKU001', name: 'EKU - Central' },
    'JHB-E': { id: 551, code: 'JHB005', name: 'JHB - E' },
    'Tswane -4': { id: 557, code: 'TSH004', name: 'TSH - 4' },
    'Lesedi': { id: 481, code: 'GT423', name: 'Lesedi' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

