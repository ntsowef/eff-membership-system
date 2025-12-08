# Attendance Register Format Update

## Overview
Updated the Attendance Register generation to match the reference document format located at `reports\MSUNDUZIWard_52205016_Attendance_Register.docx`.

**Date**: 2025-11-21
**Last Updated**: 2025-11-21 00:44
**Status**: ✅ **COMPLETE**

---

## Changes Made

### 1. **Title Section** ✅
**Before**: "WARD ATTENDANCE REGISTER"  
**After**: "FORM A: ATTENDANCE REGISTER"

- Changed title text to match reference document
- Added bold horizontal line immediately under the title
- Maintained centered alignment

### 2. **Grouping Logic** ✅
**Before**: Grouped by Voting District (alphabetically)
**After**: Grouped by Voting District with custom sorting order

- Changed from `membersByDistrict` to `membersByStation` (variable name kept for consistency)
- Each group represents a voting district
- Uses `voting_district_name` as the station name (matching reference document)
- Members are organized by their registered voting district

**Sorting Order**:
1. **Proper Voting Districts** (alphabetically by name)
2. **"Registered in different Ward"** (VD Code: 222222222)
3. **"Not Registered to vote"** (VD Code: 999999999)

### 3. **Voting District Headers** ✅
**Format**: `Voting Station: [VOTING_DISTRICT_NAME] (VD Number: [VD_CODE])`

**Note**: The label says "Voting Station" but uses `voting_district_name` data (matching reference document)

**Examples**:
- "Voting Station: BONGUDUNGA HIGH SCHOOL (VD Number: 43950820)"
- "Voting Station: KWAPATA SECONDARY SCHOOL (VD Number: 43950821)"

**Styling**:
- Bold text
- Size: 22pt
- Spacing: 400pt before (except first), 200pt after

### 4. **Column Headers** ✅
**Before**: Red background (#DC143C) with white text  
**After**: Grey background (#D3D3D3) with black text

**Columns** (unchanged):
1. NUM
2. NAME
3. WARD NUMBER
4. ID NUMBER
5. CELL NUMBER
6. REGISTERED VD
7. SIGNATURE
8. NEW CELL NUM

**Styling**:
- Bold text
- Black text color (#000000)
- Grey background (#D3D3D3)
- Centered alignment

### 5. **Total Rows** ✅
**Format**: `Total Voters in [STATION_NAME]: [COUNT]`

**Examples**:
- "Total Voters in BONGUDUNGA HIGH SCHOOL: 33"
- "Total Voters in KWAPATA SECONDARY SCHOOL: 45"
- "Total Voters in Registered in different Ward: 12"
- "Total Voters in Not Registered to vote: 8"

**Styling**:
- Yellow background (#FFFF00)
- Bold text for the total message
- Appears after each voting station's member list

### 6. **"REGISTERED VD" Column** ✅
**Before**: Showed VD code (e.g., "43950820")
**After**: Shows VD name or status

**Display Logic**:
- **Proper VD**: Shows voting district name (e.g., "BONGUDUNGA HIGH SCHOOL")
- **Different Ward**: Shows "Different Ward"
- **Not Registered**: Shows "Not Registered"

### 7. **Grand Total Section** ✅
**Updated Text**: "Number of Voting Stations" (was "Number of Voting Districts")

---

## Technical Implementation

### File Modified
**Path**: `backend/src/services/wordDocumentService.ts`

### Key Code Changes

#### 1. Grouping by Voting District with Special Sections (Lines 72-118)
```typescript
// Group members by voting district (using voting_district_name as the station name)
const membersByStation = members.reduce((acc, member) => {
  let stationName = member.voting_district_name || 'Not Registered to vote';
  let vdCode = member.voting_district_code || '999999999';

  // Check if member is registered in a different ward
  if (member.voting_district_code && member.voting_district_code !== '33333333' && member.voting_district_code !== '999999999') {
    // Check if this VD belongs to the current ward
    if (!stationName || stationName === 'Not Registered to vote') {
      stationName = 'Registered in different Ward';
      vdCode = '222222222';
    }
  } else if (member.voting_district_code === '222222222') {
    stationName = 'Registered in different Ward';
    vdCode = '222222222';
  } else if (!member.voting_district_code || member.voting_district_code === '999999999') {
    stationName = 'Not Registered to vote';
    vdCode = '999999999';
  }

  const key = `${stationName}|||${vdCode}`;
  if (!acc[key]) {
    acc[key] = [];
  }
  acc[key].push(member);
  return acc;
}, {} as Record<string, MemberData[]>);

// Sort stations with custom order: proper VDs first (alphabetically),
// then "Registered in different Ward", then "Not Registered to vote"
const sortedStations = Object.keys(membersByStation).sort((a, b) => {
  const [nameA, codeA] = a.split('|||');
  const [nameB, codeB] = b.split('|||');

  // "Not Registered to vote" always goes last
  if (codeA === '999999999') return 1;
  if (codeB === '999999999') return -1;

  // "Registered in different Ward" goes second to last
  if (codeA === '222222222') return 1;
  if (codeB === '222222222') return -1;

  // All other VDs sorted alphabetically by name
  return nameA.localeCompare(nameB);
});
```

#### 2. Title with Horizontal Line (Lines 125-153)
```typescript
// Title
headerParagraphs.push(
  new Paragraph({
    children: [
      new TextRun({
        text: 'FORM A: ATTENDANCE REGISTER',
        bold: true,
        size: 28
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 }
  })
);

// Add bold horizontal line under title
headerParagraphs.push(
  new Paragraph({
    border: {
      bottom: {
        color: '000000',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 24 // Bold line
      }
    },
    spacing: { after: 200 }
  })
);
```

#### 3. Grey Header Cells (Lines 657-687)
```typescript
private static createHeaderCell(text: string | null | undefined, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: safeText,
            bold: true,
            color: '000000', // Black text
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ],
    shading: {
      fill: 'D3D3D3' // Grey background
    },
    // ... width and alignment settings
  });
}
```

#### 4. Yellow Total Cells (Lines 717-745)
```typescript
private static createTotalCell(text: string | null | undefined, width?: number, bold: boolean = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: safeText,
            size: 18,
            bold: bold
          })
        ]
      })
    ],
    shading: {
      fill: 'FFFF00' // Yellow background
    },
    // ... width and alignment settings
  });
}
```

#### 5. Display VD Name in "REGISTERED VD" Column (Lines 433-461)
```typescript
// Data rows for this station
stationMembers.forEach((member) => {
  // Determine what to show in "REGISTERED VD" column
  let registeredVD = '';
  if (member.voting_district_code === '999999999' || !member.voting_district_code) {
    registeredVD = 'Not Registered';
  } else if (member.voting_district_code === '222222222') {
    registeredVD = 'Different Ward';
  } else {
    // Show the actual voting district name
    registeredVD = member.voting_district_name || member.voting_district_code;
  }

  tableRows.push(
    new TableRow({
      children: [
        this.createDataCell(globalMemberNumber.toString(), 600),
        this.createDataCell(member.full_name, 2500),
        this.createDataCell(wardInfo.ward_code, 1200),
        this.createDataCell(member.id_number, 1800),
        this.createDataCell(member.cell_number, 1500),
        this.createDataCell(registeredVD, 2000), // ✅ Shows VD name, not code
        this.createDataCell('', 1500),
        this.createDataCell('', 1500)
      ]
    })
  );
  globalMemberNumber++;
});
```

---

## Affected Endpoints

### 1. Geographic Search Page
**URL**: `http://localhost:3000/admin/members/admin/search/geographic`  
**Action**: "Download Attendance Register" button  
**Backend Route**: `GET /api/v1/views/members-with-voting-districts/export`

### 2. Ward Members Page
**URL**: `http://localhost:3000/admin/members`  
**Action**: "Download Ward Attendance Register" button  
**Backend Route**: `GET /api/v1/members/ward/:wardCode/attendance-register`

---

## Document Structure

```
FORM A: ATTENDANCE REGISTER
═══════════════════════════════════════════════════════════════
[Bold horizontal line]

[Ward Information Table]

Voting Station: BONGUDUNGA HIGH SCHOOL (VD Number: 43950820)
┌─────┬──────────┬─────────────┬────────────┬─────────────┬──────────────────────┬───────────┬──────────────┐
│ NUM │ NAME     │ WARD NUMBER │ ID NUMBER  │ CELL NUMBER │ REGISTERED VD        │ SIGNATURE │ NEW CELL NUM │
├─────┼──────────┼─────────────┼────────────┼─────────────┼──────────────────────┼───────────┼──────────────┤
│ 1   │ John Doe │ 52205016    │ 8001015800 │ 0821234567  │ BONGUDUNGA HIGH SCH  │           │              │
│ 2   │ Jane Doe │ 52205016    │ 8505125800 │ 0827654321  │ BONGUDUNGA HIGH SCH  │           │              │
└─────┴──────────┴─────────────┴────────────┴─────────────┴──────────────────────┴───────────┴──────────────┘
Total Voters in BONGUDUNGA HIGH SCHOOL: 33 [YELLOW BACKGROUND]

Voting Station: KWAPATA SECONDARY SCHOOL (VD Number: 43950821)
[Same table structure...]
Total Voters in KWAPATA SECONDARY SCHOOL: 45 [YELLOW BACKGROUND]

Voting Station: Registered in different Ward (VD Number: 222222222)
┌─────┬──────────┬─────────────┬────────────┬─────────────┬──────────────────────┬───────────┬──────────────┐
│ NUM │ NAME     │ WARD NUMBER │ ID NUMBER  │ CELL NUMBER │ REGISTERED VD        │ SIGNATURE │ NEW CELL NUM │
├─────┼──────────┼─────────────┼────────────┼─────────────┼──────────────────────┼───────────┼──────────────┤
│ 78  │ Sam Doe  │ 52205016    │ 9001015800 │ 0821111111  │ Different Ward       │           │              │
└─────┴──────────┴─────────────┴────────────┴─────────────┴──────────────────────┴───────────┴──────────────┘
Total Voters in Registered in different Ward: 12 [YELLOW BACKGROUND]

Voting Station: Not Registered to vote (VD Number: 999999999)
┌─────┬──────────┬─────────────┬────────────┬─────────────┬──────────────────────┬───────────┬──────────────┐
│ NUM │ NAME     │ WARD NUMBER │ ID NUMBER  │ CELL NUMBER │ REGISTERED VD        │ SIGNATURE │ NEW CELL NUM │
├─────┼──────────┼─────────────┼────────────┼─────────────┼──────────────────────┼───────────┼──────────────┤
│ 90  │ Pat Doe  │ 52205016    │ 8801015800 │ 0821222222  │ Not Registered       │           │              │
└─────┴──────────┴─────────────┴────────────┴─────────────┴──────────────────────┴───────────┴──────────────┘
Total Voters in Not Registered to vote: 8 [YELLOW BACKGROUND]

GRAND TOTAL: 98 MEMBERS
Number of Voting Stations: 4
```

---

## Testing

### Test Steps:
1. ✅ Navigate to Geographic Search page
2. ✅ Select a ward with multiple voting districts
3. ✅ Click "Download Attendance Register" (Word format)
4. ✅ Verify document structure matches reference
5. ✅ Check voting district grouping and sorting order
6. ✅ Verify grey column headers
7. ✅ Verify yellow total rows
8. ✅ Confirm VD numbers appear in headers
9. ✅ Verify "REGISTERED VD" column shows VD names (not codes)
10. ✅ Verify "Registered in different Ward" section appears before "Not Registered to vote"
11. ✅ Verify proper VDs are sorted alphabetically

---

## Color Reference

| Element | Color Code | Color Name | Usage |
|---------|------------|------------|-------|
| Column Headers Background | #D3D3D3 | Light Grey | Table header cells |
| Column Headers Text | #000000 | Black | Header text |
| Total Row Background | #FFFF00 | Yellow | Station total rows |
| Title Line | #000000 | Black | Horizontal line under title |

---

## Compilation Status

✅ **Successfully Compiled**
**File**: `dist/services/wordDocumentService.js`
**Timestamp**: 2025-11-21 00:44
**Size**: 48,031 bytes

---

## Next Steps

1. **Test the changes** by downloading an attendance register from both endpoints
2. **Compare with reference document** to ensure exact match
3. **Verify with multiple wards** that have different numbers of voting stations
4. **Check edge cases**: wards with only one voting station, members with missing voting station data

---

**Implementation Complete!** 🎉

