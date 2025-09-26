# Database Views Integration for Membership Expiration Management

## Overview

This document outlines the integration of two database views (`vw_expiring_soon` and `vw_expired_memberships`) into the membership expiration management system. These views provide optimized, pre-calculated data for tracking membership expirations and renewals.

## Database Views

### 1. `vw_expiring_soon`
**Purpose**: Tracks members whose memberships will expire within 30 days

**Structure**:
```sql
- member_id (int): Unique member identifier
- id_number (varchar): South African ID number
- firstname (varchar): Member's first name
- surname (varchar): Member's surname (optional)
- full_name (varchar): Concatenated full name
- cell_number (varchar): Mobile phone number
- email (varchar): Email address
- ward_number (int): Electoral ward number
- municipality_name (varchar): Municipality name
- expiry_date (date): Membership expiration date
- membership_amount (decimal): Membership fee amount
- days_until_expiry (int): Days remaining until expiration
- renewal_priority (varchar): Priority level for renewal
```

**Priority Categories**:
- `Urgent (1 Week)`: Expires within 7 days
- `High Priority (2 Weeks)`: Expires within 8-14 days  
- `Medium Priority (1 Month)`: Expires within 15-30 days

### 2. `vw_expired_memberships`
**Purpose**: Tracks members whose memberships have already expired

**Structure**:
```sql
- member_id (int): Unique member identifier
- id_number (varchar): South African ID number
- firstname (varchar): Member's first name
- surname (varchar): Member's surname (optional)
- full_name (varchar): Concatenated full name
- cell_number (varchar): Mobile phone number
- email (varchar): Email address
- ward_number (int): Electoral ward number
- municipality_name (varchar): Municipality name
- expiry_date (date): Membership expiration date
- membership_amount (decimal): Membership fee amount
- days_expired (int): Days since expiration
- expiry_category (varchar): Expiration time category
```

**Expiry Categories**:
- `Recently Expired`: Expired within 30 days
- `Expired 1-3 Months`: Expired 31-90 days ago
- `Expired 3-12 Months`: Expired 91-365 days ago
- `Expired Over 1 Year`: Expired more than 365 days ago

## Backend Integration

### New TypeScript Interfaces

```typescript
interface ExpiringSoonMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  cell_number?: string;
  email?: string;
  ward_number?: number;
  municipality_name?: string;
  expiry_date: string;
  membership_amount: number;
  days_until_expiry: number;
  renewal_priority: 'Urgent (1 Week)' | 'High Priority (2 Weeks)' | 'Medium Priority (1 Month)';
}

interface ExpiredMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  cell_number?: string;
  email?: string;
  ward_number?: number;
  municipality_name?: string;
  expiry_date: string;
  membership_amount: number;
  days_expired: number;
  expiry_category: 'Recently Expired' | 'Expired 1-3 Months' | 'Expired 3-12 Months' | 'Expired Over 1 Year';
}
```

### New Model Methods

1. **`getExpiringSoonMembers(options)`**
   - Retrieves members expiring soon with filtering and pagination
   - Supports priority filtering, sorting, and pagination
   - Returns members list, total count, and priority summary

2. **`getExpiredMembers(options)`**
   - Retrieves expired members with categorization and pagination
   - Supports category filtering, sorting, and pagination
   - Returns members list, total count, and category summary

3. **`getEnhancedStatusOverview()`**
   - Provides comprehensive overview using both views
   - Returns summary statistics for dashboard display

### New API Endpoints

#### 1. Enhanced Overview
```
GET /api/v1/membership-expiration/enhanced-overview
```
**Response**:
```json
{
  "success": true,
  "data": {
    "enhanced_overview": {
      "expiring_soon_summary": [...],
      "expired_summary": [...],
      "total_expiring_soon": 694,
      "total_expired": 2797,
      "urgent_renewals": 103,
      "recently_expired": 1415
    },
    "summary": {
      "total_expiring_soon": 694,
      "urgent_renewals": 103,
      "total_expired": 2797,
      "recently_expired": 1415
    }
  }
}
```

#### 2. Expiring Soon Members
```
GET /api/v1/membership-expiration/expiring-soon
```
**Query Parameters**:
- `priority`: Filter by renewal priority (optional)
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 50, max: 1000)
- `sort_by`: Sort field (default: days_until_expiry)
- `sort_order`: Sort direction (default: asc)

#### 3. Expired Members
```
GET /api/v1/membership-expiration/expired
```
**Query Parameters**:
- `category`: Filter by expiry category (optional)
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 50, max: 1000)
- `sort_by`: Sort field (default: days_expired)
- `sort_order`: Sort direction (default: asc)

## Benefits

1. **Performance**: Pre-calculated views eliminate complex JOIN operations
2. **Consistency**: Standardized categorization and priority logic
3. **Scalability**: Optimized queries handle large datasets efficiently
4. **Maintainability**: Centralized business logic in database views
5. **Real-time Data**: Views always reflect current membership status

## Frontend Integration Recommendations

1. **Dashboard Widgets**: Use enhanced overview for key metrics
2. **Renewal Management**: Display expiring soon members by priority
3. **Recovery Campaigns**: Target expired members by category
4. **Notifications**: Trigger alerts based on priority levels
5. **Reports**: Generate detailed expiration reports with filtering

## Testing

Use the provided test script to verify integration:
```bash
node test-expiration-api.js
```

This integration significantly improves the membership expiration management workflow by providing structured, efficient access to expiration data through optimized database views.
