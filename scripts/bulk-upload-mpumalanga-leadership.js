/**
 * Bulk Upload Script: Mpumalanga Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-mpumalanga-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'Mpumalanga',
  excelFile: path.resolve(__dirname, '..', 'Mpumalanga SRCT.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'THEMBISILE HANI': { id: 409, code: 'MP315', name: 'Thembisile Hani' },
    'Mbombela': { id: 396, code: 'MP326', name: 'City of Mbombela' },
    'Bushbuckridge': { id: 394, code: 'MP325', name: 'Bushbuckridge' },
    'GOVAN MBEKI': { id: 402, code: 'MP307', name: 'Govan Mbeki' },
    'Nkomazi': { id: 406, code: 'MP324', name: 'Nkomazi' },
    'MKHONDO': { id: 404, code: 'MP303', name: 'Mkhondo' },
    'CHIEF ALBERT LUTHULI': { id: 395, code: 'MP301', name: 'Chief Albert Luthuli' },
    'STEVE TSHWETE': { id: 407, code: 'MP313', name: 'Steve Tshwete' },
    'DR PIXLEY KA ISAKA SEME': { id: 399, code: 'MP304', name: 'Dr Pixley Ka Isaka Seme' },
    'Emakhazeni-1': { id: 400, code: 'MP314', name: 'Emakhazeni' },
    'Victor Khanye-1': { id: 410, code: 'MP311', name: 'Victor Khanye' },
    'DR JS Moroka': { id: 398, code: 'MP316', name: 'Dr JS Moroka' },
    'Thaba Chweu-1': { id: 408, code: 'MP321', name: 'Thaba Chweu' },
    'Emalahleni': { id: 401, code: 'MP312', name: 'Emalahleni' },
    'Msukaligwa': { id: 405, code: 'MP302', name: 'Msukaligwa' },
    'LekwaDipaleseng': { id: 403, code: 'MP305', name: 'Lekwa' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

