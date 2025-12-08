const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, 'naledi_all_members.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');
const data = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const row = {};
  headers.forEach((header, idx) => {
    row[header] = values[idx] || '';
  });
  data.push(row);
}

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Set column widths
ws['!cols'] = [
  { wch: 10 },  // member_id
  { wch: 15 },  // id_number
  { wch: 20 },  // firstname
  { wch: 20 },  // surname
  { wch: 15 },  // cell_number
  { wch: 30 },  // email
  { wch: 12 },  // date_of_birth
  { wch: 5 },   // age
  { wch: 10 },  // ward_code
  { wch: 15 },  // voting_district_code
  { wch: 12 },  // expiry_date
  { wch: 12 },  // date_joined
  { wch: 15 },  // last_payment_date
  { wch: 18 },  // membership_status_id
  { wch: 18 },  // membership_number
  { wch: 15 },  // province_name
  { wch: 15 },  // district_name
  { wch: 20 },  // municipality_name
  { wch: 15 },  // membership_status
];

XLSX.utils.book_append_sheet(wb, ws, 'Naledi All Members');

// Write to Excel file
const excelPath = path.join(__dirname, 'Naledi_All_Members_NW392.xlsx');
XLSX.writeFile(wb, excelPath);

console.log(`✅ Excel file created: ${excelPath}`);
console.log(`📊 Total members exported: ${data.length}`);

