# GEOMAPS Backend API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Demo Users
- **Admin**: `username: admin, password: admin123`
- **User**: `username: user, password: user123`
- **Read-only**: `username: readonly, password: readonly123`

---

## Authentication Endpoints

### POST /auth/login
Login with username and password to get JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    },
    "expires_in": "24h"
  }
}
```

### GET /auth/validate
Validate JWT token (requires authentication).

### POST /auth/logout
Logout (client-side token removal).

---

## Health Check Endpoints

### GET /health
Basic server health check.

### GET /health/detailed
Detailed health check including database status.

### GET /health/database
Database-specific health check.

### GET /health/ready
Kubernetes readiness probe.

### GET /health/live
Kubernetes liveness probe.

---

## Geographic Data Endpoints

### GET /geographic/provinces
Get all provinces.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "province_id": 1,
      "province_code": "GP",
      "province_name": "Gauteng",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /geographic/provinces/:code
Get specific province by code.

### GET /geographic/districts
Get all districts. Optional query parameter: `?province=GP`

### GET /geographic/districts/:code
Get specific district by code.

### GET /geographic/municipalities
Get all municipalities. Optional query parameters: `?province=GP&district=DC10`

### GET /geographic/municipalities/:code
Get specific municipality by code.

### GET /geographic/wards
Get wards with pagination. Query parameters:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `municipality` (filter by municipality code)

### GET /geographic/wards/:code
Get specific ward by code.

### GET /geographic/hierarchy/province/:provinceCode
Get complete province hierarchy (districts, municipalities).

### GET /geographic/summary
Get geographic data summary statistics.

---

## Members Management Endpoints

### GET /members
Get members with filtering and pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `sortBy` (created_at, firstname, surname, age, id_number)
- `sortOrder` (asc, desc)
- `ward_code` (filter by ward)
- `gender_id` (1=Male, 2=Female, 3=Other)
- `race_id` (1-5)
- `age_min`, `age_max` (age range)
- `has_email` (true/false)
- `has_cell_number` (true/false)
- `q` (search in name/ID number)

### GET /members/:id
Get member by ID.

### GET /members/id-number/:idNumber
Get member by 13-digit ID number.

### GET /members/ward/:wardCode
Get all members in a specific ward.

### POST /members
Create new member.

**Request Body:**
```json
{
  "id_number": "1234567890123",
  "firstname": "John",
  "surname": "Doe",
  "gender_id": 1,
  "ward_code": "12345678",
  "cell_number": "0821234567",
  "email": "john@example.com"
}
```

### PUT /members/:id
Update member (partial updates allowed).

### DELETE /members/:id
Delete member.

### GET /members/check/id-number/:idNumber
Check if ID number is available.

### GET /members/statistics/summary
Get member statistics. Optional query parameter: `?ward_code=12345678`

---

## Memberships Management Endpoints

### GET /memberships
Get memberships with filtering and pagination.

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder` (pagination)
- `member_id` (specific member)
- `status_id` (1-5, membership status)
- `subscription_type_id` (1=New, 2=Renewal)
- `ward_code` (filter by ward)
- `is_expired` (true/false)
- `expires_within_days` (number of days)
- `date_joined_from`, `date_joined_to` (date range)

### GET /memberships/:id
Get membership by ID.

### GET /memberships/member/:memberId
Get membership by member ID.

### POST /memberships
Create new membership.

**Request Body:**
```json
{
  "member_id": 123,
  "date_joined": "2024-01-15",
  "subscription_type_id": 1,
  "membership_amount": 10.00,
  "status_id": 1
}
```

### PUT /memberships/:id
Update membership.

### DELETE /memberships/:id
Delete membership.

### GET /memberships/reports/expiring
Get memberships expiring soon. Query parameter: `?days=30`

### GET /memberships/reports/expired
Get expired memberships.

### GET /memberships/check/active/:memberId
Check if member has active membership.

### GET /memberships/statistics/summary
Get membership statistics.

---

## Lookup Data Endpoints

### GET /lookups
Get all lookup data in one request.

### GET /lookups/genders
Get gender options.

### GET /lookups/races
Get race categories.

### GET /lookups/citizenships
Get citizenship types.

### GET /lookups/languages
Get language options.

### GET /lookups/occupation-categories
Get occupation categories.

### GET /lookups/occupations
Get occupations. Optional query parameter: `?category_id=1`

### GET /lookups/qualification-levels
Get education/qualification levels.

### GET /lookups/subscription-types
Get subscription types (New/Renewal).

### GET /lookups/membership-statuses
Get membership status options. Optional query parameter: `?active_only=true`

### GET /lookups/voting-stations
Get voting stations. Optional query parameter: `?ward_code=12345678`

### GET /lookups/summary
Get lookup data summary with counts.

---

## Statistics & Analytics Endpoints

### GET /statistics/ward-membership
Get ward membership statistics. Optional query parameter: `?ward_code=12345678`

### GET /statistics/demographics
Get demographic breakdown. Query parameters:
- `ward_code` (specific ward)
- `municipality_code` (specific municipality)
- `district_code` (specific district)
- `province_code` (specific province)

### GET /statistics/demographics/ward/:wardCode
Get demographics for specific ward.

### GET /statistics/demographics/municipality/:municipalityCode
Get demographics for specific municipality.

### GET /statistics/membership-trends
Get membership trends analysis. Query parameter: `?months=12`

### GET /statistics/system
Get overall system statistics.

### GET /statistics/dashboard
Get dashboard summary data (combines multiple statistics).

### GET /statistics/compare
Compare multiple areas. Query parameters:
- `areas` (comma-separated codes, e.g., "GP,KZN,WC")
- `type` (ward, municipality, district, province)

### GET /statistics/export
Export statistics data. Query parameters:
- `format` (summary, detailed)
- Geographic filters (ward_code, municipality_code, etc.)

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/v1/members",
    "method": "POST"
  }
}
```

---

## Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `DATABASE_ERROR` - Database operation failed
- `AUTHENTICATION_ERROR` - Authentication required or failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Unexpected server error

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response**: 429 status code when limit exceeded

---

## CORS

- **Allowed Origin**: `http://localhost:3000` (configurable)
- **Allowed Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-Requested-With

---

## Testing

Use the provided test script:
```bash
npm run test:api
```

Or test manually with curl:
```bash
# Health check
curl http://localhost:5000/api/v1/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Get provinces
curl http://localhost:5000/api/v1/geographic/provinces
```
