# Dashboard Filtering Reference Guide

## Overview
This document provides a quick reference for how dashboard filtering works across different admin levels in the EFF Membership Management System.

## Admin Levels and Their Data Access

### 1. National Admin
- **Access Level**: All data across all provinces, municipalities, and wards
- **Dashboard Shows**:
  - National-level statistics (all members)
  - Province breakdown with charts (all provinces)
  - Top performing areas across the country
- **Filtering**: No geographic filtering applied
- **Breakdown Sections**: Province Breakdown (with gauge/bar/list views)

### 2. Province Admin
- **Access Level**: Data only from assigned province
- **Dashboard Shows**:
  - Province-level statistics (province members only)
  - Sub-regional breakdown (municipalities within province)
  - Top performing areas within province
- **Filtering**: Automatically filtered by `province_code`
- **Breakdown Sections**: Sub-Regional Breakdown (municipalities, list view)
- **Exclusions**: Metro Municipalities excluded from sub-regional breakdown

### 3. Municipality Admin
- **Access Level**: Data only from assigned municipality
- **Dashboard Shows**:
  - Municipality-level statistics (municipality members only)
  - Ward breakdown (wards within municipality)
  - Top performing wards within municipality
- **Filtering**: Automatically filtered by `municipality_code`
- **Breakdown Sections**: Ward Breakdown (wards, list view)
- **Exclusions**: None (all wards shown)

### 4. Ward Admin
- **Access Level**: Data only from assigned ward
- **Dashboard Shows**:
  - Ward-level statistics (ward members only)
  - Member list within ward
- **Filtering**: Automatically filtered by `ward_code`
- **Breakdown Sections**: None (lowest level)

## Technical Implementation

### Backend Filtering

#### Middleware: `applyGeographicFilter`
Location: `backend/src/middleware/auth.ts`

Automatically adds geographic context to requests based on user's admin level:
```typescript
// For Province Admin
(req as any).provinceContext = {
  province_code: 'GP',
  district_code: null,
  municipal_code: null,
  ward_code: null
};

// For Municipality Admin
(req as any).municipalityContext = {
  province_code: 'GP',
  district_code: 'DC1',
  municipal_code: 'TSH',
  ward_code: null
};
```

#### Statistics Endpoint: `/statistics/expired-members`
Location: `backend/src/routes/statistics.ts`

Returns different data structures based on admin level:

**National Admin Response:**
```json
{
  "national_summary": { ... },
  "province_breakdown": [ ... ],
  "filtered_by_province": false
}
```

**Province Admin Response:**
```json
{
  "national_summary": { ... },  // Actually province totals
  "province_breakdown": [ ... ],  // Single province
  "subregional_breakdown": [ ... ],  // Municipalities
  "filtered_by_province": true,
  "province_code": "GP"
}
```

**Municipality Admin Response:**
```json
{
  "national_summary": { ... },  // Actually municipality totals
  "municipality_breakdown": [ ... ],  // Single municipality
  "ward_breakdown": [ ... ],  // Wards
  "filtered_by_municipality": true,
  "municipality_code": "TSH"
}
```

#### Analytics Model: `getDashboardStats`
Location: `backend/src/models/analytics.ts`

Supports filtering by province and municipality:
```typescript
static async getDashboardStats(filters: ReportFilters = {}): Promise<DashboardStats> {
  // Builds WHERE clause with province_code and/or municipal_code
  // All queries respect the geographic filtering
}
```

### Frontend Filtering

#### Hooks

**useProvinceContext**
Location: `frontend/src/hooks/useProvinceContext.ts`
```typescript
const provinceContext = useProvinceContext();
// Returns:
// - isNationalAdmin: boolean
// - isProvinceAdmin: boolean
// - assignedProvince: { code, name }
// - getProvinceFilter(): string | null
```

**useMunicipalityContext**
Location: `frontend/src/hooks/useMunicipalityContext.ts`
```typescript
const municipalityContext = useMunicipalityContext();
// Returns:
// - isMunicipalityAdmin: boolean
// - assignedMunicipality: { code, name }
// - getMunicipalityFilter(): string | null
```

#### Components

**ExpiredMembersSection**
Location: `frontend/src/components/dashboard/ExpiredMembersSection.tsx`

Conditionally renders breakdown sections based on admin level:
```typescript
// National Admin: Shows province breakdown
{!filtered_by_province && !filtered_by_municipality && provinceContext.isNationalAdmin && (
  <ProvinceBreakdownCharts data={province_breakdown} />
)}

// Province Admin: Shows sub-regional breakdown
{filtered_by_province && !filtered_by_municipality && subregional_breakdown && (
  <SubRegionalBreakdownList data={subregional_breakdown} />
)}

// Municipality Admin: Shows ward breakdown
{filtered_by_municipality && ward_breakdown && (
  <WardBreakdownList data={ward_breakdown} />
)}
```

## Query Examples

### Get Province Admin Data
```sql
-- Expired members for a province
SELECT COUNT(*) 
FROM members_consolidated 
WHERE province_code = 'GP' 
  AND expiry_date < CURRENT_DATE;

-- Sub-regional breakdown (municipalities)
SELECT 
  mu.municipality_code,
  mu.municipality_name,
  COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) as expired_count,
  COUNT(m.member_id) as total_members
FROM municipalities mu
LEFT JOIN members_consolidated m ON mu.municipality_code = m.municipality_code
WHERE mu.province_code = 'GP'
  AND COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'
GROUP BY mu.municipality_code, mu.municipality_name
ORDER BY expired_count DESC;
```

### Get Municipality Admin Data
```sql
-- Expired members for a municipality
SELECT COUNT(*) 
FROM members_consolidated 
WHERE municipality_code = 'TSH' 
  AND expiry_date < CURRENT_DATE;

-- Ward breakdown
SELECT 
  w.ward_code,
  w.ward_name,
  COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) as expired_count,
  COUNT(m.member_id) as total_members
FROM wards w
LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
WHERE w.municipality_code = 'TSH'
GROUP BY w.ward_code, w.ward_name
ORDER BY expired_count DESC;
```

## Key Design Decisions

### 1. Metro Municipality Exclusion
- **Why**: Metro Municipalities are parent entities that contain sub-regions
- **Where**: Sub-regional breakdown for Province Admin
- **How**: `COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'`
- **Consistency**: Same logic used in Daily Report

### 2. List View for Lower Admin Levels
- **Why**: Province and Municipality admins have fewer entities to display
- **What**: Simple list with chips and progress bars instead of complex charts
- **Benefit**: Cleaner UI, faster rendering, easier to scan

### 3. Automatic Geographic Filtering
- **Why**: Security and data isolation
- **Where**: Middleware level (`applyGeographicFilter`)
- **Benefit**: Consistent filtering across all endpoints, no manual filtering needed

### 4. Reusing National Summary Structure
- **Why**: Frontend compatibility and code reuse
- **What**: Province/Municipality totals returned in `national_summary` field
- **Benefit**: No frontend changes needed for summary cards

## Troubleshooting

### Issue: Province Admin sees national data
**Solution**: Check that `applyGeographicFilter` middleware is applied to the route

### Issue: Sub-regional breakdown is empty
**Solution**: Verify province has municipalities and Metro Municipalities are properly typed

### Issue: Municipality Admin sees province data
**Solution**: Check that `municipalityContext` is properly set in middleware

### Issue: Dashboard loads slowly
**Solution**: Check database indexes on `province_code`, `municipality_code`, `ward_code`

