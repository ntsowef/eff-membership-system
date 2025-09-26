# GEOMAPS Membership Management System - API Documentation

## Overview

The GEOMAPS Membership Management System provides a comprehensive REST API for managing organizational membership, leadership, meetings, elections, and analytics. This documentation covers all available endpoints, authentication, and usage examples.

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

The API uses JWT (JSON Web Token) based authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstname": "John",
  "surname": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

## Member Management

### Get Members
```http
GET /members?page=1&limit=20&search=john&membership_status=Active
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search term for name, email, or membership number
- `membership_status` (optional): Filter by status (Active, Inactive, Pending, Suspended)
- `hierarchy_level` (optional): Filter by hierarchy level
- `entity_id` (optional): Filter by entity ID

**Response:**
```json
{
  "success": true,
  "message": "Members retrieved successfully",
  "data": {
    "members": [
      {
        "member_id": 1,
        "membership_number": "MEM001",
        "firstname": "John",
        "surname": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "membership_status": "Active",
        "hierarchy_level": "Ward",
        "entity_name": "Ward 1"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "limit": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Create Member
```http
POST /members
```

**Request Body:**
```json
{
  "firstname": "John",
  "surname": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-01",
  "gender": "Male",
  "hierarchy_level": "Ward",
  "entity_id": 1,
  "membership_type": "Regular",
  "address": "123 Main St, City, Country"
}
```

### Update Member
```http
PUT /members/{id}
```

### Get Member by ID
```http
GET /members/{id}
```

## Leadership Management

### Get Leadership Positions
```http
GET /leadership/positions?hierarchy_level=National
```

### Create Leadership Appointment
```http
POST /leadership/appointments
```

**Request Body:**
```json
{
  "member_id": 1,
  "position_id": 1,
  "hierarchy_level": "National",
  "entity_id": 1,
  "appointment_type": "Elected",
  "start_date": "2024-01-01",
  "end_date": "2026-12-31",
  "appointment_notes": "Elected during AGM 2024"
}
```

### Get Current Appointments
```http
GET /leadership/appointments?hierarchy_level=National&entity_id=1
```

### Get Leadership Structure
```http
GET /leadership/structure/{hierarchyLevel}/{entityId}
```

## Election Management

### Get Elections
```http
GET /elections?hierarchy_level=National&election_status=Completed
```

### Create Election
```http
POST /elections
```

**Request Body:**
```json
{
  "election_name": "National Chairperson Election 2024",
  "position_id": 1,
  "hierarchy_level": "National",
  "entity_id": 1,
  "election_date": "2024-06-15",
  "nomination_start_date": "2024-05-01",
  "nomination_end_date": "2024-05-15",
  "voting_start_datetime": "2024-06-15T08:00:00Z",
  "voting_end_datetime": "2024-06-15T18:00:00Z"
}
```

### Add Candidate
```http
POST /elections/{id}/candidates
```

### Cast Vote
```http
POST /elections/{id}/vote
```

**Request Body:**
```json
{
  "candidate_id": 1
}
```

### Get Election Results
```http
GET /elections/{id}/results
```

## Meeting Management

### Get Meetings
```http
GET /meetings?meeting_type_id=1&meeting_status=Scheduled
```

### Create Meeting
```http
POST /meetings
```

**Request Body:**
```json
{
  "meeting_title": "Monthly Executive Meeting",
  "meeting_type_id": 1,
  "hierarchy_level": "National",
  "entity_id": 1,
  "meeting_date": "2024-01-15",
  "meeting_time": "10:00",
  "duration_minutes": 120,
  "location": "Conference Room A",
  "virtual_meeting_link": "https://zoom.us/j/123456789",
  "meeting_platform": "Hybrid",
  "description": "Monthly executive committee meeting",
  "quorum_required": 5
}
```

### Get Meeting Types
```http
GET /meetings/types
```

## Analytics & Reporting

### Dashboard Statistics
```http
GET /analytics/dashboard?hierarchy_level=National
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_members": 1250,
      "active_members": 1100,
      "pending_applications": 25,
      "total_meetings": 48,
      "upcoming_meetings": 3,
      "total_elections": 12,
      "active_elections": 1,
      "leadership_positions_filled": 18,
      "leadership_positions_vacant": 2,
      "recent_registrations": 15,
      "membership_growth_rate": 8.5
    }
  }
}
```

### Membership Analytics
```http
GET /analytics/membership?hierarchy_level=Province&entity_id=1
```

### Meeting Analytics
```http
GET /analytics/meetings?date_from=2024-01-01&date_to=2024-12-31
```

### Leadership Analytics
```http
GET /analytics/leadership
```

### Export Reports
```http
GET /analytics/export/membership/excel?hierarchy_level=National
GET /analytics/export/membership/pdf?hierarchy_level=National
```

## Bulk Operations

### Bulk Update Members
```http
POST /bulk-operations/members/update
```

**Request Body:**
```json
{
  "member_ids": [1, 2, 3, 4, 5],
  "update_data": {
    "membership_status": "Active",
    "notes": "Bulk status update"
  },
  "reason": "Annual membership renewal"
}
```

### Bulk Transfer Members
```http
POST /bulk-operations/members/transfer
```

### Bulk Send Notifications
```http
POST /bulk-operations/notifications/send
```

**Request Body:**
```json
{
  "recipient_type": "hierarchy_level",
  "recipient_criteria": {
    "hierarchy_level": "Ward",
    "entity_id": 1
  },
  "notification_data": {
    "title": "Important Announcement",
    "message": "Please attend the upcoming ward meeting.",
    "notification_type": "info",
    "channels": ["email", "sms"],
    "priority": "medium"
  }
}
```

### Get Bulk Operations
```http
GET /bulk-operations?operation_type=member_update&operation_status=Completed
```

## System Management

### System Health
```http
GET /system/health
```

### Cache Statistics
```http
GET /system/cache/stats
```

### Database Performance
```http
GET /system/database/performance
```

### Clear Cache
```http
POST /system/cache/clear
```

**Request Body:**
```json
{
  "pattern": "members:*"
}
```

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Email is required"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Standard users**: 100 requests per minute
- **Admin users**: 500 requests per minute
- **System operations**: 1000 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Pagination information is included in responses:
```json
{
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_count": 200,
    "limit": 20,
    "has_next": true,
    "has_prev": false
  }
}
```

## Filtering and Searching

Most list endpoints support filtering and searching:

### Common Filters
- `search`: Text search across relevant fields
- `date_from` / `date_to`: Date range filtering
- `status`: Status-based filtering
- `hierarchy_level`: Hierarchy level filtering
- `entity_id`: Entity-specific filtering

### Search Syntax
- Simple text: `search=john` (searches all relevant fields)
- Exact match: `search="John Doe"` (exact phrase match)
- Multiple terms: `search=john doe` (searches for both terms)

## Webhooks

The system supports webhooks for real-time notifications:

### Supported Events
- `member.created`
- `member.updated`
- `member.deleted`
- `appointment.created`
- `appointment.terminated`
- `election.completed`
- `meeting.scheduled`
- `bulk_operation.completed`

### Webhook Configuration
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["member.created", "appointment.created"],
  "secret": "your-webhook-secret"
}
```

## SDK and Libraries

Official SDKs are available for:
- JavaScript/Node.js
- Python
- PHP
- C#/.NET

Example usage (JavaScript):
```javascript
import { GeomapsAPI } from '@geomaps/api-client';

const api = new GeomapsAPI({
  baseURL: 'http://localhost:5000/api/v1',
  token: 'your-jwt-token'
});

const members = await api.members.list({
  page: 1,
  limit: 20,
  search: 'john'
});
```

## Support

For API support and questions:
- Documentation: [API Docs](http://localhost:5000/api/v1/docs)
- Email: api-support@geomaps.org
- GitHub Issues: [GitHub Repository](https://github.com/geomaps/membership-api)

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- Complete membership management
- Leadership and election systems
- Meeting management
- Analytics and reporting
- Bulk operations
- System management endpoints
