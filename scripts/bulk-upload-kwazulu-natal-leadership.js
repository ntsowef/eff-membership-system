/**
 * Bulk Upload Script: KwaZulu-Natal Province SRCT Leadership Appointments
 *
 * Usage:
 *   node scripts/bulk-upload-kwazulu-natal-leadership.js [--dry-run] [--sheet "SheetName"]
 */
const path = require('path');
const { runBulkUpload } = require('./lib/srct-bulk-upload-engine');

runBulkUpload({
  provinceName: 'KwaZulu-Natal',
  excelFile: path.resolve(__dirname, '..', 'KZN SRCT 16.02.2026.xlsx'),
  splitNameSheets: [],
  sheetToMunicipality: {
    'Greater Kokstad': { id: 442, code: 'KZN433', name: 'Greater Kokstad' },
    'Inkosi Langalibalele': { id: 444, code: 'KZN237', name: 'Inkosi Langalibalele' },
    'Maphumulo': { id: 448, code: 'KZN294', name: 'Maphumulo' },
    'Dannhauser': { id: 436, code: 'KZN254', name: 'Dannhauser' },
    'Big 5 Hlabisa': { id: 435, code: 'KZN276', name: 'Big Five Hlabisa' },
    'Eth Central': { id: 585, code: 'ETH001', name: 'ETH - Central' },
    'Eth Far South': { id: 587, code: 'ETH003', name: 'ETH - Far South' },
    'Inner West': { id: 588, code: 'ETH004', name: 'ETH - Inner West' },
    'Eth North Central': { id: 589, code: 'ETH005', name: 'ETH - North Central' },
    'South Central  South West': { id: 593, code: 'ETH009', name: 'ETH - South Central' },
    'Dr Nkosazana Dlamini Impendle': { id: 437, code: 'KZN436', name: 'Dr Nkosazana Dlamini Zuma' },
    'Ubuhlebezwe': { id: 464, code: 'KZN434', name: 'Ubuhlebezwe' },
    'Ray Nkonyeni': { id: 461, code: 'KZN216', name: 'Ray Nkonyeni' },
    'Eth Far North': { id: 586, code: 'ETH002', name: 'ETH - Far North' },
    'Abaqulusi': { id: 433, code: 'KZN263', name: 'Abaqulusi' },
    'MsunduziMpofana': { id: 463, code: 'KZN225', name: 'The Msunduzi' },
    'Umfolozi': { id: 449, code: 'KZN281', name: 'Mfolozi' },
    'Mtubatuba': { id: 454, code: 'KZN275', name: 'Mtubatuba' },
    'Eth-Outer west': { id: 591, code: 'ETH007', name: 'ETH - Outer West' },
    'Ndwedwe': { id: 455, code: 'KZN293', name: 'Ndwedwe' },
    'Kwadukuza': { id: 446, code: 'KZN292', name: 'KwaDukuza' },
    'umzikhulu': { id: 474, code: 'KZN435', name: 'Umzimkhulu' },
    'Edumbe': { id: 438, code: 'KZN261', name: 'eDumbe' },
    'Newcastle Madlangeni': { id: 456, code: 'KZN252', name: 'Newcastle' },
    'Ethekwini South': { id: 592, code: 'ETH008', name: 'ETH - South' },
    'Umdoni': { id: 466, code: 'KZN212', name: 'Umdoni' },
    'MANDENI': { id: 447, code: 'KZN291', name: 'Mandeni' },
    'ETH-NORTHwest': { id: 590, code: 'ETH006', name: 'ETH - North West' },
    'Ethekwini Far South': { id: 587, code: 'ETH003', name: 'ETH - Far South' },
  },
}).catch(err => {
  console.error('\n Fatal error:', err);
  process.exit(1);
});

