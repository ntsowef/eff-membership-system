/**
 * Bulk Upload Script: North West Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-north-west-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'North West',
  excelFile: path.resolve(__dirname, '..', 'North West SRCT 16.02.26.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'MamusaLekwa-Teemane': { id: 41, code: 'NW393', name: 'Mamusa' },
    'Ramotsere Moiloa': { id: 39, code: 'NW385', name: 'Ramotshere Moiloa' },
    'Greater Taung': { id: 42, code: 'NW394', name: 'Greater Taung' },
    'JB Marks': { id: 368, code: 'NW405', name: 'JB Marks' },
    'Ditsobotla': { id: 38, code: 'NW384', name: 'Ditsobotla' },
    'Madibeng': { id: 1, code: 'NW374', name: 'Madibeng' },
    'RusternburgKgatlengriver': { id: 2, code: 'NW373', name: 'Rustenburg' },
    'Ratlou': { id: 35, code: 'NW381', name: 'Ratlou' },
    'Tswaing': { id: 36, code: 'NW382', name: 'Tswaing' },
    'Moretele': { id: 351, code: 'NW371', name: 'Moretele' },
    'Maquassi hill-1': { id: 367, code: 'NW404', name: 'Maquassi Hills' },
    'Matlosana': { id: 366, code: 'NW403', name: 'City of Matlosana' },
    'Moses Kotane': { id: 4, code: 'NW375', name: 'Moses Kotane' },
    'Kagisano Molopo': { id: 44, code: 'NW397', name: 'Kagisano/Molopo' },
    'Naledi': { id: 40, code: 'NW392', name: 'Naledi' },
    'Mafikeng': { id: 37, code: 'NW383', name: 'Mafikeng' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

