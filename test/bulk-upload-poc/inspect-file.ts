import XLSX from 'xlsx';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: ts-node --esm inspect-file.ts <file-path>');
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

console.log('📊 File Inspection');
console.log('==================');
console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\n📋 Columns:');
if (data.length > 0) {
  Object.keys(data[0]).forEach((col, idx) => {
    console.log(`  ${idx + 1}. ${col}`);
  });
  
  console.log('\n📄 Sample Row (first record):');
  console.log(JSON.stringify(data[0], null, 2));
  
  console.log('\n📄 Sample Row (second record):');
  if (data.length > 1) {
    console.log(JSON.stringify(data[1], null, 2));
  }
}

