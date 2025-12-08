# South African Municipal Hierarchy - Examples

This document provides concrete examples of how the municipal hierarchy works in South Africa, with real data from the EFF Membership System.

## Example 1: Regular Municipality (West Rand District)

### Hierarchy Structure
```
South Africa (National)
  └── Gauteng Province (GT)
      └── West Rand District (DC48)
          ├── Mogale City Municipality (GT481)
          │   ├── Ward 74801001
          │   ├── Ward 74801002
          │   └── ... (more wards)
          ├── Merafong City Municipality (GT484)
          │   ├── Ward 74804001
          │   └── ... (more wards)
          └── Rand West City Municipality (GT485)
              ├── Ward 74805001
              └── ... (more wards)
```

### Database Representation

**municipalities table:**
```
municipality_code | municipality_name           | district_code
------------------|----------------------------|---------------
GT481            | Mogale City Sub-Region      | DC48
GT484            | Merafong City Sub-Region    | DC48
GT485            | Rand West City Sub-Region   | DC48
```

**districts table:**
```
district_code | district_name | province_code
--------------|---------------|---------------
DC48          | West Rand     | GT
```

**members_consolidated (sample member in Mogale City):**
```
member_id: 12345
ward_code: 74801005
municipality_code: GT481
municipality_name: Mogale City Sub-Region
district_code: DC48
district_name: West Rand
province_code: GT
province_name: Gauteng
```

### Member Counts
- **West Rand District (DC48)**: 26,106 members
  - Mogale City (GT481): 9,878 members
  - Merafong City (GT484): 7,095 members
  - Rand West City (GT485): 9,133 members

---

## Example 2: Metro Municipality (City of Johannesburg)

### Hierarchy Structure
```
South Africa (National)
  └── Gauteng Province (GT)
      └── City of Johannesburg Metro (JHB) ← This IS the district!
          ├── JHB - Region A (JHB001)
          │   ├── Ward 79800001
          │   ├── Ward 79800002
          │   └── ... (more wards)
          ├── JHB - Region B (JHB002)
          │   ├── Ward 79800020
          │   └── ... (more wards)
          ├── JHB - Region C (JHB003)
          ├── JHB - Region D (JHB004)
          ├── JHB - Region E (JHB005)
          ├── JHB - Region F (JHB006)
          └── JHB - Region G (JHB007)
```

### Database Representation

**municipalities table:**
```
municipality_code | municipality_name                        | district_code
------------------|------------------------------------------|---------------
JHB              | City of Johannesburg Metropolitan Muni   | JHB
JHB001           | JHB - Region A                           | NULL ← Important!
JHB002           | JHB - Region B                           | NULL
JHB003           | JHB - Region C                           | NULL
JHB004           | JHB - Region D                           | NULL
JHB005           | JHB - Region E                           | NULL
JHB006           | JHB - Region F                           | NULL
JHB007           | JHB - Region G                           | NULL
```

**districts table:**
```
district_code | district_name              | province_code
--------------|----------------------------|---------------
JHB           | City of Johannesburg       | GT
```

**members_consolidated (sample member in JHB Region E):**
```
member_id: 67890
ward_code: 79800107
municipality_code: JHB005
municipality_name: JHB - Region E
district_code: JHB          ← Parent metro code
district_name: City of Johannesburg
province_code: GT
province_name: Gauteng
```

### Key Differences from Regular Municipalities

1. **Parent Metro (JHB)**:
   - `district_code` = 'JHB' (references itself)
   - Functions as BOTH a municipality AND a district

2. **Sub-Regions (JHB001-JHB007)**:
   - `district_code` = NULL in municipalities table
   - Members in these sub-regions have `district_code` = 'JHB' (parent metro)

---

## Example 3: All 8 Metro Municipalities

### Gauteng Province (3 Metros)

#### 1. City of Johannesburg (JHB)
```
JHB (Metro/District)
  ├── JHB001 (Region A)
  ├── JHB002 (Region B)
  ├── JHB003 (Region C)
  ├── JHB004 (Region D)
  ├── JHB005 (Region E)
  ├── JHB006 (Region F)
  └── JHB007 (Region G)
```

#### 2. City of Tshwane (TSH)
```
TSH (Metro/District)
  ├── TSH001 (Region 1)
  ├── TSH002 (Region 2)
  ├── TSH003 (Region 3)
  ├── TSH004 (Region 4)
  └── TSH005 (Region 5)
```

#### 3. Ekurhuleni (EKU)
```
EKU (Metro/District)
  ├── EKU001 (Central)
  ├── EKU002 (East)
  ├── EKU003 (Far East)
  ├── EKU004 (North)
  └── EKU005 (South)
```

### Western Cape Province (1 Metro)

#### 4. City of Cape Town (CPT)
```
CPT (Metro/District)
  ├── CPT001 (Zone 1)
  ├── CPT002 (Zone 10)
  ├── CPT003 (Zone 2)
  ├── CPT004 (Zone 3)
  ├── CPT005 (Zone 4)
  ├── CPT006 (Zone 5)
  ├── CPT007 (Zone 6)
  ├── CPT008 (Zone 7)
  ├── CPT009 (Zone 8)
  └── CPT010 (Zone 9)
```

### KwaZulu-Natal Province (1 Metro)

#### 5. eThekwini (ETH)
```
ETH (Metro/District)
  ├── ETH001 (Central)
  ├── ETH002 (Far North)
  ├── ETH003 (Far South)
  ├── ETH004 (Inner West)
  ├── ETH005 (North Central)
  ├── ETH006 (North West)
  ├── ETH007 (Outer West)
  ├── ETH008 (South)
  ├── ETH009 (South Central)
  └── ETH010 (South West)
```

### Eastern Cape Province (2 Metros)

#### 6. Nelson Mandela Bay (NMA)
```
NMA (Metro/District)
  ├── NMA001 (Port Elizabeth)
  ├── NMA002 (Uitenhage)
  └── ... (more sub-regions)
```

#### 7. Buffalo City (BUF)
```
BUF (Metro/District)
  ├── BUF001 (East London)
  ├── BUF002 (King Williams Town)
  ├── BUF003 (Mdantsane)
  └── BUF004 (Duncan Village)
```

### Free State Province (1 Metro)

#### 8. Mangaung (MAN)
```
MAN (Metro/District)
  ├── MAN001 (Bloemfontein)
  └── ... (more sub-regions)
```

---

## Comparison Table

| Aspect | Regular Municipality | Metro Municipality |
|--------|---------------------|-------------------|
| **Category** | Category B | Category A |
| **Belongs to District?** | Yes | No - IS the district |
| **district_code in municipalities table** | Populated (e.g., 'DC48') | NULL for sub-regions |
| **Sub-divisions** | Wards only | Sub-regions, then wards |
| **Example** | Mogale City (GT481) | City of Johannesburg (JHB) |
| **Member district_code** | District code (e.g., 'DC48') | Parent metro code (e.g., 'JHB') |

---

## Frontend Navigation Examples

### Regular Municipality Navigation
```
1. Select Province: Gauteng (GT)
   → Shows districts including "West Rand (DC48)"

2. Select District: West Rand (DC48)
   → Shows municipalities:
      - Mogale City (GT481) - 9,878 members
      - Merafong City (GT484) - 7,095 members
      - Rand West City (GT485) - 9,133 members

3. Select Municipality: Mogale City (GT481)
   → Shows wards and member list (9,878 members)
```

### Metro Municipality Navigation
```
1. Select Province: Gauteng (GT)
   → Shows districts including "City of Johannesburg (JHB)"

2. Select District: City of Johannesburg (JHB)
   → Shows sub-regions:
      - JHB - Region A (JHB001)
      - JHB - Region B (JHB002)
      - JHB - Region E (JHB005)
      - ... (more regions)

3. Select Sub-Region: JHB - Region E (JHB005)
   → Shows wards and member list
```

---

## SQL Query Examples

### Get all members in West Rand District
```sql
SELECT COUNT(*) 
FROM members_consolidated 
WHERE district_code = 'DC48';
-- Result: 26,106 members
```

### Get all members in City of Johannesburg Metro
```sql
SELECT COUNT(*) 
FROM members_consolidated 
WHERE district_code = 'JHB';
-- Result: Thousands of members across all JHB sub-regions
```

### Get members by Johannesburg sub-region
```sql
SELECT municipality_code, municipality_name, COUNT(*) as member_count
FROM members_consolidated 
WHERE district_code = 'JHB'
GROUP BY municipality_code, municipality_name
ORDER BY municipality_code;
-- Result: Breakdown by JHB001, JHB002, JHB003, etc.
```

