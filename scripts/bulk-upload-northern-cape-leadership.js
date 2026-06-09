/**
 * Bulk Upload Script: Northern Cape Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-northern-cape-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'Northern Cape',
  excelFile: path.resolve(__dirname, '..', 'Northencape SRCT 2026.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'Joe Morolong': { id: 538, code: 'NC451', name: 'Joe Morolong' },
    'SiyancumaSiyathemba': { id: 382, code: 'NC078', name: 'Siyancuma' },
    'Sol plaatje': { id: 388, code: 'NC091', name: 'Sol Plaatje' },
    'EmthanjeniThembelihleRenosterbe': { id: 377, code: 'NC073', name: 'Emthanjeni' },
    'UbuntuKareeberg': { id: 375, code: 'NC071', name: 'Ubuntu' },
    'TsantsabaneKgatelopele': { id: 385, code: 'NC085', name: 'Tsantsabane' },
    'umsombovu': { id: 376, code: 'NC072', name: 'Umsobomvu' },
    'GAMAGARA': { id: 393, code: 'NC453', name: 'Gamagara' },
    'Dikgatlong': { id: 389, code: 'NC092', name: 'Dikgatlong' },
    'PhokwaneMagareng': { id: 391, code: 'NC094', name: 'Phokwane' },
    'Ga segonyane': { id: 392, code: 'NC452', name: 'Ga-Segonyana' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

