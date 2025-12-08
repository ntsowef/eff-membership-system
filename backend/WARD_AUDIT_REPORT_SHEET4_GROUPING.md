# Ward Audit Report - Sheet 4 Province Grouping & Totals Implementation

## 📋 Overview

Implemented hierarchical grouping by province with totals rows in **Sheet 4** of the Ward Audit Excel Report (`Audit.xlsx`).

---

## ✨ Features Implemented

### 1. **Province Grouping**
- All municipalities are now grouped by their parent province in Sheet 4
- Province name displayed as a header row with **light blue background** (#E3F2FD)
- Municipalities listed underneath their respective province header
- Sorted alphabetically by province, then by municipality

### 2. **Province Totals Row**
- Added totals row after each province group with **light grey background** (#F5F5F5)
- Totals row uses **Excel SUM formulas** to aggregate numeric data dynamically
- Bold text styling for better visual distinction
- Label format: `"{Province Name} - Total"`

### 3. **Columns Totaled with Excel Formulas**

#### **Numeric Totals (SUM Formulas):**
- `NUMBER OF IEC WARDS` - Formula: `=SUM(B{startRow}:B{endRow})`
- `NUMBER OF BRANCHES CONVENED` - Formula: `=SUM(D{startRow}:D{endRow})`
- `NUMBER OF BRANCHES NOT CONVENED` - Formula: `=SUM(E{startRow}:E{endRow})`
- `NUMBER OF BRANCHES PASSED AUDIT` - Formula: `=SUM(F{startRow}:F{endRow})`
- `NUMBER OF BRANCHES FAILED AUDIT` - Formula: `=SUM(G{startRow}:G{endRow})`

#### **Calculated Metrics (Formula):**
- `PERCENTAGE % TOWARDS BPA/BGA` - Formula: `=IF(B{totalsRow}=0,0,F{totalsRow}/B{totalsRow})`
  - Calculates: (Branches Passed / Total Wards)
  - Handles division by zero with IF statement
  - Formatted as percentage with 2 decimal places
  - Uses the totals row's own values (from SUM formulas)

---

## 🎨 Visual Design

### **Province Header Row:**
- Background color: `#E3F2FD` (light blue)
- Font: Bold, size 12
- Alignment: Left
- Spans all 8 columns
- Border: Thin borders on all sides

### **Municipality Data Rows:**
- Background: White (default)
- Font: Regular, size 11
- Number columns: Right-aligned with `#,##0` format
- Percentage column: Right-aligned with `0.00%` format
- Text columns: Left-aligned
- Border: Thin borders on all sides

### **Province Totals Row:**
- Background color: `#F5F5F5` (light grey)
- Font: Bold, size 11
- Number columns: Right-aligned with `#,##0` format
- Percentage column: Right-aligned with `0.00%` format
- Text columns: Left-aligned
- Border: Thin borders on all sides

---

## 📁 Files Modified

### **`backend/src/services/excelReportService.ts`**

#### **Changes Made:**

1. **Updated SQL Query (Lines 255-276):**
   - Added `m.province_name` to SELECT clause
   - Added `m.province_name` to GROUP BY clause
   - Maintained ORDER BY with province first

2. **Added Province Grouping Logic (Lines 279-293):**
```typescript
// Group municipalities by province
const groupedByProvince: Record<string, any[]> = {};
municipalityDataRaw.forEach((row: any) => {
  const provinceName = row.province_name || 'Unknown Province';
  if (!groupedByProvince[provinceName]) {
    groupedByProvince[provinceName] = [];
  }
  groupedByProvince[provinceName].push(row);
});
```

3. **Prepared Grouped Data with Row Tracking (Lines 321-378):**
```typescript
// Prepare data with province headers and totals (with row tracking for formulas)
const municipalityData: any[] = [];
const totalsRowInfo: Array<{ rowNumber: number; startRow: number; endRow: number }> = [];

Object.entries(groupedByProvince).forEach(([provinceName, municipalities]) => {
  // Add province header row
  municipalityData.push({
    'MUNICIPALITY/ DISTRICTS': provinceName,
    'NUMBER OF IEC WARDS': '',
    '': '',
    'NUMBER OF BRANCHES CONVENED': '',
    'NUMBER OF BRANCHES NOT CONVENED': '',
    'NUMBER OF BRANCHES PASSED AUDIT': '',
    'NUMBER OF BRANCHES FAILED AUDIT': '',
    'PERCENTAGE % TOWARDS BPA/BGA': '',
    _isProvinceHeader: true,
  });

  // Track the start row for this province's municipalities
  const startRow = municipalityData.length + 2; // +2 for Excel 1-based + header row

  // Add municipality rows
  municipalities.forEach(muni => {
    municipalityData.push({
      'MUNICIPALITY/ DISTRICTS': muni['MUNICIPALITY/ DISTRICTS'],
      'NUMBER OF IEC WARDS': muni['NUMBER OF IEC WARDS'],
      '': '',
      'NUMBER OF BRANCHES CONVENED': muni['NUMBER OF BRANCHES CONVENED'],
      'NUMBER OF BRANCHES NOT CONVENED': muni['NUMBER OF BRANCHES NOT CONVENED'],
      'NUMBER OF BRANCHES PASSED AUDIT': muni['NUMBER OF BRANCHES PASSED AUDIT'],
      'NUMBER OF BRANCHES FAILED AUDIT': muni['NUMBER OF BRANCHES FAILED AUDIT'],
      'PERCENTAGE % TOWARDS BPA/BGA': muni['PERCENTAGE % TOWARDS BPA/BGA'],
    });
  });

  // Track the end row for this province's municipalities
  const endRow = municipalityData.length + 1; // +1 for Excel 1-based indexing

  // Add province totals row (empty, will be populated with formulas)
  municipalityData.push({
    'MUNICIPALITY/ DISTRICTS': `${provinceName} - Total`,
    'NUMBER OF IEC WARDS': '',
    '': '',
    'NUMBER OF BRANCHES CONVENED': '',
    'NUMBER OF BRANCHES NOT CONVENED': '',
    'NUMBER OF BRANCHES PASSED AUDIT': '',
    'NUMBER OF BRANCHES FAILED AUDIT': '',
    'PERCENTAGE % TOWARDS BPA/BGA': '',
    _isProvinceTotals: true,
  });

  // Store row info for adding formulas later
  totalsRowInfo.push({
    rowNumber: municipalityData.length + 1, // +1 for Excel 1-based indexing
    startRow,
    endRow,
  });
});
```

4. **Added Excel SUM Formulas to Totals Rows (Lines 410-431):**
```typescript
// Add SUM formulas to totals rows
totalsRowInfo.forEach((info) => {
  const totalsRow = sheet4.getRow(info.rowNumber);

  // Column B (2): NUMBER OF IEC WARDS
  totalsRow.getCell(2).value = { formula: `SUM(B${info.startRow}:B${info.endRow})` };

  // Column D (4): NUMBER OF BRANCHES CONVENED
  totalsRow.getCell(4).value = { formula: `SUM(D${info.startRow}:D${info.endRow})` };

  // Column E (5): NUMBER OF BRANCHES NOT CONVENED
  totalsRow.getCell(5).value = { formula: `SUM(E${info.startRow}:E${info.endRow})` };

  // Column F (6): NUMBER OF BRANCHES PASSED AUDIT
  totalsRow.getCell(6).value = { formula: `SUM(F${info.startRow}:F${info.endRow})` };

  // Column G (7): NUMBER OF BRANCHES FAILED AUDIT
  totalsRow.getCell(7).value = { formula: `SUM(G${info.startRow}:G${info.endRow})` };

  // Column H (8): PERCENTAGE % TOWARDS BPA/BGA (calculated: passed / total wards)
  totalsRow.getCell(8).value = { formula: `IF(B${info.rowNumber}=0,0,F${info.rowNumber}/B${info.rowNumber})` };
});
```

5. **Updated Excel Rendering with Conditional Styling (Lines 433-547):**
   - Track province header and totals row numbers
   - Apply light blue background to province headers
   - Apply light grey background to totals rows
   - Apply bold font to both special row types
   - Maintain proper number and percentage formatting

---

## 🔍 Example Output Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ Sheet 4: MUNICIPALITY/DISTRICT DETAIL                            │
├──────────────────────────────────────────────────────────────────┤
│ EASTERN CAPE (Province Header - Light Blue Background)           │
├──────────────────────────────────────────────────────────────────┤
│ Buffalo City Metro        │ 120 │ │ 85 │ 35 │ 90 │ 30 │ 75.00% │
│ Nelson Mandela Bay Metro  │ 100 │ │ 70 │ 30 │ 75 │ 25 │ 75.00% │
├──────────────────────────────────────────────────────────────────┤
│ Eastern Cape - Total (Grey Background, Bold) │ 220 │ │ 155 │...│
├──────────────────────────────────────────────────────────────────┤
│ GAUTENG (Province Header - Light Blue Background)                │
├──────────────────────────────────────────────────────────────────┤
│ City of Johannesburg      │ 150 │ │ 120 │ 30 │ 130 │ 20 │ 86.67%│
│ City of Tshwane           │ 120 │ │ 100 │ 20 │ 110 │ 10 │ 91.67%│
│ Ekurhuleni                │ 110 │ │  95 │ 15 │ 100 │ 10 │ 90.91%│
├──────────────────────────────────────────────────────────────────┤
│ Gauteng - Total (Grey Background, Bold)      │ 380 │ │ 315 │...│
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Benefits

1. **Better Data Organization** - Easy to see which municipalities belong to which province
2. **Quick Province-Level Insights** - Totals rows provide immediate province-level metrics
3. **Improved Readability** - Visual separation between provinces with colored headers
4. **Dynamic Calculations** - Excel formulas automatically recalculate if data changes
5. **Accurate Aggregation** - SUM formulas ensure precise totals, percentage formula handles division by zero
6. **Professional Appearance** - Clean, easy-to-read Excel report with live formulas

---

## 🧪 Testing Instructions

### **How to Generate the Report:**

1. **Via API Endpoint:**
   ```bash
   GET /api/v1/audit/ward-membership/export?format=excel
   ```

2. **Via Reports Generation:**
   ```bash
   POST /api/v1/reports/generate
   ```
   This generates `Audit.xlsx` file

### **What to Verify:**

- [ ] Open the generated `Audit.xlsx` file
- [ ] Navigate to **Sheet 4**
- [ ] Verify municipalities are grouped by province
- [ ] Verify province header rows have light blue background (#E3F2FD)
- [ ] Verify province header text is bold
- [ ] Verify totals rows appear after each province group
- [ ] Verify totals rows have light grey background (#F5F5F5)
- [ ] Verify totals rows have bold text
- [ ] **Click on totals row cells** - Verify they contain **SUM formulas** (e.g., `=SUM(B3:B5)`)
- [ ] Verify percentage cell contains formula (e.g., `=IF(B6=0,0,F6/B6)`)
- [ ] Verify formulas calculate correctly (check the displayed values)
- [ ] Verify number formatting: `#,##0` for integers
- [ ] Verify percentage formatting: `0.00%` with 2 decimals
- [ ] Verify borders are applied to all cells
- [ ] **Test formula recalculation** - Change a municipality value and verify totals update automatically
- [ ] Test with province filter: `?province_code=GP`
- [ ] Test without province filter (all provinces)

---

## 🚀 Status: READY FOR TESTING

The hierarchical grouping and totals functionality in Sheet 4 of the Ward Audit Report is complete and ready for testing!

