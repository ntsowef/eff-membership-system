# Ward Audit System - Criteria 2-5 Implementation Plan

## 📋 Overview

This document outlines the implementation of Criteria 2-5 for the Ward Audit System:

- **Criterion 2**: Meeting Quorum Verification
- **Criterion 3**: Meeting Attendance  
- **Criterion 4**: Presiding Officer Information
- **Criterion 5**: Delegate Selection

---

## 🎯 Current Status

### **Criterion 1: Member & Voting District Compliance** ✅
- Already implemented
- Checks: 100+ members AND 50%+ voting districts with 10+ members

### **Criteria 2-5: Not Yet Implemented** ❌
- Meeting records not being tracked
- Attendance data not recorded
- Presiding officer information missing
- Delegate counts showing 0

---

## 📊 Database Schema (Already Created)

### **Tables:**

1. **`ward_meeting_records`** - Stores meeting information
   - `record_id`, `meeting_id`, `ward_code`
   - `meeting_type` (BPA/BGA)
   - `presiding_officer_id`, `secretary_id`
   - `quorum_required`, `quorum_achieved`, `quorum_met`
   - `total_attendees`
   - `meeting_outcome`, `key_decisions`, `action_items`

2. **`ward_delegates`** - Stores delegate assignments
   - `delegate_id`, `ward_code`, `member_id`
   - `assembly_type_id` (SRPA/PPA/NPA)
   - `selection_date`, `selection_method`
   - `delegate_status` (Active/Inactive/Replaced)

3. **`assembly_types`** - Assembly type definitions
   - `assembly_type_id`, `assembly_code`, `assembly_name`
   - `assembly_level` (Sub-Regional/Provincial/National)

---

## 🔧 Implementation Tasks

### **Phase 1: Backend API Endpoints**

#### **A. Meeting Management**

1. **Create Ward Meeting Record**
   - `POST /api/v1/ward-audit/ward/:ward_code/meeting`
   - Body: `{ meeting_type, presiding_officer_id, secretary_id, quorum_required, quorum_achieved, total_attendees, meeting_outcome, key_decisions }`

2. **Get Ward Meeting Records**
   - `GET /api/v1/ward-audit/ward/:ward_code/meetings`
   - Returns: List of all meetings for the ward

3. **Get Latest Ward Meeting**
   - `GET /api/v1/ward-audit/ward/:ward_code/meeting/latest`
   - Returns: Most recent BPA/BGA meeting

4. **Update Meeting Record**
   - `PUT /api/v1/ward-audit/meeting/:record_id`
   - Body: Updated meeting information

#### **B. Delegate Management (Already Partially Implemented)**

5. **Assign Ward Delegate** ✅ (Already exists)
   - `POST /api/v1/ward-audit/ward/:ward_code/delegate`

6. **Get Ward Delegates** ✅ (Already exists)
   - `GET /api/v1/ward-audit/ward/:ward_code/delegates`

7. **Remove/Replace Delegate**
   - `DELETE /api/v1/ward-audit/delegate/:delegate_id`
   - `PUT /api/v1/ward-audit/delegate/:delegate_id/replace`

#### **C. Compliance Verification**

8. **Get Ward Compliance Details** (Enhanced)
   - `GET /api/v1/ward-audit/ward/:ward_code/compliance`
   - Returns: All 5 criteria with detailed status

---

### **Phase 2: Backend Model Methods**

#### **WardAuditModel Methods to Add:**

```typescript
// Meeting Management
static async createMeetingRecord(data: CreateMeetingRecordRequest): Promise<WardMeetingRecord>
static async getWardMeetings(wardCode: string): Promise<WardMeetingRecord[]>
static async getLatestWardMeeting(wardCode: string, meetingType?: string): Promise<WardMeetingRecord | null>
static async updateMeetingRecord(recordId: number, data: UpdateMeetingRecordRequest): Promise<void>

// Delegate Management (enhance existing)
static async removeDelegateAssignment(delegateId: number, reason: string): Promise<void>
static async replaceDelegateAssignment(delegateId: number, newMemberId: number, reason: string): Promise<void>

// Compliance Verification (enhance existing)
static async getWardComplianceDetails(wardCode: string): Promise<WardComplianceDetails>
```

---

### **Phase 3: Frontend Components**

#### **A. Ward Meeting Management Component**

**Location:** `frontend/src/pages/wardAudit/WardMeetingManagement.tsx`

**Features:**
- Form to record new meeting
- List of past meetings
- Edit/update meeting records
- Meeting type selector (BPA/BGA)
- Presiding officer selector (dropdown of ward members)
- Quorum calculator
- Attendance tracker

#### **B. Ward Delegate Management Component**

**Location:** `frontend/src/pages/wardAudit/WardDelegateManagement.tsx`

**Features:**
- Assign delegates for SRPA/PPA/NPA
- View current delegates
- Replace delegates
- Remove delegates
- Delegate status tracking

#### **C. Enhanced Ward Compliance Detail**

**Update:** `frontend/src/pages/wardAudit/WardComplianceDetail.tsx`

**Add:**
- Criterion 2 status card (Meeting Quorum)
- Criterion 3 status card (Meeting Attendance)
- Criterion 4 status card (Presiding Officer)
- Criterion 5 status card (Delegate Selection)
- Action buttons to record meetings/assign delegates

---

## 📝 Implementation Order

### **Step 1: Backend - Meeting Management** (Priority: HIGH)

1. Add model methods for meeting CRUD operations
2. Add API routes for meeting management
3. Add validation schemas
4. Test with Postman/curl

### **Step 2: Backend - Enhanced Compliance Check** (Priority: HIGH)

1. Update `getWardComplianceDetails()` to include all 5 criteria
2. Add logic to check:
   - Criterion 2: Latest meeting has quorum_met = true
   - Criterion 3: Ward has at least 1 meeting recorded
   - Criterion 4: Latest meeting has presiding_officer_id set
   - Criterion 5: Ward has delegates for all 3 assemblies

### **Step 3: Frontend - Meeting Management UI** (Priority: MEDIUM)

1. Create WardMeetingManagement component
2. Add forms for recording meetings
3. Add meeting list view
4. Integrate with Ward Compliance Detail page

### **Step 4: Frontend - Delegate Management UI** (Priority: MEDIUM)

1. Create WardDelegateManagement component
2. Add delegate assignment forms
3. Add delegate list view
4. Integrate with Ward Compliance Detail page

### **Step 5: Frontend - Enhanced Compliance Display** (Priority: HIGH)

1. Update WardComplianceDetail to show all 5 criteria
2. Add status indicators for each criterion
3. Add action buttons to record data
4. Add navigation to meeting/delegate management

---

## 🎨 UI Mockup - Enhanced Compliance Detail

```
┌─────────────────────────────────────────────────────────────┐
│ Ward Compliance Detail - Ward 79900082                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Criterion 1: Member & Voting District Compliance         │
│    • 150 members (threshold: 100)                           │
│    • 8/10 voting districts compliant (80%)                  │
│                                                              │
│ ✅ Criterion 2: Meeting Quorum Verification                 │
│    • Last BPA meeting: 2024-09-15                           │
│    • Quorum: 75/50 (Met ✓)                                  │
│    [View Meetings] [Record New Meeting]                     │
│                                                              │
│ ✅ Criterion 3: Meeting Attendance                          │
│    • 3 meetings recorded in last 6 months                   │
│    • Attendance rate: 85%                                   │
│                                                              │
│ ✅ Criterion 4: Presiding Officer Information               │
│    • Presiding Officer: John Doe (Member #12345)            │
│    • Recorded on: 2024-09-15                                │
│                                                              │
│ ⚠️  Criterion 5: Delegate Selection                         │
│    • SRPA: 2 delegates ✓                                    │
│    • PPA: 1 delegate ✓                                      │
│    • NPA: 0 delegates ✗                                     │
│    [Manage Delegates]                                       │
│                                                              │
│ Overall Status: 4/5 Criteria Met (80%)                      │
│ [Approve Ward Compliance]                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Implement Backend Meeting Management** (This session)
2. **Implement Backend Enhanced Compliance Check** (This session)
3. **Test Backend APIs** (This session)
4. **Implement Frontend Components** (Next session)
5. **Integration Testing** (Next session)

---

**Status:** Ready to implement Phase 1 & 2 (Backend)

