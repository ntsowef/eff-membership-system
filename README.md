# GEOMAPS Membership Management System

A comprehensive, enterprise-grade membership management system built with Node.js, TypeScript, and MySQL. This system provides complete functionality for managing organizational membership, leadership, elections, meetings, and analytics.

## 🚀 Features

### Core Functionality
- **Member Management**: Complete member lifecycle management with advanced search and filtering
- **Leadership System**: Hierarchical leadership structure with appointments and elections
- **Election Management**: Full election lifecycle from nominations to results
- **Meeting Management**: Comprehensive meeting scheduling and attendance tracking
- **Document Management**: Secure document storage and sharing system
- **Analytics & Reporting**: Advanced analytics with export capabilities
- **Bulk Operations**: Efficient bulk processing for large-scale operations

### Advanced Features
- **Hierarchical Permissions**: Multi-level admin system with geographic access control
- **Audit Logging**: Complete audit trail for all system activities
- **Caching System**: Redis-based caching for optimal performance
- **Real-time Notifications**: Multi-channel notification system (Email, SMS)
- **SMPP SMS Support**: Direct carrier connections via SMPP protocol for high-volume messaging
- **Database Optimization**: Query monitoring and performance optimization
- **RESTful API**: Comprehensive REST API with OpenAPI documentation

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/Vue)   │◄──►│   (Node.js/TS)  │◄──►│   (MySQL 8.0)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cache Layer   │
                       │   (Redis)       │
                       └─────────────────┘
```

### Technology Stack
- **Backend**: Node.js 18+, TypeScript, Express.js
- **Database**: MySQL 8.0 with optimized indexing
- **Cache**: Redis 6.0+ for performance optimization
- **Authentication**: JWT with refresh tokens
- **Documentation**: OpenAPI/Swagger
- **Testing**: Jest with comprehensive test coverage
- **Process Management**: PM2 for production deployment

## 📋 Prerequisites

- Node.js 18.x or higher
- MySQL 8.0 or higher
- Redis 6.0 or higher
- npm or yarn package manager

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/geomaps-membership.git
cd geomaps-membership
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=membership_new

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h

# SMS Configuration (choose one provider)
SMS_PROVIDER=smpp  # Options: mock, twilio, clickatell, gateway, smpp

# SMPP Configuration (for direct carrier connections)
SMPP_HOST=smpp.your-provider.com
SMPP_SYSTEM_ID=your_system_id
SMPP_PASSWORD=your_smpp_password

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 4. Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE membership_new CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 5. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:5000/api/v1`

## 📚 API Documentation

### Interactive Documentation
Visit `http://localhost:5000/api/v1/docs` for interactive API documentation.

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token

#### Member Management
- `GET /api/v1/members` - List members with filtering
- `POST /api/v1/members` - Create new member
- `GET /api/v1/members/:id` - Get member details
- `PUT /api/v1/members/:id` - Update member
- `DELETE /api/v1/members/:id` - Delete member

#### Leadership System
- `GET /api/v1/leadership/positions` - Get leadership positions
- `POST /api/v1/leadership/appointments` - Create appointment
- `GET /api/v1/leadership/appointments` - List appointments
- `GET /api/v1/leadership/structure/:level/:entityId` - Get leadership structure

#### Elections
- `GET /api/v1/elections` - List elections
- `POST /api/v1/elections` - Create election
- `POST /api/v1/elections/:id/candidates` - Add candidate
- `POST /api/v1/elections/:id/vote` - Cast vote
- `GET /api/v1/elections/:id/results` - Get results

#### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/membership` - Membership analytics
- `GET /api/v1/analytics/meetings` - Meeting analytics
- `GET /api/v1/analytics/leadership` - Leadership analytics

#### SMS Communication
- `POST /api/v1/sms/send` - Send single SMS
- `POST /api/v1/sms/bulk-send` - Send bulk SMS
- `POST /api/v1/sms/notify-members` - Send SMS to members
- `GET /api/v1/sms/provider` - Get SMS provider information
- `POST /api/v1/sms/test` - Test SMS functionality

## 🗄️ Database Schema

### Core Tables
- **members**: Member information and status
- **users**: System user accounts
- **leadership_positions**: Available leadership positions
- **leadership_appointments**: Current and historical appointments
- **leadership_elections**: Election management
- **meetings**: Meeting scheduling and management
- **audit_logs**: Complete system audit trail

### Geographic Hierarchy
- **provinces**: Provincial divisions
- **regions**: Regional divisions
- **municipalities**: Municipal divisions
- **wards**: Ward-level divisions
- **branches**: Local branches

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Hierarchical permission system (5 admin levels)
- Geographic access control
- Role-based access control (RBAC)

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- CORS configuration
- Secure password hashing (bcrypt)

### Audit & Compliance
- Complete audit logging
- Data retention policies
- GDPR compliance features
- Secure file upload handling

## 📊 Performance Features

### Caching Strategy
- Redis-based caching for frequently accessed data
- Intelligent cache invalidation
- Query result caching
- Session management

### Database Optimization
- Optimized indexes for all major queries
- Connection pooling
- Query performance monitoring
- Slow query detection and logging

### Scalability
- Horizontal scaling support
- Load balancer ready
- Microservice architecture preparation
- API versioning

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage

# End-to-end tests
npm run test:e2e
```

### Test Coverage
- Unit tests for all models and services
- Integration tests for API endpoints
- Database transaction testing
- Authentication and authorization testing

## 📈 Monitoring & Analytics

### Built-in Monitoring
- System health endpoints
- Performance metrics
- Database query monitoring
- Cache performance tracking
- Error rate monitoring

### Analytics Dashboard
- Member growth analytics
- Meeting attendance statistics
- Leadership tenure analysis
- Election participation metrics
- Geographic distribution analysis

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Or start directly
npm start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t geomaps-membership .

# Run with Docker Compose
docker-compose up -d
```

See [Deployment Guide](backend/docs/DEPLOYMENT_GUIDE.md) for detailed production deployment instructions.

## 📖 Documentation

- [API Documentation](backend/docs/API_DOCUMENTATION.md)
- [Deployment Guide](backend/docs/DEPLOYMENT_GUIDE.md)
- [Database Schema](backend/docs/DATABASE_SCHEMA.md)
- [Security Guide](backend/docs/SECURITY_GUIDE.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commit messages
- Ensure code passes all linting checks

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- 📧 Email: support@geomaps.org
- 📖 Documentation: [API Docs](http://localhost:5000/api/v1/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/geomaps-membership/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/geomaps-membership/discussions)

### Reporting Issues
When reporting issues, please include:
- System information (OS, Node.js version, etc.)
- Steps to reproduce
- Expected vs actual behavior
- Error logs (if applicable)

## 🎯 Roadmap

### Version 2.0 (Planned)
- [ ] Mobile application (React Native)
- [ ] Advanced workflow automation
- [ ] Integration with external systems
- [ ] Multi-language support
- [ ] Advanced reporting dashboard
- [ ] Real-time collaboration features

### Version 1.1 (In Progress)
- [x] Comprehensive membership management
- [x] Leadership and election systems
- [x] Meeting management
- [x] Analytics and reporting
- [x] Bulk operations
- [x] Database optimization and caching
- [x] Complete testing and documentation

## 🏆 Acknowledgments

- Built with ❤️ by the GEOMAPS development team
- Special thanks to all contributors
- Inspired by modern membership management needs
- Powered by open-source technologies

---

**GEOMAPS Membership Management System** - Empowering organizations with comprehensive membership management capabilities.

For more information, visit our [documentation](backend/docs/) or contact our support team.
