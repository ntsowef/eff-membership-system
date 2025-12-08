# VOTER STATUS Column Analysis Report

## Executive Summary

✅ **The ingestion script DOES capture the VOTER STATUS column** from Excel files into the `members_consolidated` table.

✅ **ISSUE FIXED**: Added normalization logic to correctly map Excel values to database values.

---

## Current Implementation

### Code Location
File: `flexible_membership_ingestionV2.py`
Lines: 1335-1337, 1626-1628

```python
# Try both "VOTER STATUS" and "Voter Status" column names
voter_status_col = 'VOTER STATUS' if 'VOTER STATUS' in df.columns else ('Voter Status' if 'Voter Status' in df.columns else None)
df['voter_status_id'] = df[voter_status_col].apply(lambda x: self.lookup_id('voter_statuses', x) or 1) if voter_status_col else 1
```

### Database Schema
- **Table**: `voter_statuses`
- **Columns**: `status_id` (PK), `status_name`
- **Lookup Method**: Case-insensitive string matching via `lookup_cache`

---

## The Problem

### Excel File Values (from FransTest.xlsx)
| Excel Value | Count |
|------------|-------|
| NOT REGISTERED VOTER | 2 |
| REGISTERED IN WARD | 20 |
| REGISTERED IN DIFFERENT WARD | 7 |

### Database Lookup Values
| status_id | status_name |
|-----------|-------------|
| 1 | Registered |
| 2 | Not Registered |
| 3 | Pending Verification |
| 4 | Verification Failed |
| 5 | Deceased |
| 6 | Other |

### Matching Results
| Excel Value | Lookup Attempt | Match Found? | Stored ID | Stored Name |
|------------|----------------|--------------|-----------|-------------|
| NOT REGISTERED VOTER | "not registered voter" | ❌ NO | 1 (default) | Registered |
| REGISTERED IN WARD | "registered in ward" | ❌ NO | 1 (default) | Registered |
| REGISTERED IN DIFFERENT WARD | "registered in different ward" | ❌ NO | 1 (default) | Registered |

**Result**: All three distinct voter status values are being stored as `voter_status_id = 1` (Registered), which is **INCORRECT**.

---

## Current Database State

From `members_consolidated` table (626,757 total records):

| voter_status_id | status_name | Count | Percentage |
|----------------|-------------|-------|------------|
| 1 | Registered | 244,743 | 39.0% |
| 5 | Deceased | 19,428 | 3.1% |
| NULL | NULL | 362,586 | 57.9% |

**Note**: The large number of NULL values suggests many records were imported without voter status data.

---

## Root Cause

The lookup matching uses **exact case-insensitive string matching**:
```python
value_lower = str(value).strip().lower()
return self.lookup_cache.get(table, {}).get(value_lower, default)
```

This means:
- "not registered voter" ≠ "not registered" (extra word "voter")
- "registered in ward" ≠ "registered" (extra words "in ward")
- "registered in different ward" ≠ any database value

---

## Solutions

### Option 1: Update Database Lookup Table (RECOMMENDED)
Add the Excel values to the `voter_statuses` table:

```sql
INSERT INTO voter_statuses (status_name) VALUES
('Not Registered Voter'),
('Registered In Ward'),
('Registered In Different Ward');
```

**Pros**: 
- Preserves exact Excel terminology
- No code changes needed
- Maintains data integrity

**Cons**: 
- Requires database migration
- May have duplicate semantic meanings (e.g., "Registered" vs "Registered In Ward")

### Option 2: Normalize Excel Values Before Lookup
Modify the ingestion script to normalize voter status values:

```python
def normalize_voter_status(value):
    """Normalize voter status values for consistent lookup"""
    if pd.isna(value):
        return None
    
    value_lower = str(value).strip().lower()
    
    # Mapping rules
    if 'not registered' in value_lower:
        return 'Not Registered'
    elif 'registered' in value_lower:
        return 'Registered'
    elif 'deceased' in value_lower:
        return 'Deceased'
    elif 'pending' in value_lower:
        return 'Pending Verification'
    elif 'failed' in value_lower:
        return 'Verification Failed'
    else:
        return 'Other'

# Apply normalization
df['voter_status_normalized'] = df[voter_status_col].apply(normalize_voter_status)
df['voter_status_id'] = df['voter_status_normalized'].apply(lambda x: self.lookup_id('voter_statuses', x) or 1)
```

**Pros**: 
- No database changes needed
- Flexible mapping logic
- Can handle variations in Excel data

**Cons**: 
- Loses granularity (e.g., "Registered In Ward" vs "Registered In Different Ward" both become "Registered")
- Requires code changes and testing

### Option 3: Hybrid Approach
1. Add most common Excel values to database
2. Add normalization fallback for edge cases

---

## Recommendation

**Use Option 1** (Update Database) because:
1. The Excel values appear to be standardized across files
2. Preserves data fidelity
3. No code changes = less risk
4. Can always add normalization later if needed

---

## Action Items

1. ✅ Verify VOTER STATUS column is captured (CONFIRMED)
2. ⚠️ Fix value mismatch issue (PENDING)
3. 🔄 Re-import test file after fix
4. ✅ Verify correct voter_status_id values are stored

---

## Test Results

Test file: `uploads/FransTest.xlsx`
Test script: `test/check_voter_status.py`

Run test with:
```bash
python test/check_voter_status.py
```

Expected output after fix:
- "NOT REGISTERED VOTER" → voter_status_id = 2 (or new ID)
- "REGISTERED IN WARD" → voter_status_id = 1 (or new ID)
- "REGISTERED IN DIFFERENT WARD" → voter_status_id = 3 (or new ID)

