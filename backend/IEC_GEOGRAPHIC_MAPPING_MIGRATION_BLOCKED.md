# IEC Geographic Mapping Service Migration - BLOCKED

## ❌ **Migration Status: BLOCKED**

The migration of `iecGeographicMappingService.ts` to Prisma ORM is **blocked** due to missing database mapping tables.

---

## 🚫 **Blocking Issue**

### Missing Mapping Tables

The `iecGeographicMappingService.ts` requires the following mapping tables that **do not exist** in the current Prisma schema:

#### 1. `iec_province_mappings`
Maps our province codes to IEC API province IDs.

**Required Fields**:
- `id` - Primary key
- `province_code` - VARCHAR (our code: EC, FS, GP, etc.)
- `province_name` - VARCHAR
- `iec_province_id` - INT (IEC API province ID)
- `iec_province_name` - VARCHAR
- `is_active` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

#### 2. `iec_municipality_mappings`
Maps our municipality codes to IEC API municipality IDs.

**Required Fields**:
- `id` - Primary key
- `municipality_code` - VARCHAR (our code)
- `municipality_name` - VARCHAR
- `province_code` - VARCHAR (foreign key)
- `iec_municipality_id` - VARCHAR (can be string or number)
- `iec_municipality_name` - VARCHAR
- `iec_province_id` - INT
- `is_active` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

#### 3. `iec_ward_mappings`
Maps our ward codes to IEC API ward IDs.

**Required Fields**:
- `id` - Primary key
- `ward_code` - VARCHAR (our code)
- `ward_name` - VARCHAR
- `ward_number` - INT
- `municipality_code` - VARCHAR (foreign key)
- `province_code` - VARCHAR (foreign key)
- `iec_ward_id` - VARCHAR (can be string or number)
- `iec_ward_name` - VARCHAR
- `iec_municipality_id` - VARCHAR
- `iec_province_id` - INT
- `is_active` - BOOLEAN
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

---

## 📋 **Service Overview**

### Purpose
Discovers and manages mappings between our internal geographic codes and IEC (Independent Electoral Commission) API IDs for:
- Provinces
- Municipalities
- Wards

### Key Features
- Real IEC API integration for delimitation data
- Automatic discovery and mapping of geographic IDs
- Fallback to mock data when IEC API is unavailable
- Name-based and code-based matching algorithms
- Mapping statistics and reporting

---

## 🔧 **Methods in Service (15 total)**

### API Integration Methods (3):
1. `getAccessToken()` - IEC API authentication
2. `fetchMunicipalitiesFromIEC()` - Fetch municipalities from IEC API
3. `fetchWardsFromIEC()` - Fetch wards from IEC API

### Discovery Methods (4):
1. `discoverAndPopulateAllMappings()` - Main discovery orchestrator
2. `discoverProvinceIds()` - Discover province mappings
3. `discoverMunicipalityIds()` - Discover municipality mappings with real IEC data
4. `discoverWardIds()` - Discover ward mappings with real IEC data

### Matching Methods (2):
1. `matchMunicipalityWithIECData()` - Match our municipalities with IEC data
2. `matchWardWithIECData()` - Match our wards with IEC data

### Lookup Methods (3):
1. `getIecProvinceId()` - Get IEC province ID from our code
2. `getIecMunicipalityId()` - Get IEC municipality ID from our code
3. `getIecWardId()` - Get IEC ward ID from our code

### Utility Methods (3):
1. `generateMockMunicipalityId()` - Generate mock IDs for testing
2. `generateMockWardId()` - Generate mock ward IDs for testing
3. `getMappingStatistics()` - Get mapping statistics

---

## 📊 **SQL Queries Used**

### Province Queries (3):
- SELECT provinces needing mapping
- UPDATE province mappings
- SELECT province statistics

### Municipality Queries (4):
- SELECT provinces to process
- SELECT our municipalities
- INSERT/UPDATE municipality mappings (ON DUPLICATE KEY UPDATE)
- SELECT municipality statistics

### Ward Queries (4):
- SELECT municipalities to process
- SELECT our wards
- INSERT/UPDATE ward mappings (ON DUPLICATE KEY UPDATE)
- SELECT ward statistics

### Lookup Queries (3):
- SELECT IEC province ID by code
- SELECT IEC municipality ID by code
- SELECT IEC ward ID by code

---

## 🔧 **Required Actions to Unblock**

### Option 1: Create Missing Tables (Recommended)

1. **Create Database Migration** for mapping tables:
   ```sql
   CREATE TABLE iec_province_mappings (
     id SERIAL PRIMARY KEY,
     province_code VARCHAR(10) UNIQUE NOT NULL,
     province_name VARCHAR(255) NOT NULL,
     iec_province_id INT,
     iec_province_name VARCHAR(255),
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE iec_municipality_mappings (
     id SERIAL PRIMARY KEY,
     municipality_code VARCHAR(20) UNIQUE NOT NULL,
     municipality_name VARCHAR(255) NOT NULL,
     province_code VARCHAR(10) REFERENCES provinces(province_code),
     iec_municipality_id VARCHAR(50),
     iec_municipality_name VARCHAR(255),
     iec_province_id INT,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE iec_ward_mappings (
     id SERIAL PRIMARY KEY,
     ward_code VARCHAR(20) UNIQUE NOT NULL,
     ward_name VARCHAR(255),
     ward_number INT,
     municipality_code VARCHAR(20) REFERENCES municipalities(municipality_code),
     province_code VARCHAR(10) REFERENCES provinces(province_code),
     iec_ward_id VARCHAR(50),
     iec_ward_name VARCHAR(255),
     iec_municipality_id VARCHAR(50),
     iec_province_id INT,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Update Prisma Schema** with new tables

3. **Regenerate Prisma Client**: `npx prisma generate`

4. **Complete Migration** of `iecGeographicMappingService.ts`

### Option 2: Skip This Service for Now

1. Keep `iecGeographicMappingService.ts` disabled
2. Continue migrating other services
3. Return to this service after schema updates

---

## 📈 **Impact Assessment**

### Services Affected:
- `iecGeographicMappingService.ts` - **BLOCKED**
- Related routes: May exist but cannot be enabled

### Features Affected:
- IEC geographic ID discovery
- Province/Municipality/Ward mapping to IEC IDs
- Integration with IEC Delimitation API
- Geographic mapping statistics

---

## 🎯 **Recommendation**

**Skip this service for now** and continue with the remaining services:

1. ✅ mfaService.ts - MIGRATED
2. ✅ securityService.ts - MIGRATED
3. ⏸️ twoTierApprovalService.ts - **BLOCKED** (Missing schema)
4. ✅ iecElectoralEventsService.ts - MIGRATED
5. ❌ iecGeographicMappingService.ts - **BLOCKED** (Missing mapping tables)
6. ⏭️ iecLgeBallotResultsService.ts - **NEXT TO MIGRATE**
7. ⏭️ voterVerificationService.ts
8. ⏭️ fileProcessingQueueManager.ts

After completing the other services, we can:
1. Create the necessary database migrations for mapping tables
2. Update the Prisma schema
3. Return to complete this service migration

---

## 📝 **Notes**

- The service has NOT been migrated due to missing tables
- Service should remain disabled until schema updates are complete
- No routes should be enabled for this service
- The service uses real IEC API integration with fallback to mock data
- Mapping tables are critical for IEC API integration features


