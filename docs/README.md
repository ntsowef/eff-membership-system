# EFF Membership System - Documentation

This directory contains comprehensive documentation for the EFF Membership System, with a focus on understanding and working with South African geographic data.

## 📚 Documentation Index

### Geographic Data & Municipal Hierarchy

#### 1. [South African Municipal Hierarchy](./SOUTH_AFRICAN_MUNICIPAL_HIERARCHY.md)
**Purpose**: Comprehensive explanation of South Africa's municipal structure  
**Topics Covered**:
- Two types of municipalities (Category A Metro vs Category B Regular)
- The 8 metro municipalities and their characteristics
- Database structure and table relationships
- Why metro sub-regions have NULL district_code
- The geographic data problem and solution

**Read this first** if you're new to South African municipal structures.

#### 2. [Municipal Hierarchy Examples](./MUNICIPAL_HIERARCHY_EXAMPLES.md)
**Purpose**: Real-world examples with actual data from the system  
**Topics Covered**:
- West Rand District (regular municipality example)
- City of Johannesburg (metro municipality example)
- All 8 metro municipalities with their sub-regions
- Comparison table: Regular vs Metro municipalities
- Frontend navigation examples
- SQL query examples

**Read this** for concrete examples and practical understanding.

#### 3. [Developer Guide: Geographic Data](./DEVELOPER_GUIDE_GEOGRAPHIC_DATA.md)
**Purpose**: Quick reference for developers working with geographic data  
**Topics Covered**:
- Common pitfalls and how to avoid them
- Correct SQL patterns for handling metros
- Metro municipality quick reference table
- Data validation queries
- Python implementation examples
- Testing checklist

**Read this** when implementing features that use geographic data.

#### 4. [Geographic Data Fix Summary](./GEOGRAPHIC_DATA_FIX_SUMMARY.md)
**Purpose**: Detailed report of the geographic data fix implementation  
**Topics Covered**:
- Problem statement and root cause analysis
- Three-phase fix implementation
- Results and verification
- Files modified
- Lessons learned and recommendations

**Read this** to understand the fix that was applied and why.

---

## 🎯 Quick Start Guide

### For New Developers

1. **Start here**: [South African Municipal Hierarchy](./SOUTH_AFRICAN_MUNICIPAL_HIERARCHY.md)
   - Understand the two types of municipalities
   - Learn why metros are special

2. **Then read**: [Municipal Hierarchy Examples](./MUNICIPAL_HIERARCHY_EXAMPLES.md)
   - See real examples with actual data
   - Understand the database structure

3. **Keep handy**: [Developer Guide](./DEVELOPER_GUIDE_GEOGRAPHIC_DATA.md)
   - Reference when writing code
   - Use the validation queries

### For Data Engineers

1. **Read**: [Geographic Data Fix Summary](./GEOGRAPHIC_DATA_FIX_SUMMARY.md)
   - Understand the data quality issue
   - Learn the fix implementation

2. **Reference**: [Developer Guide](./DEVELOPER_GUIDE_GEOGRAPHIC_DATA.md)
   - Use validation queries
   - Implement correct data ingestion patterns

3. **Study**: SQL script at `../test/fix_missing_geographic_data.sql`
   - See the complete fix implementation
   - Understand the three-step approach

---

## 🔑 Key Concepts

### The Golden Rule
**Metro municipalities (JHB, TSH, EKU, CPT, ETH, NMA, BUF, MAN) ARE districts themselves!**

### Critical Understanding
- **Regular municipalities** have `district_code` in the municipalities table
- **Metro sub-regions** have `district_code = NULL` in the municipalities table
- **Members in metro sub-regions** should have `district_code` set to the parent metro code

### The 8 Metro Municipalities
1. **JHB** - City of Johannesburg (Gauteng)
2. **TSH** - City of Tshwane (Gauteng)
3. **EKU** - Ekurhuleni (Gauteng)
4. **CPT** - City of Cape Town (Western Cape)
5. **ETH** - eThekwini (KwaZulu-Natal)
6. **NMA** - Nelson Mandela Bay (Eastern Cape)
7. **BUF** - Buffalo City (Eastern Cape)
8. **MAN** - Mangaung (Free State)

---

## 📊 Database Tables

### Key Tables for Geographic Data

```
provinces
  ├── province_id (PK)
  ├── province_code (e.g., 'GT', 'WC', 'KZN')
  └── province_name (e.g., 'Gauteng', 'Western Cape')

districts
  ├── district_id (PK)
  ├── district_code (e.g., 'DC48', 'JHB', 'TSH')
  ├── district_name (e.g., 'West Rand', 'City of Johannesburg')
  └── province_code (FK → provinces)

municipalities
  ├── municipality_id (PK)
  ├── municipality_code (e.g., 'GT481', 'JHB005')
  ├── municipality_name
  └── district_code (FK → districts) ← NULL for metro sub-regions!

wards
  ├── ward_id (PK)
  ├── ward_code (e.g., '74801005', '79800107')
  ├── ward_name
  └── municipality_code (FK → municipalities)

members_consolidated
  ├── member_id (PK)
  ├── ward_code (FK → wards)
  ├── municipality_code
  ├── municipality_name
  ├── district_code
  ├── district_name
  ├── province_code
  └── province_name
```

---

## 🛠️ Related Scripts

### Test Scripts (in `../test/` directory)

1. **fix_missing_geographic_data.sql** - Comprehensive SQL fix with documentation
2. **fix_geographic_data_batched.js** - Batched UPDATE for regular municipalities
3. **fix_metro_municipalities.js** - Metro municipality sub-region fix
4. **fix_remaining_geographic_data.js** - Final cleanup script
5. **verify_west_rand_fix.js** - Verification script
6. **investigate_remaining_nulls.js** - Diagnostic script
7. **check_municipality_structure.js** - Municipality structure analysis

---

## 📝 Common Queries

### Check for NULL geographic data
```sql
SELECT COUNT(*) 
FROM members_consolidated 
WHERE municipality_code IS NULL 
   OR district_code IS NULL 
   OR province_code IS NULL;
```

### Get members by district
```sql
-- Regular district
SELECT COUNT(*) FROM members_consolidated WHERE district_code = 'DC48';

-- Metro district
SELECT COUNT(*) FROM members_consolidated WHERE district_code = 'JHB';
```

### Verify metro sub-regions
```sql
SELECT municipality_code, district_code, COUNT(*) 
FROM members_consolidated 
WHERE municipality_code LIKE 'JHB%'
GROUP BY municipality_code, district_code;
```

---

## 🤝 Contributing

When adding new documentation:
1. Follow the existing structure and format
2. Include real examples with actual data
3. Add SQL queries that can be tested
4. Update this README with links to new documents

---

## 📞 Support

For questions about:
- **Municipal hierarchy**: See [SOUTH_AFRICAN_MUNICIPAL_HIERARCHY.md](./SOUTH_AFRICAN_MUNICIPAL_HIERARCHY.md)
- **Implementation**: See [DEVELOPER_GUIDE_GEOGRAPHIC_DATA.md](./DEVELOPER_GUIDE_GEOGRAPHIC_DATA.md)
- **Data issues**: See [GEOGRAPHIC_DATA_FIX_SUMMARY.md](./GEOGRAPHIC_DATA_FIX_SUMMARY.md)

---

## 📅 Last Updated

**Date**: 2025-11-18  
**Version**: 1.0  
**Status**: Complete and verified with production data

