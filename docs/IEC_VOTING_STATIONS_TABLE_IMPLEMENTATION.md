# IEC Voting Stations Reference Table - Implementation

## Overview

Created a new centralized reference table `iec_voting_stations` that contains complete IEC voting station data for mapping IEC IDs to internal geographic codes. This replaces the need for separate mapping tables and provides a single source of truth for IEC data.

---

## Table Structure

### Table Name: `iec_voting_stations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `town` | VARCHAR(255) | Town name |
| `suburb` | VARCHAR(255) | Suburb name |
| `street` | VARCHAR(255) | Street address |
| `latitude` | DECIMAL(10,7) | GPS latitude |
| `longitude` | DECIMAL(10,7) | GPS longitude |
| `iec_province_id` | INTEGER | IEC Province ID (e.g., 3 for Gauteng) |
| `iec_province_name` | VARCHAR(100) | IEC Province name |
| `iec_municipality_id` | INTEGER | IEC Municipality ID (e.g., 3003 for JHB) |
| `iec_municipality_name` | VARCHAR(255) | IEC Municipality name |
| `iec_ward_id` | BIGINT | IEC Ward ID (e.g., 79800135) |
| `iec_vd_number` | BIGINT | IEC Voting District Number (unique) |
| `iec_voting_district_name` | VARCHAR(255) | Voting station name |
| `iec_vd_address` | TEXT | Voting station address |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Record update timestamp |

### Indexes

- `idx_iec_voting_stations_province_id` - Fast province lookups
- `idx_iec_voting_stations_municipality_id` - Fast municipality lookups
- `idx_iec_voting_stations_ward_id` - Fast ward lookups
- `idx_iec_voting_stations_vd_number` - Fast VD number lookups (unique)
- `idx_iec_voting_stations_lookup` - Composite index for multi-level queries

---

## Data Source

**File**: `reports/VOTING_STATIONS_ELECTIONS.xlsx`

**Statistics**:
- Total Records: **22,979 voting stations**
- Provinces: **9**
- Municipalities: **213**
- Wards: **4,468**

---

## Implementation Files

### 1. Database Migration
**File**: `backend/migrations/create_iec_voting_stations_table.sql`
- Creates the table with proper structure
- Adds indexes for performance
- Sets up constraints and permissions

### 2. Data Import Script
**File**: `backend/scripts/import-iec-voting-stations.py`
- Reads Excel file
- Imports all 22,979 records
- Batch processing (1,000 records per batch)
- Verification and statistics

### 3. Prisma Schema
**File**: `backend/prisma/schema.prisma`
- Added `iec_voting_stations` model
- Proper field types and indexes
- Ready for Prisma Client generation

### 4. IEC API Service Update
**File**: `backend/src/services/iecApiService.ts`
- Updated to use new table for IEC ID lookups
- Single query approach (more efficient)
- Improved mapping logic with fallbacks

---

## How It Works

### Old Approach (Before)
```
1. Query iec_province_mappings for province code
2. Query iec_municipality_mappings for municipality code
3. Query iec_ward_mappings for ward code
4. Query voting_districts for voting district code
= 4 separate database queries
```

### New Approach (After)
```
1. Query iec_voting_stations by VD Number (single query)
2. Extract all IEC IDs from the result
3. Map IEC IDs to internal codes using existing tables
= More efficient, single source of truth
```

### Mapping Logic

```typescript
// 1. Find voting station by VD Number
const votingStation = await prisma.iec_voting_stations.findFirst({
  where: { iec_vd_number: BigInt(vdNumber) }
});

// 2. Map Province: IEC Province ID → Province Code
// 3. Map Municipality: IEC Municipality Name → Municipality Code
// 4. Map Ward: IEC Ward ID → Ward Code
// 5. Map Voting District: Ward Code + Station Name → VD Code
```

---

## Test Case Verification

**Test ID**: 7808020703087

### IEC Data Retrieved:
```json
{
  "iec_province_id": 3,
  "iec_province_name": "Gauteng",
  "iec_municipality_id": 3003,
  "iec_municipality_name": "JHB - City of Johannesburg",
  "iec_ward_id": 79800135,
  "iec_vd_number": 32871326,
  "iec_voting_district_name": "GLEN RIDGE PRIMARY SCHOOL",
  "town": "JOHANNESBURG",
  "suburb": "PROTEA GLEN EXT 16, SOWETO",
  "street": "74 ALFONSO STREET"
}
```

### Expected Mappings:
- Province: IEC ID 3 → `GP` (Gauteng)
- Municipality: IEC ID 3003 → `JHB` (City of Johannesburg)
- Ward: IEC ID 79800135 → `JHB135` (Ward 135)
- Voting District: VD 32871326 → Voting district code

---

## Deployment Steps

### 1. Run Database Migration
```bash
python -c "import psycopg2; conn = psycopg2.connect(host='localhost', user='eff_admin', password='Frames!123', database='eff_membership_database', port=5432); cur = conn.cursor(); cur.execute(open('backend/migrations/create_iec_voting_stations_table.sql').read()); conn.commit(); conn.close()"
```

### 2. Import Data
```bash
python backend/scripts/import-iec-voting-stations.py
```

### 3. Regenerate Prisma Client
```bash
cd backend
npx prisma generate
```

### 4. Restart Backend Server
```bash
cd backend
npm run dev
```

---

## Benefits

✅ **Single Source of Truth**: All IEC data in one table  
✅ **Complete Data**: 22,979 voting stations with full details  
✅ **Efficient Queries**: Single query instead of multiple joins  
✅ **Accurate Mapping**: Uses exact VD number for lookups  
✅ **Easy Maintenance**: Update one table instead of multiple  
✅ **GPS Coordinates**: Includes latitude/longitude for mapping  
✅ **Full Address**: Town, suburb, street for each station  

---

## Next Steps

1. ✅ **Table Created**: `iec_voting_stations` table created
2. ✅ **Data Imported**: All 22,979 records imported
3. ✅ **Prisma Model Added**: Schema updated
4. ✅ **Service Updated**: `iecApiService.ts` updated
5. ⏳ **Regenerate Prisma**: Run `npx prisma generate` (requires backend restart)
6. ⏳ **Test Auto-Population**: Test with ID 7808020703087
7. ⏳ **Verify Mappings**: Confirm all fields auto-populate correctly

---

## Status

**Implementation**: ✅ **COMPLETE**  
**Data Import**: ✅ **COMPLETE** (22,979 records)  
**Code Updates**: ✅ **COMPLETE**  
**Testing**: ⏳ **PENDING** (requires Prisma regeneration and backend restart)

