# GEOMAPS Backend API Server

A comprehensive Node.js backend server for the South African membership management system with geographic data integration.

## 🚀 Features

- **RESTful API** with comprehensive endpoints
- **MySQL Database Integration** with connection pooling
- **Geographic Data Management** (Provinces, Districts, Municipalities, Wards)
- **Membership Management** with full CRUD operations
- **Statistical Analytics** and demographic reporting
- **Authentication & Authorization** with JWT tokens
- **Input Validation** with Joi schemas
- **Rate Limiting** and security middleware
- **Health Monitoring** endpoints
- **TypeScript** for type safety
- **Comprehensive Error Handling**

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- MySQL 8.0 or higher
- Existing `membership_new` database with schema

## 🛠️ Installation

### 1. Clone and Setup

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=membership_new
DB_PORT=3306

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

Ensure your MySQL database `membership_new` is set up with the required schema:

```sql
-- The database should already exist with tables:
-- provinces, districts, municipalities, wards
-- members, memberships, voting_stations
-- All lookup tables (genders, races, languages, etc.)
-- Database views (vw_member_details, vw_membership_details, etc.)
```

### 4. Build and Start

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
```
POST   /auth/login          # Login with username/password
GET    /auth/validate       # Validate JWT token
POST   /auth/logout         # Logout (client-side token removal)
```

### Health & Monitoring
```
GET    /health              # Basic health check
GET    /health/detailed     # Detailed health with database status
GET    /health/database     # Database-specific health check
GET    /health/ready        # Readiness probe (K8s compatible)
GET    /health/live         # Liveness probe (K8s compatible)
```

### Geographic Data
```
GET    /geographic/provinces                    # List all provinces
GET    /geographic/provinces/:code             # Get specific province
GET    /geographic/districts                   # List all districts
GET    /geographic/districts/:code             # Get specific district
GET    /geographic/municipalities              # List all municipalities
GET    /geographic/municipalities/:code        # Get specific municipality
GET    /geographic/wards                       # List wards (paginated)
GET    /geographic/wards/:code                 # Get specific ward
GET    /geographic/hierarchy/province/:code    # Province hierarchy
GET    /geographic/summary                     # Geographic summary stats
```

### Members Management
```
GET    /members                    # List members (with filtering & pagination)
GET    /members/:id                # Get member by ID
GET    /members/id-number/:number  # Get member by ID number
GET    /members/ward/:wardCode     # Get members by ward
POST   /members                    # Create new member
PUT    /members/:id                # Update member
DELETE /members/:id                # Delete member
GET    /members/check/id-number/:number  # Check ID number availability
GET    /members/statistics/summary       # Member statistics
```

### Memberships Management
```
GET    /memberships                    # List memberships (with filtering)
GET    /memberships/:id                # Get membership by ID
GET    /memberships/member/:memberId   # Get membership by member ID
POST   /memberships                    # Create new membership
PUT    /memberships/:id                # Update membership
DELETE /memberships/:id                # Delete membership
GET    /memberships/reports/expiring   # Get expiring memberships
GET    /memberships/reports/expired    # Get expired memberships
GET    /memberships/statistics/summary # Membership statistics
```

### Lookup Data
```
GET    /lookups                        # All lookup data
GET    /lookups/genders               # Gender options
GET    /lookups/races                 # Race categories
GET    /lookups/languages             # Language options
GET    /lookups/occupations           # Occupation list
GET    /lookups/qualification-levels  # Education levels
GET    /lookups/membership-statuses   # Membership status options
GET    /lookups/voting-stations       # Voting stations
GET    /lookups/summary               # Lookup data summary
```

### Statistics & Analytics
```
GET    /statistics/ward-membership     # Ward membership statistics
GET    /statistics/demographics        # Demographic breakdown
GET    /statistics/demographics/ward/:wardCode        # Ward demographics
GET    /statistics/demographics/municipality/:code    # Municipality demographics
GET    /statistics/membership-trends   # Membership trends analysis
GET    /statistics/system             # Overall system statistics
GET    /statistics/dashboard          # Dashboard summary data
GET    /statistics/compare            # Compare multiple areas
GET    /statistics/export             # Export statistics data
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. 

### Demo Users
```javascript
// Username: admin, Password: admin123, Role: admin
// Username: user, Password: user123, Role: user  
// Username: readonly, Password: readonly123, Role: readonly
```

### Usage
1. Login to get a token:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

2. Use the token in subsequent requests:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/v1/members
```

## 📊 Response Format

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

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | Database host | `localhost` |
| `DB_USER` | Database user | `root` |
| `DB_PASSWORD` | Database password | `` |
| `DB_NAME` | Database name | `membership_new` |
| `JWT_SECRET` | JWT signing secret | Required |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit max requests | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |

## 🚦 Health Checks

The server provides multiple health check endpoints:

- **Basic**: `GET /api/v1/health` - Simple server status
- **Detailed**: `GET /api/v1/health/detailed` - Includes database status
- **Database**: `GET /api/v1/health/database` - Database connectivity only
- **Ready**: `GET /api/v1/health/ready` - Kubernetes readiness probe
- **Live**: `GET /api/v1/health/live` - Kubernetes liveness probe

## 🛡️ Security Features

- **Helmet.js** for security headers
- **CORS** configuration
- **Rate limiting** (100 requests per 15 minutes by default)
- **Input validation** with Joi schemas
- **JWT authentication** with role-based access
- **SQL injection protection** with prepared statements
- **Error handling** without sensitive data exposure

## 📈 Performance

- **Connection pooling** for database connections
- **Compression** middleware for response compression
- **Efficient queries** using database views
- **Pagination** for large datasets
- **Caching** headers for static responses

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📝 Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run build:watch` - Build with watch mode
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Project Structure
```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route handlers (future)
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── utils/          # Utility functions
│   └── app.ts          # Main application
├── dist/               # Compiled JavaScript
├── logs/               # Log files
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 Integration with Frontend

The backend is designed to work seamlessly with the React frontend running on port 3000. Key integration points:

1. **CORS** configured for `http://localhost:3000`
2. **Geographic data** replaces static JSON files
3. **Membership data** provides real database integration
4. **Demographics** replace mock data generation
5. **Authentication** for secure access

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 Process Manager
```bash
npm install -g pm2
pm2 start dist/app.js --name geomaps-api
pm2 startup
pm2 save
```

### Environment-specific Configurations
- **Development**: Full logging, detailed errors
- **Production**: Minimal logging, generic errors, security headers

## 📞 Support

For issues and questions:
1. Check the health endpoints for system status
2. Review logs in the `logs/` directory
3. Verify database connectivity
4. Check environment configuration

## 📄 License

MIT License - see LICENSE file for details.
