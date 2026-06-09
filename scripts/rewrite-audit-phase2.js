const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'services', 'excelReportService.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// After line 331 (the grouped structure is complete), we need to insert Sheet4 + Sheet1 + method close
// Line 332 currently starts the Daily Report method - that should NOT be there
// We need to insert before line 332 (index 331)
const before = lines.slice(0, 331); // lines 1-331
const after = lines.slice(331);      // lines 332+ (Daily Report method etc)

// But wait - the after part starts with the Daily Report method directly
// We need the method closing: catch + closing brace
// Let me check: the "after" should start with the next method

const sheet4Code = `
      // ===== BUILD SHEET4: MUNICIPALITY/DISTRICT DETAIL =====
      const sheet4 = workbook.addWorksheet('Sheet4');

      // Column widths matching example
      sheet4.getColumn(1).width = 26.7;
      sheet4.getColumn(2).width = 12.5;
      sheet4.getColumn(3).width = 3.5;
      sheet4.getColumn(4).width = 15.3;
      sheet4.getColumn(5).width = 18.6;
      sheet4.getColumn(6).width = 15.9;
      sheet4.getColumn(7).width = 13.5;
      sheet4.getColumn(8).width = 16;

      // Header row (row 1)
      const headerRow = sheet4.getRow(1);
      const headers = [
        'MUNICIPALITY',
        'NUMBER OF IEC WARDS',
        '',
        'NUMBER OF BRANCHES CONVENED',
        'NUMBER OF BRANCHES NOT CONVENED',
        'NUMBER OF BRANCHES PASSED AUDIT',
        'NUMBER OF BRANCHES FAILED AUDIT',
        '' // Will use rich text
      ];
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        if (i === 7) {
          // Rich text for column H with superscript ST
          cell.value = {
            richText: [
              { text: 'PERCENTAGE % TOWARDS 1', font: { name: 'Arial', size: 9, bold: true } },
              { text: 'ST', font: { name: 'Arial', size: 9, bold: true, vertAlign: 'superscript' } },
              { text: ' SRPA', font: { name: 'Arial', size: 9, bold: true } }
            ]
          };
        } else {
          cell.value = h;
        }
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      headerRow.height = 40;

      // Track Excel row numbers for formulas
      let currentRow = 2; // Data starts at row 2
      const districtTotalRows: number[] = []; // All district TOTAL row numbers
      const provinceTotalRows: number[] = []; // All province total row numbers
      const provinceData: Array<{ name: string; totalRow: number }> = [];

      // Helper: style a cell
      const styleCell = (cell: any, opts: { bold?: boolean; grey?: boolean; pct?: boolean; numFmt?: string } = {}) => {
        cell.font = { name: 'Arial', size: 9, bold: opts.bold || false };
        if (opts.grey) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        if (opts.pct) {
          cell.numFmt = '0%';
        }
      };

      // Helper: write a municipality data row
      const writeMuniRow = (row: number, label: string, isCombined: boolean, wardParts: number[], wardTotal: number, passed: number, failed: number) => {
        const r = sheet4.getRow(row);
        // Col A: label
        const cellA = r.getCell(1);
        cellA.value = label;
        styleCell(cellA);

        // Col B: ward count or "X + Y = Z" text
        const cellB = r.getCell(2);
        if (isCombined && wardParts && wardParts.length > 1) {
          cellB.value = wardParts.join(' + ') + ' = ' + wardTotal;
        } else {
          cellB.value = wardTotal;
        }
        styleCell(cellB);
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col C: combined total number (only for combined rows)
        const cellC = r.getCell(3);
        if (isCombined) {
          cellC.value = wardTotal;
        }
        styleCell(cellC);
        cellC.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col F: passed (value)
        const cellF = r.getCell(6);
        cellF.value = passed;
        styleCell(cellF);
        cellF.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col G: failed (value)
        const cellG = r.getCell(7);
        cellG.value = failed;
        styleCell(cellG);
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col D: convened = F + G (formula)
        const cellD = r.getCell(4);
        cellD.value = { formula: \`F\${row}+G\${row}\` };
        styleCell(cellD);
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col E: not convened = B - D (or C - D for combined)
        const cellE = r.getCell(5);
        if (isCombined) {
          cellE.value = { formula: \`C\${row}-D\${row}\` };
        } else {
          cellE.value = { formula: \`B\${row}-D\${row}\` };
        }
        styleCell(cellE);
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col H: percentage = F / B (or F / C for combined)
        const cellH = r.getCell(8);
        if (isCombined) {
          cellH.value = { formula: \`F\${row}/C\${row}\` };
        } else {
          cellH.value = { formula: \`F\${row}/B\${row}\` };
        }
        styleCell(cellH, { pct: true });
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      // Helper: write a TOTAL row (district or province or grand)
      const writeTotalRow = (row: number, label: string, sumRowNumbers: number[], hasCombinedInRange: boolean, combinedWardParts: number[]) => {
        const r = sheet4.getRow(row);

        // Col A
        const cellA = r.getCell(1);
        cellA.value = label;
        styleCell(cellA, { bold: true, grey: true });

        // Col B: SUM of ward counts - but if combined rows exist, can't just SUM (text cells)
        // For district totals: SUM the range but handle combined rows specially
        const cellB = r.getCell(2);
        if (hasCombinedInRange && combinedWardParts.length > 0) {
          // Build formula: SUM of non-combined B cells + explicit combined ward totals
          const nonCombinedRows = sumRowNumbers.filter((_, i) => !combinedWardParts[i]);
          // Actually simpler: just use C column for combined, B for non-combined
          // Or just compute the value since formulas get complex
          let totalWards = 0;
          // We'll compute it from the data we have
          cellB.value = { formula: \`SUM(C\${sumRowNumbers[0]}:C\${sumRowNumbers[sumRowNumbers.length - 1]})\` };
        } else {
          cellB.value = { formula: \`SUM(B\${sumRowNumbers[0]}:B\${sumRowNumbers[sumRowNumbers.length - 1]})\` };
        }
        styleCell(cellB, { bold: true, grey: true });
        cellB.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col C
        const cellC = r.getCell(3);
        styleCell(cellC, { bold: true, grey: true });

        // Col D: SUM
        const cellD = r.getCell(4);
        cellD.value = { formula: \`SUM(D\${sumRowNumbers[0]}:D\${sumRowNumbers[sumRowNumbers.length - 1]})\` };
        styleCell(cellD, { bold: true, grey: true });
        cellD.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col E: SUM
        const cellE = r.getCell(5);
        cellE.value = { formula: \`SUM(E\${sumRowNumbers[0]}:E\${sumRowNumbers[sumRowNumbers.length - 1]})\` };
        styleCell(cellE, { bold: true, grey: true });
        cellE.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col F: SUM
        const cellF = r.getCell(6);
        cellF.value = { formula: \`SUM(F\${sumRowNumbers[0]}:F\${sumRowNumbers[sumRowNumbers.length - 1]})\` };
        styleCell(cellF, { bold: true, grey: true });
        cellF.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col G: SUM
        const cellG = r.getCell(7);
        cellG.value = { formula: \`SUM(G\${sumRowNumbers[0]}:G\${sumRowNumbers[sumRowNumbers.length - 1]})\` };
        styleCell(cellG, { bold: true, grey: true });
        cellG.alignment = { horizontal: 'center', vertical: 'middle' };

        // Col H: F/B
        const cellH = r.getCell(8);
        cellH.value = { formula: \`F\${row}/B\${row}\` };
        styleCell(cellH, { bold: true, grey: true, pct: true });
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      // Helper: write province/grand total referencing specific rows
      const writeRefTotalRow = (row: number, label: string, refRows: number[]) => {
        const r = sheet4.getRow(row);
        const refList = refRows.map(rr => \`B\${rr}\`).join(',');

        const cellA = r.getCell(1);
        cellA.value = label;
        styleCell(cellA, { bold: true, grey: true });

        ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, idx) => {
          const cell = r.getCell(idx + 2);
          if (col === 'C') {
            styleCell(cell, { bold: true, grey: true });
            return;
          }
          cell.value = { formula: \`SUM(\${refRows.map(rr => \`\${col}\${rr}\`).join(',')})\` };
          styleCell(cell, { bold: true, grey: true });
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const cellH = r.getCell(8);
        cellH.value = { formula: \`F\${row}/B\${row}\` };
        styleCell(cellH, { bold: true, grey: true, pct: true });
        cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      };

      // ===== POPULATE SHEET4 DATA =====
      const sortedProvinces = Object.keys(grouped).sort();

      // Ehlanzeni special handling
      const EHLANZENI_CITY_MUNIS = ['City of Mbombela', 'Nkomazi'];
      const EHLANZENI_BUSH_MUNIS = ['Bushbuckridge', 'Thaba Chweu'];

      for (const provinceName of sortedProvinces) {
        const districts = grouped[provinceName];
        const sortedDistricts = Object.keys(districts).sort();
        const distTotalRowsForProvince: number[] = [];

        for (const districtName of sortedDistricts) {
          const { rows } = districts[districtName];
          rows.sort((a: any, b: any) => (a.label || '').localeCompare(b.label || ''));

          // Check if this is Ehlanzeni - split into sub-groups
          const isEhlanzeni = districtName.toLowerCase().includes('ehlanzeni');

          if (isEhlanzeni) {
            // Split into City of Mbombela group and Bushbuckridge group
            const cityGroup = rows.filter((r: any) => EHLANZENI_CITY_MUNIS.some(m => r.label.includes(m)));
            const bushGroup = rows.filter((r: any) => EHLANZENI_BUSH_MUNIS.some(m => r.label.includes(m)));
            const otherGroup = rows.filter((r: any) =>
              !EHLANZENI_CITY_MUNIS.some(m => r.label.includes(m)) &&
              !EHLANZENI_BUSH_MUNIS.some(m => r.label.includes(m))
            );

            // Ehlanzeni-City of Mbombela sub-group
            if (cityGroup.length > 0) {
              const startRow = currentRow;
              const muniRowNums: number[] = [];
              const hasCombined = cityGroup.some((m: any) => m._isCombined);
              cityGroup.forEach((muni: any) => {
                writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
                muniRowNums.push(currentRow);
                currentRow++;
              });
              // TOTAL row
              writeTotalRow(currentRow, 'TOTAL', muniRowNums, hasCombined, []);
              distTotalRowsForProvince.push(currentRow);
              districtTotalRows.push(currentRow);
              currentRow++;
            }

            // Ehlanzeni-Bushbuckridge sub-group
            if (bushGroup.length > 0) {
              const muniRowNums: number[] = [];
              const hasCombined = bushGroup.some((m: any) => m._isCombined);
              bushGroup.forEach((muni: any) => {
                writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
                muniRowNums.push(currentRow);
                currentRow++;
              });
              writeTotalRow(currentRow, 'TOTAL', muniRowNums, hasCombined, []);
              distTotalRowsForProvince.push(currentRow);
              districtTotalRows.push(currentRow);
              currentRow++;
            }

            // Any other munis in Ehlanzeni
            if (otherGroup.length > 0) {
              const muniRowNums: number[] = [];
              otherGroup.forEach((muni: any) => {
                writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
                muniRowNums.push(currentRow);
                currentRow++;
              });
              writeTotalRow(currentRow, 'TOTAL', muniRowNums, false, []);
              distTotalRowsForProvince.push(currentRow);
              districtTotalRows.push(currentRow);
              currentRow++;
            }
          } else {
            // Normal district processing
            const muniRowNums: number[] = [];
            const hasCombined = rows.some((m: any) => m._isCombined);
            rows.forEach((muni: any) => {
              writeMuniRow(currentRow, muni.label, muni._isCombined, muni.wardParts || [], muni.wardTotal, muni.passed, muni.failed);
              muniRowNums.push(currentRow);
              currentRow++;
            });
            // District TOTAL row
            writeTotalRow(currentRow, 'TOTAL', muniRowNums, hasCombined, []);
            distTotalRowsForProvince.push(currentRow);
            districtTotalRows.push(currentRow);
            currentRow++;
          }
        }

        // Province total row - references district TOTAL rows
        writeRefTotalRow(currentRow, provinceName.toUpperCase(), distTotalRowsForProvince);
        provinceTotalRows.push(currentRow);
        provinceData.push({ name: provinceName, totalRow: currentRow });
        currentRow++;
      }

      // Grand total row - references all province total rows
      writeRefTotalRow(currentRow, 'TOTAL', provinceTotalRows);
      const grandTotalRow = currentRow;

      // ===== BUILD SHEET1: PROVINCIAL SUMMARY =====
      const sheet1 = workbook.addWorksheet('Sheet1');

      // Sheet1 column widths
      sheet1.getColumn(1).width = 4;   // #
      sheet1.getColumn(2).width = 18;  // Province
      sheet1.getColumn(3).width = 14;  // IEC Wards
      sheet1.getColumn(4).width = 18;  // Registers Issued
      sheet1.getColumn(5).width = 18;  // Convened
      sheet1.getColumn(6).width = 18;  // Not Convened
      sheet1.getColumn(7).width = 18;  // Passed
      sheet1.getColumn(8).width = 18;  // Failed
      sheet1.getColumn(9).width = 18;  // In Audit
      sheet1.getColumn(10).width = 4;  // spacer
      sheet1.getColumn(11).width = 22; // Previous War Council
      sheet1.getColumn(12).width = 16; // Percentage

      // Sheet1 Header row
      const s1Header = sheet1.getRow(1);
      const s1Headers = [
        '#', 'PROVINCE', 'NUMBER OF IEC WARDS', 'TOTAL NUMBER OF REGISTERS ISSUED',
        'NUMBER OF BRANCHES CONVENED BPA/BGA', 'NUMBER OF BRANCHES NOT CONVENED BPA/BGA',
        'NUMBER OF BRANCHES PASSED AUDIT', 'NUMBER OF BRANCHES FAILED AUDIT',
        'NUMBER OF BRANCHES CURRENTLY IN AUDIT', '',
        'NUMBER OF BRANCHES CONVENED BPA/BGA FROM PREVIOUS WAR COUNCIL',
        '' // Rich text percentage header
      ];
      s1Headers.forEach((h, i) => {
        const cell = s1Header.getCell(i + 1);
        if (i === 11) {
          cell.value = {
            richText: [
              { text: 'PERCENTAGE % TOWARDS 1', font: { name: 'Arial', size: 9, bold: true } },
              { text: 'ST', font: { name: 'Arial', size: 9, bold: true, vertAlign: 'superscript' } },
              { text: ' SRPA', font: { name: 'Arial', size: 9, bold: true } }
            ]
          };
        } else {
          cell.value = h;
        }
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      s1Header.height = 45;

      // Sheet1 data rows - one per province
      provinceData.forEach((prov, idx) => {
        const s1Row = idx + 2;
        const r = sheet1.getRow(s1Row);
        const s4Ref = prov.totalRow; // Sheet4 province total row

        r.getCell(1).value = idx + 1; // #
        r.getCell(2).value = prov.name; // Province name
        r.getCell(3).value = { formula: \`Sheet4!B\${s4Ref}\` }; // IEC Wards
        r.getCell(4).value = 0; // Registers issued (placeholder)
        r.getCell(5).value = { formula: \`Sheet4!D\${s4Ref}\` }; // Convened
        r.getCell(6).value = { formula: \`Sheet4!E\${s4Ref}\` }; // Not Convened
        r.getCell(7).value = { formula: \`Sheet4!F\${s4Ref}\` }; // Passed
        r.getCell(8).value = { formula: \`Sheet4!G\${s4Ref}\` }; // Failed
        r.getCell(9).value = 0; // In Audit (placeholder)
        r.getCell(10).value = null; // spacer
        r.getCell(11).value = 0; // Previous War Council (placeholder)
        r.getCell(12).value = { formula: \`Sheet4!H\${s4Ref}\` }; // Percentage

        // Style all cells
        for (let c = 1; c <= 12; c++) {
          const cell = r.getCell(c);
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (c === 12) cell.numFmt = '0%';
        }
      });

      // Sheet1 total row
      const s1TotalRow = provinceData.length + 2;
      const s1r = sheet1.getRow(s1TotalRow);
      s1r.getCell(1).value = '';
      s1r.getCell(2).value = 'TOTAL';
      for (let c = 3; c <= 12; c++) {
        if (c === 10) continue; // spacer
        const colLetter = String.fromCharCode(64 + c); // C, D, E, ...
        s1r.getCell(c).value = { formula: \`SUM(\${colLetter}2:\${colLetter}\${s1TotalRow - 1})\` };
      }
      // Override percentage: F total / B total from Sheet4
      s1r.getCell(12).value = { formula: \`Sheet4!H\${grandTotalRow}\` };

      // Style total row
      for (let c = 1; c <= 12; c++) {
        const cell = s1r.getCell(c);
        cell.font = { name: 'Arial', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (c === 12) cell.numFmt = '0%';
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);

    } catch (error: any) {
      throw new Error(\`Failed to generate ward audit Excel report: \${error.message}\`);
    }
  }`;

const newContent = [...before, sheet4Code, '', ...after].join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Phase 2 done - added Sheet4 + Sheet1 building code + method close');
console.log('New file has', newContent.split('\n').length, 'lines');

