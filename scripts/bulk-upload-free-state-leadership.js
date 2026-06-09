/**
 * Bulk Upload Script: Free State Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-free-state-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'Free State',
  excelFile: path.resolve(__dirname, '..', 'Freestate SRCT.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'Masilonyanyane': { id: 489, code: 'FS181', name: 'Masilonyana' },
    'Matjhabeng': { id: 492, code: 'FS184', name: 'Matjhabeng' },
    'Nketoana': { id: 496, code: 'FS193', name: 'Nketoana' },
    'Setsoto': { id: 494, code: 'FS191', name: 'Setsoto' },
    'Mantsopa': { id: 499, code: 'FS196', name: 'Mantsopa' },
    'Mafube': { id: 503, code: 'FS205', name: 'Mafube' },
    'NALA': { id: 493, code: 'FS185', name: 'Nala' },
    'BLOEMFOENTEIN': { id: 581, code: 'MAN001', name: 'MAN - Bloemfontein' },
    'Moqhaka': { id: 500, code: 'FS201', name: 'Moqhaka' },
    'Phumelela-1': { id: 498, code: 'FS195', name: 'Phumelela' },
    'Metsimaholo': { id: 502, code: 'FS204', name: 'Metsimaholo' },
    'MAN - BotshabeloThaba NchuNaled': { id: 582, code: 'MAN002', name: 'MAN - Botshabelo' },
    'Kopanong': { id: 487, code: 'FS162', name: 'Kopanong' },
    'TokologoTwelopele': { id: 490, code: 'FS182', name: 'Tokologo' },
    'Ngwathe': { id: 501, code: 'FS203', name: 'Ngwathe' },
    'Mohakare': { id: 488, code: 'FS163', name: 'Mohokare' },
    'Dihlabeng ': { id: 495, code: 'FS192', name: 'Dihlabeng' },
    'Maluti a Phofung ': { id: 497, code: 'FS194', name: 'Maluti a Phofung' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

