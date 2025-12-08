# Developer Guide: Working with South African Geographic Data

## Quick Reference

### The Golden Rule
**Metro municipalities (JHB, TSH, EKU, CPT, ETH, NMA, BUF, MAN) ARE districts themselves!**

Their sub-regions (JHB001, TSH003, etc.) have `district_code = NULL` in the municipalities table, but members in these sub-regions should have `district_code` set to the parent metro code.

---

## Common Pitfalls

### ❌ WRONG: Simple JOIN that fails for metros
```sql
-- This will leave district_code NULL for metro sub-regions!
UPDATE members_consolidated mc
SET 
    district_code = m.district_code,
    district_name = d.district_name
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
WHERE mc.ward_code = w.ward_code;
```

**Problem**: When `m.district_code` is NULL (metro sub-regions), the member's `district_code` will be set to NULL.

### ✅ CORRECT: Handle metros explicitly
```sql
UPDATE members_consolidated mc
SET 
    district_code = COALESCE(
        m.district_code,  -- Use this for regular municipalities
        CASE              -- Fall back to parent metro for sub-regions
            WHEN m.municipality_code LIKE 'JHB%' THEN 'JHB'
            WHEN m.municipality_code LIKE 'TSH%' THEN 'TSH'
            WHEN m.municipality_code LIKE 'EKU%' THEN 'EKU'
            WHEN m.municipality_code LIKE 'CPT%' THEN 'CPT'
            WHEN m.municipality_code LIKE 'ETH%' THEN 'ETH'
            WHEN m.municipality_code LIKE 'NMA%' THEN 'NMA'
            WHEN m.municipality_code LIKE 'BUF%' THEN 'BUF'
            WHEN m.municipality_code LIKE 'MAN%' THEN 'MAN'
        END
    ),
    district_name = COALESCE(
        d.district_name,
        CASE 
            WHEN m.municipality_code LIKE 'JHB%' THEN 'City of Johannesburg'
            WHEN m.municipality_code LIKE 'TSH%' THEN 'City of Tshwane'
            -- ... etc
        END
    )
FROM wards w
JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
WHERE mc.ward_code = w.ward_code;
```

---

## Metro Municipality Reference

### Quick Lookup Table

| Metro Code | Metro Name | Province | Province Code | Pattern |
|------------|-----------|----------|---------------|---------|
| JHB | City of Johannesburg | Gauteng | GT | JHB% |
| TSH | City of Tshwane | Gauteng | GT | TSH% |
| EKU | Ekurhuleni | Gauteng | GT | EKU% |
| CPT | City of Cape Town | Western Cape | WC | CPT% |
| ETH | eThekwini | KwaZulu-Natal | KZN | ETH% |
| NMA | Nelson Mandela Bay | Eastern Cape | EC | NMA% |
| BUF | Buffalo City | Eastern Cape | EC | BUF% |
| MAN | Mangaung | Free State | FS | MAN% |

### Detection Pattern
```sql
-- Check if a municipality code is a metro sub-region
SELECT 
    municipality_code,
    CASE 
        WHEN municipality_code LIKE 'JHB%' THEN 'Johannesburg Metro'
        WHEN municipality_code LIKE 'TSH%' THEN 'Tshwane Metro'
        WHEN municipality_code LIKE 'EKU%' THEN 'Ekurhuleni Metro'
        WHEN municipality_code LIKE 'CPT%' THEN 'Cape Town Metro'
        WHEN municipality_code LIKE 'ETH%' THEN 'eThekwini Metro'
        WHEN municipality_code LIKE 'NMA%' THEN 'Nelson Mandela Bay Metro'
        WHEN municipality_code LIKE 'BUF%' THEN 'Buffalo City Metro'
        WHEN municipality_code LIKE 'MAN%' THEN 'Mangaung Metro'
        ELSE 'Regular Municipality'
    END as municipality_type
FROM municipalities;
```

---

## Data Validation Queries

### Check for NULL geographic data
```sql
-- Should return 0 after proper data import
SELECT COUNT(*) 
FROM members_consolidated 
WHERE municipality_code IS NULL 
   OR district_code IS NULL 
   OR province_code IS NULL;
```

### Verify metro sub-regions have correct district_code
```sql
-- All metro sub-region members should have parent metro as district_code
SELECT 
    municipality_code,
    district_code,
    COUNT(*) as member_count
FROM members_consolidated
WHERE municipality_code LIKE 'JHB%'
   OR municipality_code LIKE 'TSH%'
   OR municipality_code LIKE 'EKU%'
   OR municipality_code LIKE 'CPT%'
   OR municipality_code LIKE 'ETH%'
   OR municipality_code LIKE 'NMA%'
   OR municipality_code LIKE 'BUF%'
   OR municipality_code LIKE 'MAN%'
GROUP BY municipality_code, district_code
ORDER BY municipality_code;

-- Expected: JHB001 → district_code = 'JHB'
--           JHB005 → district_code = 'JHB'
--           TSH003 → district_code = 'TSH'
--           etc.
```

### Verify regular municipalities have district_code
```sql
-- Regular municipalities should have district_code from municipalities table
SELECT 
    m.municipality_code,
    m.municipality_name,
    m.district_code as muni_district,
    COUNT(mc.member_id) as member_count,
    COUNT(CASE WHEN mc.district_code IS NULL THEN 1 END) as null_district_count
FROM municipalities m
LEFT JOIN members_consolidated mc ON m.municipality_code = mc.municipality_code
WHERE m.district_code IS NOT NULL  -- Regular municipalities only
  AND m.municipality_code NOT IN ('JHB', 'TSH', 'EKU', 'CPT', 'ETH', 'NMA', 'BUF', 'MAN')
GROUP BY m.municipality_code, m.municipality_name, m.district_code
HAVING COUNT(CASE WHEN mc.district_code IS NULL THEN 1 END) > 0;

-- Should return 0 rows (no members with NULL district_code)
```

---

## Python Data Ingestion

### Correct Implementation
```python
def resolve_geographic_hierarchy(ward_code):
    """
    Resolve complete geographic hierarchy from ward code.
    Handles both regular municipalities and metro sub-regions.
    """
    # Get ward → municipality mapping
    ward = wards_df[wards_df['ward_code'] == ward_code]
    if ward.empty:
        return None
    
    municipality_code = ward.iloc[0]['municipality_code']
    
    # Get municipality details
    municipality = municipalities_df[
        municipalities_df['municipality_code'] == municipality_code
    ]
    if municipality.empty:
        return None
    
    municipality_name = municipality.iloc[0]['municipality_name']
    district_code = municipality.iloc[0]['district_code']
    
    # CRITICAL: Handle metro municipalities
    if pd.isna(district_code):
        # This is a metro sub-region - extract parent metro code
        if municipality_code.startswith('JHB'):
            district_code = 'JHB'
            district_name = 'City of Johannesburg'
            province_code = 'GT'
            province_name = 'Gauteng'
        elif municipality_code.startswith('TSH'):
            district_code = 'TSH'
            district_name = 'City of Tshwane'
            province_code = 'GT'
            province_name = 'Gauteng'
        elif municipality_code.startswith('EKU'):
            district_code = 'EKU'
            district_name = 'Ekurhuleni'
            province_code = 'GT'
            province_name = 'Gauteng'
        # ... (handle other metros)
        else:
            # Unknown metro pattern
            return None
    else:
        # Regular municipality - look up district
        district = districts_df[districts_df['district_code'] == district_code]
        if district.empty:
            return None
        
        district_name = district.iloc[0]['district_name']
        province_code = district.iloc[0]['province_code']
        
        # Look up province
        province = provinces_df[provinces_df['province_code'] == province_code]
        if province.empty:
            return None
        
        province_name = province.iloc[0]['province_name']
    
    return {
        'municipality_code': municipality_code,
        'municipality_name': municipality_name,
        'district_code': district_code,
        'district_name': district_name,
        'province_code': province_code,
        'province_name': province_name
    }
```

---

## Testing Checklist

When working with geographic data, always test:

- [ ] Regular municipalities (e.g., GT481 - Mogale City)
- [ ] Metro parent municipalities (e.g., JHB - City of Johannesburg)
- [ ] Metro sub-regions (e.g., JHB005 - Region E)
- [ ] All 8 metro municipalities (JHB, TSH, EKU, CPT, ETH, NMA, BUF, MAN)
- [ ] NULL checks on all geographic fields
- [ ] Frontend navigation through the hierarchy
- [ ] Reports and statistics by province/district/municipality

---

## Related Documentation

- [South African Municipal Hierarchy](./SOUTH_AFRICAN_MUNICIPAL_HIERARCHY.md) - Detailed explanation
- [Municipal Hierarchy Examples](./MUNICIPAL_HIERARCHY_EXAMPLES.md) - Real-world examples
- [Geographic Data Fix Summary](./GEOGRAPHIC_DATA_FIX_SUMMARY.md) - Fix implementation details
- [fix_missing_geographic_data.sql](../test/fix_missing_geographic_data.sql) - SQL fix script

