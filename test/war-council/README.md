# War Council Structure Test Suite

This directory contains comprehensive test scripts for the War Council Structure functionality in the membership management system.

## Overview

The War Council Structure is a national-level leadership hierarchy that includes:
- **Core Executive Positions**: President, Deputy President, Secretary General, Deputy Secretary General, National Chairperson, Treasurer General
- **CCT Deployees**: 9 province-specific positions (one for each South African province)

## Test Files

### 1. Database Tests
- **File**: `test-war-council-database.js`
- **Purpose**: Validates database schema, constraints, and data integrity
- **Tests**:
  - Leadership structures table existence
  - War Council positions creation
  - Database view functionality
  - Position uniqueness constraints
  - Province-specific position validation
  - Current appointments verification

### 2. API Tests
- **File**: `test-war-council-api.js`
- **Purpose**: Tests all War Council API endpoints
- **Tests**:
  - Get War Council Structure
  - Get War Council Dashboard
  - Get War Council Positions
  - Get Available Positions
  - Get Eligible Members
  - Validate Appointments
  - Check Position Vacancy

### 3. Frontend Tests
- **File**: `test-war-council-frontend.html`
- **Purpose**: Interactive frontend testing interface
- **Features**:
  - API connection testing
  - Structure data loading
  - Dashboard functionality
  - Position management
  - Permission system validation
  - Visual test results

### 4. Integration Tests
- **File**: `test-war-council-integration.js`
- **Purpose**: Comprehensive system integration testing
- **Tests**:
  - Database-API consistency
  - Data integrity across components
  - Permission system validation
  - Security endpoint protection

### 5. Test Runner
- **File**: `run-all-tests.js`
- **Purpose**: Automated test execution and reporting
- **Features**:
  - Prerequisites checking
  - Sequential test execution
  - Comprehensive reporting
  - Error analysis and recommendations

## Prerequisites

### Required Software
- Node.js (v14 or higher)
- MySQL Server
- Backend API server running on port 5000

### Required Node.js Packages
```bash
npm install mysql2 axios
```

### Database Setup
1. Ensure MySQL is running on localhost
2. Database `membership_new` exists
3. War Council migration has been executed
4. User `root` with no password (or update connection config)

### Backend Setup
1. Backend server is running on `http://localhost:5000`
2. War Council API endpoints are accessible
3. Database connection is properly configured

## Running Tests

### Quick Start
```bash
# Run all tests with automated reporting
node run-all-tests.js
```

### Individual Tests
```bash
# Database tests only
node test-war-council-database.js

# API tests only
node test-war-council-api.js

# Integration tests only
node test-war-council-integration.js
```

### Frontend Tests
```bash
# Open in browser
open test-war-council-frontend.html
# or
start test-war-council-frontend.html
```

## Test Categories

### 1. Database Tests ✅
- **Schema Validation**: Verifies all required tables and views exist
- **Data Integrity**: Checks position data and constraints
- **Constraint Testing**: Validates unique positions and province coverage
- **View Functionality**: Tests War Council structure view

### 2. API Tests 🌐
- **Endpoint Availability**: Verifies all endpoints are accessible
- **Response Validation**: Checks response format and data structure
- **Data Consistency**: Ensures consistent data across endpoints
- **Error Handling**: Tests error responses and validation

### 3. Frontend Tests 🖥️
- **Component Loading**: Tests React component functionality
- **API Integration**: Verifies frontend-backend communication
- **Permission System**: Tests access control implementation
- **User Interface**: Validates UI behavior and responsiveness

### 4. Integration Tests 🔗
- **End-to-End Flow**: Tests complete appointment workflow
- **Data Consistency**: Verifies data integrity across all layers
- **Security Testing**: Validates permission and authentication systems
- **Performance**: Checks system performance under load

## Expected Results

### Successful Test Run
```
✅ Database Schema & Structure Test - PASSED
✅ API Endpoints Test - PASSED  
✅ Integration Test - PASSED

📊 SUMMARY:
   Total Tests: 3
   ✅ Passed: 3
   ❌ Failed: 0
   📊 Success Rate: 100%
```

### Test Coverage
- **Database**: 15 War Council positions created
- **API**: 8 endpoints tested
- **Frontend**: 6 component tests
- **Integration**: 6 system-wide tests
- **Security**: Permission system validation

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
❌ Database connection failed: connect ECONNREFUSED
```
**Solution**: Ensure MySQL is running and `membership_new` database exists

#### API Not Accessible
```bash
⚠️ Backend API is not accessible - API tests will be skipped
```
**Solution**: Start the backend server on port 5000

#### Missing Node Modules
```bash
❌ mysql2 is missing
```
**Solution**: Install required packages with `npm install mysql2 axios`

#### Migration Not Run
```bash
❌ War Council Structure not found in leadership_structures table
```
**Solution**: Run the War Council migration: `020_war_council_structure.sql`

### Debug Mode
For detailed debugging, check individual test outputs:
```bash
node test-war-council-database.js 2>&1 | tee debug-database.log
node test-war-council-api.js 2>&1 | tee debug-api.log
```

## Test Reports

### Automated Reports
- **File**: `test-report.json`
- **Generated**: After each test run
- **Contains**: Detailed results, timing, and error information

### Manual Verification
1. Check database tables in MySQL Workbench
2. Test API endpoints in Postman
3. Verify frontend functionality in browser
4. Review permission system behavior

## Continuous Integration

### Pre-Deployment Checklist
- [ ] All database tests pass
- [ ] All API tests pass
- [ ] Frontend tests complete successfully
- [ ] Integration tests verify system consistency
- [ ] Permission system properly restricts access
- [ ] No security vulnerabilities detected

### Performance Benchmarks
- Database queries: < 100ms
- API responses: < 500ms
- Frontend loading: < 2s
- Full system test: < 30s

## Contributing

### Adding New Tests
1. Create test file in appropriate category
2. Follow existing naming convention
3. Include comprehensive error handling
4. Update this README with new test information
5. Add test to `run-all-tests.js` if needed

### Test Standards
- Use descriptive test names
- Include setup and cleanup
- Provide clear error messages
- Test both success and failure cases
- Document expected behavior

## Support

For issues with the War Council test suite:
1. Check this README for common solutions
2. Review test output for specific error messages
3. Verify all prerequisites are met
4. Check database and API server status
5. Review recent code changes that might affect tests

---

**Last Updated**: 2025-01-19
**Version**: 1.0.0
**Compatibility**: Node.js 14+, MySQL 8.0+, Backend API v1.0+
