# JHB Municipality Structure

## Main Municipality

**Municipality Code**: `JHB`  
**Municipality ID**: `318`  
**Municipality Name**: `City of Johannesburg Metropolitan Municipality`  
**Municipality Type**: `Metropolitan`  
**District Code**: `JHB`  
**Parent Municipality**: `None` (This is the top-level metro)

---

## Structure

`JHB` is a **METROPOLITAN MUNICIPALITY** - one of South Africa's 8 metropolitan municipalities.

### Hierarchical Structure

```
JHB (Metropolitan Municipality)
├── JHB001 - JHB - A (Metro Local Municipality)
├── JHB002 - JHB - B (Metro Local Municipality)
├── JHB003 - JHB - C (Metro Local Municipality)
├── JHB004 - JHB - D (Metro Local Municipality)
├── JHB005 - JHB - E (Metro Local Municipality)
├── JHB006 - JHB - F (Metro Local Municipality)
└── JHB007 - JHB - G (Metro Local Municipality)
```

---

## Local Municipalitys

The City of Johannesburg Metropolitan Municipality has **7 Local Municipalitys**:

| Code | Name | Type |
|------|------|------|
| JHB001 | JHB - A | Metro Local Municipality |
| JHB002 | JHB - B | Metro Local Municipality |
| JHB003 | JHB - C | Metro Local Municipality |
| JHB004 | JHB - D | Metro Local Municipality |
| JHB005 | JHB - E | Metro Local Municipality |
| JHB006 | JHB - F | Metro Local Municipality |
| JHB007 | JHB - G | Metro Local Municipality |

---

## Key Points

1. **JHB is BOTH a District AND a Municipality**
   - `district_code = 'JHB'`
   - `municipality_code = 'JHB'`
   - This is typical for metropolitan municipalities in South Africa

2. **JHB has Local Municipalitys**
   - The main metro (JHB) is divided into 7 administrative Local Municipalitys
   - Each Local Municipality has its own municipality code (JHB001-JHB007)
   - Local Municipalitys have `parent_municipality_id = 318` (pointing to JHB)

3. **Geographic Hierarchy**
   ```
   Province (GP - Gauteng)
   └── District (JHB - City of Johannesburg)
       └── Municipality (JHB - City of Johannesburg Metropolitan Municipality)
           └── Local Municipalitys (JHB001-JHB007)
               └── Wards (e.g., 79800135)
                   └── Voting Districts (e.g., 32871326)
   ```

---

## IEC Mapping Context

When the IEC API returns:
- `municipality_id: 3003`
- `municipality: "JHB - City of Johannesburg"`

This maps to:
- `municipality_code: "JHB"` (the main metropolitan municipality)
- `district_code: "JHB"` (same as municipality for metros)

The Local Municipalitys (JHB001-JHB007) are used for internal administrative purposes and ward organization, but the IEC typically references the main metro municipality (JHB).

---

## Database Schema

```sql
CREATE TABLE municipalities (
  municipality_id           INT PRIMARY KEY,
  municipality_code         VARCHAR(20) UNIQUE,
  municipality_name         VARCHAR(150),
  district_code             VARCHAR(20),
  municipality_type         VARCHAR(20) DEFAULT 'Local',
  parent_municipality_id    INT,
  ...
  FOREIGN KEY (parent_municipality_id) REFERENCES municipalities(municipality_id)
);
```

**JHB Record**:
- `municipality_id = 318`
- `municipality_code = 'JHB'`
- `municipality_type = 'Metropolitan'`
- `parent_municipality_id = NULL` (top-level)

**Local Municipality Records** (e.g., JHB001):
- `municipality_code = 'JHB001'`
- `municipality_type = 'Metro Local Municipality'`
- `parent_municipality_id = 318` (points to JHB)

