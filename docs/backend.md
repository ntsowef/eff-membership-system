# Backend Documentation

## 1. Tech Stack
- **Framework**: Node.js (Express.js)
- **Database**: MySQL
- **Authentication**: JWT
- **API Documentation**: Swagger

## 2. API Endpoints
### Membership Application
- `POST /api/membership-applications`: Submit a membership application.

### User Management
- `POST /api/users`: Create a user account after a member is registered.
- `POST /api/auth/login`: Log in a user.
- `GET /api/auth/me`: Get the logged-in user’s profile.

### Membership Management
- `GET /api/members`: Get a list of all members (for admins).
- `GET /api/members/:id`: Get a specific member’s details.
- `PUT /api/members/:id`: Update a member’s profile.
- `DELETE /api/members/:id`: Deactivate or remove a member.

### Voter Verification
- `POST /api/voter/verify`: Verify voter registration status for a single member.
- `POST /api/voter/verify-bulk`: Verify voter registration status for multiple members.

### Analytics
- `GET /api/analytics/national`: Get national-level membership statistics.
- `GET /api/analytics/province/:id`: Get province-level membership statistics.
- `GET /api/analytics/region/:id`: Get region-level membership statistics.
- `GET /api/analytics/municipality/:id`: Get municipality-level membership statistics.
- `GET /api/analytics/ward/:id`: Get ward-level membership statistics.

### Leadership Management
- `POST /api/leadership/assign`: Assign a leadership role to a member.
- `GET /api/leadership/member/:memberId`: Get leadership roles for a specific member.
- `GET /api/leadership/:level/:entityId?`: Get leadership roles for a specific level and entity.
- `PUT /api/leadership/:roleId`: Update a leadership role.
- `PUT /api/leadership/:roleId/end`: End a leadership role.
- `GET /api/leadership/:level/:entityId/available-positions`: Get available positions for a level and entity.
- `GET /api/leadership/:level/:entityId/eligible-members`: Get eligible members for leadership positions.

## 3. Database Schema
See `PRD.md` for the database schema.

## 4. Security
- Use **JWT** for authentication.
- Implement **RBAC** for authorization.
- Encrypt sensitive data using **AES-256**.

## 5. Performance Optimization
- Use **Redis** for caching.
- Pre-aggregate membership counts for faster analytics queries.