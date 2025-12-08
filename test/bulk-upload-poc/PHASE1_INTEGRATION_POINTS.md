# Phase 1: Integration Points Analysis

## 🔌 Existing Node.js Services - Reusable Components

### ✅ Services We Can Reuse

---

## 1. **IEC API Service** ⭐ HIGH PRIORITY

**File:** `backend/src/services/iecApiService.ts`  
**Status:** ✅ Fully functional, production-ready  
**Reusability:** 100% - Can be used as-is

**Key Features:**
- OAuth 2.0 authentication with token caching
- Rate limiting (10,000 requests/hour)
- Voter verification by ID number
- Voting district information lookup
- Ward and municipality mapping
- IEC ID → Internal code mapping

**Interface:**
```typescript
class IECApiService {
  async verifyVoter(idNumber: string): Promise<IECVoterDetails | null>
  async getVotingDistrictInfo(votingDistrictCode: string): Promise<any>
  async validateVotingDistrict(votingDistrictCode: string): Promise<boolean>
  async getApiStatus(): Promise<{ status: string; timestamp: string }>
}

export interface IECVoterDetails {
  id_number: string;
  is_registered: boolean;
  voter_status: string;
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  voting_district_code?: string;
  voting_station_name?: string;
  // ... more fields
}
```

**Usage in Bulk Upload:**
```typescript
import { iecApiService } from '../services/iecApiService';

// Verify single voter
const voterDetails = await iecApiService.verifyVoter('1234567890123');

// Batch verification (add wrapper)
async function verifyBatch(idNumbers: string[]): Promise<Map<string, IECVoterDetails>> {
  const results = new Map();
  for (const id of idNumbers) {
    const details = await iecApiService.verifyVoter(id);
    results.set(id, details);
  }
  return results;
}
```

**Migration Action:** ✅ Use existing service, add batch processing wrapper

---

## 2. **WebSocket Service** ⭐ HIGH PRIORITY

**File:** `backend/src/services/websocketService.ts`  
**Status:** ✅ Fully functional, supports bulk upload events  
**Reusability:** 100% - Already has bulk upload methods

**Key Features:**
- Socket.IO server initialized on HTTP server
- Authentication (JWT + service-to-service API key)
- Room-based messaging (user rooms, file rooms)
- Bulk upload specific methods already implemented

**Existing Bulk Upload Methods:**
```typescript
class WebSocketService {
  static sendBulkUploadProgress(file_id: number, data: {
    status: string;
    progress: number;
    rows_processed: number;
    rows_total: number;
    message?: string;
  }): void
  
  static sendBulkUploadComplete(file_id: number, data: {
    rows_success: number;
    rows_failed: number;
    rows_total: number;
    errors?: any[];
  }): void
  
  static sendBulkUploadError(file_id: number, error: string): void
  
  static sendBulkUploadRows(file_id: number, data: {
    rows: any[];
    total_rows: number;
  }): void
}
```

**Usage in Bulk Upload:**
```typescript
import { WebSocketService } from '../services/websocketService';

// Send progress update
WebSocketService.sendBulkUploadProgress(fileId, {
  status: 'validating',
  progress: 20,
  rows_processed: 50,
  rows_total: 214,
  message: 'Validating ID numbers...'
});

// Send completion
WebSocketService.sendBulkUploadComplete(fileId, {
  rows_success: 214,
  rows_failed: 0,
  rows_total: 214
});
```

**Migration Action:** ✅ Use existing service as-is

---

## 3. **Database Connection Pool** ⭐ HIGH PRIORITY

**File:** `backend/src/config/database-hybrid.ts`  
**Status:** ✅ Fully functional, hybrid Prisma + raw SQL  
**Reusability:** 100% - Production-ready

**Key Features:**
- PostgreSQL connection pool (`pg` library)
- Prisma ORM support
- Automatic connection management
- Transaction support
- Query execution helpers

**Interface:**
```typescript
// Get connection from pool
export const getConnection = async (): Promise<PoolClient>

// Execute query with automatic connection management
export const executeQuery = async <T = any>(
  query: string,
  params?: any[]
): Promise<T[]>

// Execute transaction
export const executeTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T>

// Get Prisma client
export const getPrismaClient = (): PrismaClient
```

**Configuration:**
```typescript
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // connection pool size
  idleTimeoutMillis: 300000, // 5 minutes
  connectionTimeoutMillis: 30000 // 30 seconds
};
```

**Usage in Bulk Upload:**
```typescript
import { executeQuery, executeTransaction } from '../config/database-hybrid';

// Query existing members
const existingMembers = await executeQuery<Member>(
  'SELECT id_number, member_id FROM members_consolidated WHERE id_number = ANY($1)',
  [idNumbers]
);

// Transaction for bulk insert/update
await executeTransaction(async (client) => {
  for (const record of records) {
    await client.query(
      'INSERT INTO members_consolidated (...) VALUES (...) ON CONFLICT (id_number) DO UPDATE ...',
      [...]
    );
  }
});
```

**Migration Action:** ✅ Use existing pool, no changes needed

---

## 4. **Voter Verification Service** (Optional)

**File:** `backend/src/services/voterVerificationService.ts`  
**Status:** ✅ Functional, but `iecApiService` is preferred  
**Reusability:** 50% - Overlaps with iecApiService

**Note:** This service has similar functionality to `iecApiService`. We should use `iecApiService` as it's more comprehensive and actively maintained.

**Migration Action:** ⚠️ Skip - Use `iecApiService` instead

---

## 5. **Redis Service** (For Queue)

**File:** `backend/src/services/redisService.ts`  
**Status:** ✅ Functional  
**Reusability:** 100% - For job queue

**Key Features:**
- Redis client wrapper
- Key-value operations
- List operations (for queues)
- Hash operations
- Pub/sub support

**Usage in Bulk Upload:**
```typescript
import { redisService } from '../services/redisService';

// Store job metadata
await redisService.hset(`job:${jobId}`, {
  status: 'processing',
  progress: 20,
  created_at: new Date().toISOString()
});

// Get job status
const job = await redisService.hgetall(`job:${jobId}`);
```

**Migration Action:** ✅ Use for job queue metadata

---

## 🆕 New Services Required

### 1. **ID Validation Service**
**File:** `src/services/bulk-upload/idValidationService.ts`  
**Purpose:** SA ID validation with Luhn algorithm  
**Source:** Port from `upload_validation_utils.py`

### 2. **Pre-Validation Service**
**File:** `src/services/bulk-upload/preValidationService.ts`  
**Purpose:** Duplicates, existing members  
**Source:** Port from `pre_validation_processor.py`

### 3. **File Reader Service**
**File:** `src/services/bulk-upload/fileReaderService.ts`  
**Purpose:** Excel reading, date parsing  
**Source:** POC already has this

### 4. **Database Operations Service**
**File:** `src/services/bulk-upload/databaseOperationsService.ts`  
**Purpose:** Insert/update members  
**Source:** Port from `flexible_membership_ingestionV2.py`

### 5. **Excel Report Service**
**File:** `src/services/bulk-upload/excelReportService.ts`  
**Purpose:** 7-sheet Excel reports  
**Source:** Port from `excel_report_generator.py` + POC

### 6. **Bulk Upload Orchestrator**
**File:** `src/services/bulk-upload/bulkUploadOrchestrator.ts`  
**Purpose:** Coordinate all services  
**Source:** Port from `bulk_upload_processor.py`

### 7. **Processing Queue Service**
**File:** `src/services/bulk-upload/processingQueueService.ts`  
**Purpose:** Job queue with Bull  
**Source:** New implementation

### 8. **Bulk Upload WebSocket Service** (Wrapper)
**File:** `src/services/bulk-upload/bulkUploadWebSocketService.ts`  
**Purpose:** Wrapper around WebSocketService  
**Source:** Thin wrapper

---

## 📊 Integration Summary

| Service | Status | Reusability | Action |
|---------|--------|-------------|--------|
| IEC API Service | ✅ Exists | 100% | Use as-is, add batch wrapper |
| WebSocket Service | ✅ Exists | 100% | Use as-is |
| Database Pool | ✅ Exists | 100% | Use as-is |
| Redis Service | ✅ Exists | 100% | Use for queue |
| ID Validation | ❌ New | 0% | Port from Python |
| Pre-Validation | ❌ New | 0% | Port from Python |
| File Reader | ✅ POC | 80% | Refactor from POC |
| Database Operations | ❌ New | 0% | Port from Python |
| Excel Report | ✅ POC | 80% | Refactor from POC |
| Orchestrator | ❌ New | 0% | Port from Python |
| Queue Service | ❌ New | 0% | New (Bull + Redis) |

**Reuse Rate:** 40% (4/10 services)  
**New Development:** 60% (6/10 services)

---

## 🎯 Key Integration Points

### 1. **API Endpoints**
- Reuse existing Express router pattern
- Add to `backend/src/routes/bulkUploadRoutes.ts`
- Mount at `/api/bulk-upload`

### 2. **Authentication**
- Reuse existing JWT middleware
- Reuse permission checking

### 3. **File Storage**
- Reuse existing file upload directory structure
- Use existing multer configuration

### 4. **Error Handling**
- Reuse existing error handler middleware
- Use existing error types

### 5. **Logging**
- Integrate with existing logging infrastructure
- Use existing log format

---

**Document Version:** 1.0  
**Date:** 2025-11-24  
**Status:** ✅ Complete - Ready for Phase 1.4
