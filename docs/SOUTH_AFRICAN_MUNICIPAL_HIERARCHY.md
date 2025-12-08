# South African Municipal Hierarchy

## Overview

This document explains the hierarchical structure of South African municipalities and how they are represented in the EFF Membership System database.

## Geographic Hierarchy

South Africa's administrative geographic structure follows this hierarchy:

```
National
  └── Province (9 provinces)
      └── District / Metro Municipality
          └── Municipality / Sub-Region
              └── Ward
                  └── Voting District (VD)
```

## Two Types of Municipalities

South Africa has **two distinct types of municipalities** as defined by the Municipal Structures Act:

### 1. Category A: Metropolitan Municipalities (Metros)

**Key Characteristics:**
- These municipalities **ARE districts themselves**
- They have exclusive municipal executive and legislative authority in their areas
- They do not belong to a district - they function as both district and municipality
- They create **sub-regions** for administrative purposes

**The 8 Metro Municipalities:**

| Code | Name | Province | Province Code |
|------|------|----------|---------------|
| JHB | City of Johannesburg | Gauteng | GT / GP |
| TSH | City of Tshwane (Pretoria) | Gauteng | GT / GP |
| EKU | Ekurhuleni (East Rand) | Gauteng | GT / GP |
| CPT | City of Cape Town | Western Cape | WC |
| ETH | eThekwini (Durban) | KwaZulu-Natal | KZN |
| NMA | Nelson Mandela Bay (Port Elizabeth) | Eastern Cape | EC |
| BUF | Buffalo City (East London) | Eastern Cape | EC |
| MAN | Mangaung (Bloemfontein) | Free State | FS |

**Metro Sub-Regions:**
- Metros create sub-regions for administrative purposes
- Sub-region codes follow the pattern: `{METRO_CODE}{NUMBER}`
- Examples:
  - `JHB001`, `JHB002`, `JHB003`, `JHB004`, `JHB005`, `JHB006`, `JHB007` (Johannesburg sub-regions)
  - `TSH001`, `TSH002`, `TSH003`, `TSH004`, `TSH005` (Tshwane sub-regions)
  - `EKU001`, `EKU002`, `EKU003`, `EKU004`, `EKU005` (Ekurhuleni sub-regions)
  - `CPT001` through `CPT010` (Cape Town zones)
  - `ETH001` through `ETH010` (eThekwini regions)

### 2. Category B: Local Municipalities (Regular Municipalities)

**Key Characteristics:**
- These municipalities **belong to a district** (Category C)
- They share municipal executive and legislative authority with the district
- They have a `district_code` that references their parent district

**Examples:**
- Mogale City (`GT481`) belongs to West Rand District (`DC48`)
- Maluti-a-Phofung (`FS194`) belongs to Thabo Mofutsanyane District (`DC19`)
- Emfuleni (`GT421`) belongs to Sedibeng District (`DC42`)

## Database Structure

### municipalities Table

```sql
CREATE TABLE municipalities (
    municipality_id SERIAL PRIMARY KEY,
    municipality_code VARCHAR(10) UNIQUE NOT NULL,
    municipality_name VARCHAR(255) NOT NULL,
    district_code VARCHAR(10),  -- NULL for metro sub-regions!
    ...
);
```

**Important Notes:**
1. **Parent metros** (JHB, TSH, EKU, etc.): `district_code` = their own code (e.g., JHB's district_code = 'JHB')
2. **Metro sub-regions** (JHB001, TSH003, etc.): `district_code` = **NULL** (because parent metro IS the district)
3. **Regular municipalities** (GT481, FS194, etc.): `district_code` = their parent district code (e.g., 'DC48', 'DC19')

### members_consolidated Table

```sql
CREATE TABLE members_consolidated (
    member_id SERIAL PRIMARY KEY,
    ward_code VARCHAR(20),
    municipality_code VARCHAR(10),
    municipality_name VARCHAR(255),
    district_code VARCHAR(10),
    district_name VARCHAR(255),
    province_code VARCHAR(5),
    province_name VARCHAR(100),
    ...
);
```

**For Metro Sub-Region Members:**
- `municipality_code`: Sub-region code (e.g., 'JHB005')
- `municipality_name`: Sub-region name (e.g., 'JHB - Region E')
- `district_code`: Parent metro code (e.g., 'JHB')
- `district_name`: Metro name (e.g., 'City of Johannesburg')
- `province_code`: Province code (e.g., 'GT')
- `province_name`: Province name (e.g., 'Gauteng')

**For Regular Municipality Members:**
- `municipality_code`: Municipality code (e.g., 'GT481')
- `municipality_name`: Municipality name (e.g., 'Mogale City Sub-Region')
- `district_code`: District code (e.g., 'DC48')
- `district_name`: District name (e.g., 'West Rand')
- `province_code`: Province code (e.g., 'GT')
- `province_name`: Province name (e.g., 'Gauteng')

## The Geographic Data Problem

### Root Cause

When members were imported, the geographic resolution logic failed to handle metro municipalities correctly:

1. **Regular municipalities**: The JOIN to the districts table worked correctly
2. **Metro sub-regions**: The JOIN failed because `district_code` is NULL in the municipalities table
3. **Result**: ~436,700 members had NULL `district_code` and/or `province_code`

### NULL Patterns Observed

| Pattern | Count | Description |
|---------|-------|-------------|
| Only District NULL | 213,161 | Metro sub-regions needing parent metro code |
| District & Province NULL | 155,429 | Metro sub-regions missing both |
| Muni & District NULL | 68,108 | Members needing complete geographic data |

## The Solution

The fix uses a three-step approach (see `test/fix_missing_geographic_data.sql`):

### Step 1: Fix Regular Municipalities
```sql
UPDATE members_consolidated mc
SET ... 
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
WHERE m.district_code IS NOT NULL  -- Only regular municipalities
```

### Step 2: Fix Metro Sub-Regions
```sql
UPDATE members_consolidated mc
SET 
    district_code = CASE 
        WHEN m.municipality_code LIKE 'JHB%' THEN 'JHB'
        WHEN m.municipality_code LIKE 'TSH%' THEN 'TSH'
        ...
    END,
    district_name = CASE 
        WHEN m.municipality_code LIKE 'JHB%' THEN 'City of Johannesburg'
        ...
    END
```

### Step 3: Final Cleanup
Uses COALESCE to handle both regular and metro municipalities in one query.

## Verification Examples

### West Rand District (Regular District)
```sql
SELECT district_code, COUNT(*) 
FROM members_consolidated 
WHERE district_code = 'DC48';
-- Expected: ~26,106 members
```

### City of Johannesburg (Metro)
```sql
SELECT district_code, COUNT(*) 
FROM members_consolidated 
WHERE district_code = 'JHB';
-- Expected: Thousands of members across JHB001-JHB007
```

## References

- Municipal Structures Act, 1998 (Act No. 117 of 1998)
- Municipal Demarcation Board: https://www.demarcation.org.za/
- Statistics South Africa: https://www.statssa.gov.za/

