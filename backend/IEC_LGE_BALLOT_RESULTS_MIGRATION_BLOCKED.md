# IEC LGE Ballot Results Service Migration - BLOCKED

## ❌ **Migration Status: BLOCKED**

The migration of `iecLgeBallotResultsService.ts` to Prisma ORM is **blocked** due to missing database table and service dependencies.

---

## 🚫 **Blocking Issues**

### 1. Missing Database Table

The service requires the `iec_lge_ballot_results` table that **does not exist** in the current Prisma schema.

**Required Fields**:
- `id` - Primary key
- `iec_event_id` - INT (foreign key to iec_electoral_events)
- `iec_province_id` - INT (nullable)
- `iec_municipality_id` - VARCHAR (nullable, can be string or number)
- `iec_ward_id` - VARCHAR (nullable, can be string or number)
- `province_code` - VARCHAR (nullable, our internal code)
- `municipality_code` - VARCHAR (nullable, our internal code)
- `ward_code` - VARCHAR (nullable, our internal code)
- `ballot_data` - JSONB (ballot results data from IEC API)
- `total_votes` - INT
- `registered_voters` - INT
- `voter_turnout_percentage` - DECIMAL
- `result_type` - VARCHAR ('province', 'municipality', or 'ward')
- `data_source` - VARCHAR (e.g., 'IEC_API', 'MOCK')
- `last_updated` - TIMESTAMP
- `created_at` - TIMESTAMP

**Unique Constraint**: Combination of `iec_event_id`, `result_type`, and geographic identifiers

### 2. Service Dependencies

The service depends on **two other services** that are also blocked:

1. **`iecElectoralEventsService`** - ✅ MIGRATED (Available)
2. **`iecGeographicMappingService`** - ❌ BLOCKED (Missing mapping tables)

The service cannot function without `iecGeographicMappingService` because it needs to:
- Convert our province codes to IEC province IDs
- Convert our municipality codes to IEC municipality IDs
- Convert our ward codes to IEC ward IDs

---

## 📋 **Service Overview**

### Purpose
Handles Local Government Election (LGE) ballot results from the IEC API, including:
- Fetching ballot results by province, municipality, or ward
- Caching results in the database
- Generating mock data when IEC API is unavailable
- Providing statistics on cached results

### Key Features
- Geographic code to IEC ID mapping integration
- Result caching with automatic updates
- Support for province, municipality, and ward-level results
- Mock data generation for testing
- Result statistics and reporting

---

## 🔧 **Methods in Service (8 total)**

### Public Query Methods (3):
1. `getBallotResultsByProvinceCode()` - Get results by province code
2. `getBallotResultsByMunicipalityCode()` - Get results by municipality code
3. `getBallotResultsByWardCode()` - Get results by ward code

### Private Data Methods (4):
1. `fetchBallotResultsFromIecApi()` - Fetch from IEC API (currently returns mock data)
2. `getCachedBallotResults()` - Get cached results from database
3. `cacheBallotResults()` - Cache results to database
4. `generateMockBallotResults()` - Generate mock ballot data

### Statistics Method (1):
1. `getBallotResultsStatistics()` - Get statistics on cached results

---

## 📊 **SQL Queries Used**

### Read Queries (3):
1. `SELECT province_code FROM municipalities WHERE municipality_code = ?`
2. `SELECT municipality_code, province_code FROM wards WHERE ward_code = ?`
3. `SELECT * FROM iec_lge_ballot_results WHERE ...` (with various filters)

### Write Queries (1):
1. `INSERT INTO iec_lge_ballot_results ... ON DUPLICATE KEY UPDATE ...` (MySQL syntax)

### Statistics Queries (1):
1. `SELECT COUNT(*), SUM(CASE...), MAX(last_updated) FROM iec_lge_ballot_results`

---

## 🔧 **Required Actions to Unblock**

### Option 1: Create Missing Table and Fix Dependencies (Recommended)

1. **Create Database Migration** for ballot results table:
   ```sql
   CREATE TABLE iec_lge_ballot_results (
     id SERIAL PRIMARY KEY,
     iec_event_id INT NOT NULL REFERENCES iec_electoral_events(iec_event_id),
     iec_province_id INT,
     iec_municipality_id VARCHAR(50),
     iec_ward_id VARCHAR(50),
     province_code VARCHAR(10),
     municipality_code VARCHAR(20),
     ward_code VARCHAR(20),
     ballot_data JSONB NOT NULL,
     total_votes INT NOT NULL,
     registered_voters INT NOT NULL,
     voter_turnout_percentage DECIMAL(5,2) NOT NULL,
     result_type VARCHAR(20) NOT NULL CHECK (result_type IN ('province', 'municipality', 'ward')),
     data_source VARCHAR(50) NOT NULL,
     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(iec_event_id, result_type, iec_province_id, iec_municipality_id, iec_ward_id)
   );

   CREATE INDEX idx_ballot_results_event ON iec_lge_ballot_results(iec_event_id);
   CREATE INDEX idx_ballot_results_province ON iec_lge_ballot_results(iec_province_id);
   CREATE INDEX idx_ballot_results_municipality ON iec_lge_ballot_results(iec_municipality_id);
   CREATE INDEX idx_ballot_results_ward ON iec_lge_ballot_results(iec_ward_id);
   CREATE INDEX idx_ballot_results_type ON iec_lge_ballot_results(result_type);
   ```

2. **Unblock `iecGeographicMappingService`** first (create mapping tables)

3. **Update Prisma Schema** with new table

4. **Regenerate Prisma Client**: `npx prisma generate`

5. **Complete Migration** of `iecLgeBallotResultsService.ts`

### Option 2: Skip This Service for Now

1. Keep `iecLgeBallotResultsService.ts` disabled
2. Continue migrating remaining services
3. Return to this service after:
   - `iecGeographicMappingService` is unblocked
   - Ballot results table is created

---

## 📈 **Impact Assessment**

### Services Affected:
- `iecLgeBallotResultsService.ts` - **BLOCKED**
- Related routes: `iecLgeBallotResults.ts` - **CANNOT BE ENABLED**

### Features Affected:
- LGE ballot results retrieval by province/municipality/ward
- Ballot results caching
- Integration with IEC API for election results
- Ballot results statistics

### Dependencies:
- **Requires**: `iecGeographicMappingService` (currently blocked)
- **Requires**: `iecElectoralEventsService` (✅ available)
- **Requires**: `iec_lge_ballot_results` table (missing)

---

## 🎯 **Recommendation**

**Skip this service for now** and continue with the remaining services:

1. ✅ mfaService.ts - MIGRATED
2. ✅ securityService.ts - MIGRATED
3. ⏸️ twoTierApprovalService.ts - **BLOCKED** (Missing schema)
4. ✅ iecElectoralEventsService.ts - MIGRATED
5. ❌ iecGeographicMappingService.ts - **BLOCKED** (Missing mapping tables)
6. ❌ iecLgeBallotResultsService.ts - **BLOCKED** (Missing table + depends on #5)
7. ⏭️ voterVerificationService.ts - **NEXT TO MIGRATE**
8. ⏭️ fileProcessingQueueManager.ts

After completing the other services, we can:
1. Create the necessary database migrations for mapping tables
2. Unblock `iecGeographicMappingService`
3. Create the ballot results table
4. Return to complete this service migration

---

## 📝 **Notes**

- The service has NOT been migrated due to missing table and blocked dependencies
- Service should remain disabled until schema updates and dependencies are resolved
- No routes should be enabled for this service
- The service currently uses mock data generation as IEC API integration is incomplete
- Ballot results table needs proper indexing for performance


