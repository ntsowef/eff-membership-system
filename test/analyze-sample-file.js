const XLSX = require('xlsx');

const wb = XLSX.readFile('reports/2nd Letsemeng Ward 3 Upload 12.10.2025.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Total rows:', data.length);
console.log('\nColumns:', Object.keys(data[0]));
console.log('\nFirst 3 rows:');

data.slice(0, 3).forEach((row, i) => {
  console.log(`\nRow ${i+1}:`);
  Object.entries(row).forEach(([key, val]) => {
    console.log(`  ${key}: ${val} (${typeof val})`);
  });
});

