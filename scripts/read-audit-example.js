const ExcelJS = require('exceljs');

async function read() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('Audit.xlsx');

  // Read Sheet4 (the main audit report)
  const ws = wb.getWorksheet('Sheet4');
  console.log('=== Sheet4: Ward Audit Report ===');
  console.log('Rows:', ws.rowCount, 'Cols:', ws.columnCount);
  
  // Read header row
  const headerRow = ws.getRow(1);
  const headers = [];
  for (let c = 1; c <= ws.columnCount; c++) {
    headers.push(headerRow.getCell(c).value);
  }
  console.log('\nHeaders:', JSON.stringify(headers));
  
  // Read column widths
  console.log('\nColumn widths:');
  for (let c = 1; c <= ws.columnCount; c++) {
    const col = ws.getColumn(c);
    console.log('  Col ' + c + ': width=' + col.width);
  }

  // Read header styling
  console.log('\nHeader row styling:');
  for (let c = 1; c <= ws.columnCount; c++) {
    const cell = headerRow.getCell(c);
    console.log('  Col ' + c + ':', JSON.stringify({
      font: cell.font,
      fill: cell.fill,
      alignment: cell.alignment,
      border: cell.border ? 'yes' : 'no'
    }));
  }

  // Read ALL rows with full detail
  console.log('\n=== ALL ROWS ===');
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vals = [];
    for (let c = 1; c <= ws.columnCount; c++) {
      const cell = row.getCell(c);
      const v = cell.value;
      if (v && typeof v === 'object' && v.formula) {
        vals.push('F:' + v.formula);
      } else {
        vals.push(v);
      }
    }
    // Check styling of first cell to identify row type
    const cell1 = row.getCell(1);
    const font = cell1.font || {};
    const fill = cell1.fill || {};
    let rowType = 'regular';
    if (font.bold && fill.fgColor) {
      const color = fill.fgColor.argb || fill.fgColor.theme || '';
      rowType = 'styled:' + color;
    } else if (font.bold) {
      rowType = 'bold';
    }
    
    console.log('Row ' + r + ' [' + rowType + '] | ' + vals.join(' | '));
  }

  // Read Sheet1 (summary)
  console.log('\n\n=== Sheet1: Summary ===');
  const ws2 = wb.getWorksheet('Sheet1');
  for (let r = 1; r <= ws2.rowCount; r++) {
    const row = ws2.getRow(r);
    const vals = [];
    for (let c = 1; c <= ws2.columnCount; c++) {
      const cell = row.getCell(c);
      const v = cell.value;
      if (v && typeof v === 'object' && v.formula) {
        vals.push('F:' + v.formula);
      } else {
        vals.push(v);
      }
    }
    console.log('Row ' + r + ' | ' + vals.join(' | '));
  }
}

read().catch(e => console.error(e));

