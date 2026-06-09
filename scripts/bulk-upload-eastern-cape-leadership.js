/**
 * Bulk Upload Script: Eastern Cape Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-eastern-cape-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'Eastern Cape',
  excelFile: path.resolve(__dirname, '..', 'Easterncape SRCT Updated.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'CHAMPION GALELA': { id: 574, code: 'NMA001', name: 'NMA - Champion Galela' },
    'Enoch Mgijima': { id: 512, code: 'EC139', name: 'Enoch Mgijima' },
    'Mhlontlo': { id: 524, code: 'EC156', name: 'Mhlontlo' },
    'Mbashe': { id: 522, code: 'EC121', name: 'Mbhashe' },
    'Matatiele': { id: 521, code: 'EC441', name: 'Matatiele' },
    'Ndlambe': { id: 526, code: 'EC105', name: 'Ndlambe' },
    'Amahlathi & Great Kei': { id: 505, code: 'EC124', name: 'Amahlathi' },
    'Alex Matikinca': { id: 580, code: 'NMA007', name: 'NMA-Alex Matikanca' },
    'King Williams Town': { id: 571, code: 'BUF002', name: 'BUF - King Williams Town' },
    'NMA Zola Nqini': { id: 578, code: 'NMA005', name: 'NMA - Zola Nqini' },
    'NMA Lillian Diedericks': { id: 576, code: 'NMA003', name: 'NMA - Lillian Diedericks' },
    'King Sabatha Dalindyebo': { id: 517, code: 'EC157', name: 'King Sabata Dalindyebo' },
    'NMA molly blackburn': { id: 577, code: 'NMA004', name: 'NMA - Molly Blackburn' },
    'Buf-Mdantsane': { id: 572, code: 'BUF003', name: 'BUF - Mdantsane' },
    'Mnquma': { id: 525, code: 'EC122', name: 'Mnquma' },
    'Ngqushwa': { id: 528, code: 'EC126', name: 'Ngqushwa' },
    'Ngquza Hill': { id: 514, code: 'EC153', name: 'Ingquza Hill' },
    'NMA-Govan Mbeki': { id: 575, code: 'NMA002', name: 'NMA - Govan Mbeki' },
    'Nyandeni ': { id: 530, code: 'EC155', name: 'Nyandeni' },
    'Port St Johns': { id: 531, code: 'EC154', name: 'Port St Johns' },
    'Sakhisizwe': { id: 533, code: 'EC138', name: 'Sakhisizwe' },
    'Intsikayethu': { id: 515, code: 'EC135', name: 'Intsika Yethu' },
    'Umzimvubu': { id: 536, code: 'EC442', name: 'Umzimvubu' },
    'Walter Sisulu': { id: 537, code: 'EC145', name: 'Walter Sisulu' },
    'Ntabankulu': { id: 529, code: 'EC444', name: 'Ntabankulu' },
    'Winnie Madikizela Mandela ': { id: 523, code: 'EC443', name: 'Mbizana' },
    'Makana': { id: 520, code: 'EC104', name: 'Makana' },
    'Buf-East London': { id: 570, code: 'BUF001', name: 'BUF - East London' },
    'Dr AB Xuma': { id: 532, code: 'EC129', name: 'Raymond Mhlaba' },
    'Duncan Village': { id: 573, code: 'BUF004', name: 'BUF-Duncan Village' },
    'Senqu': { id: 534, code: 'EC142', name: 'Senqu' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

