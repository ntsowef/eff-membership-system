# IEC Electoral Events Integration Test Suite

This comprehensive test suite validates the IEC (Independent Electoral Commission) Electoral Events integration functionality in the membership management system.

## Overview

The test suite covers all aspects of the IEC Electoral Events integration:

- **Unit Tests**: Test individual components and methods in isolation
- **Integration Tests**: Test interaction between different components and services
- **API Endpoint Tests**: Test REST API endpoints for electoral events functionality
- **Performance Tests**: Test performance, load handling, and scalability aspects

## Test Structure

```
test/iec-electoral-events/
├── unit-tests.js           # Unit tests for individual components
├── integration-tests.js    # Integration tests for service interactions
├── api-endpoint-tests.js   # API endpoint tests
├── performance-tests.js    # Performance and scalability tests
├── test-runner.js          # Main test orchestrator
├── package.json           # Test dependencies and scripts
└── README.md              # This file
```

## Prerequisites

1. **Database Setup**: Ensure the MySQL database `membership_new` is running with IEC electoral events tables created
2. **Environment Variables**: Ensure `.env` file is properly configured with IEC API credentials
3. **Backend Services**: Ensure the backend services are compiled and available

## Running Tests

### Run All Tests
```bash
cd test/iec-electoral-events
node test-runner.js
```

### Run Individual Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# API endpoint tests only
npm run test:api

# Performance tests only
npm run test:performance
```

### Using Jest (if installed)
```bash
# Install dependencies first
npm install

# Run with Jest
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Test Categories

### 1. Unit Tests (`unit-tests.js`)

Tests individual components in isolation:

- **Database Operations**: CRUD operations for electoral events data
- **API Authentication**: IEC API authentication handling
- **Data Synchronization**: Sync logic for electoral events
- **Error Handling**: Error scenarios and recovery
- **Data Validation**: Input validation and data integrity
- **Caching and Performance**: Caching mechanisms

### 2. Integration Tests (`integration-tests.js`)

Tests interaction between components:

- **Database Integration**: Real database operations
- **Service Integration**: Inter-service communication
- **Data Consistency**: Data integrity across tables
- **Error Handling Integration**: End-to-end error handling
- **Performance Integration**: Real-world performance scenarios

### 3. API Endpoint Tests (`api-endpoint-tests.js`)

Tests REST API endpoints:

- **Health Endpoint**: Service health status
- **Electoral Event Types**: CRUD operations for event types
- **Electoral Events**: CRUD operations for events
- **Municipal Elections**: Municipal-specific endpoints
- **Synchronization**: Sync trigger endpoints
- **Error Handling**: API error responses
- **Response Format**: Consistent API response structure

### 4. Performance Tests (`performance-tests.js`)

Tests performance and scalability:

- **Database Query Performance**: Query execution times
- **Concurrent Request Handling**: Load handling capabilities
- **Memory Usage**: Resource management
- **Caching Performance**: Cache effectiveness
- **Database Connection Pool**: Connection management
- **Scalability**: Performance under increasing load

## Test Configuration

### Environment Variables

The tests use the following environment variables:

```bash
NODE_ENV=test                    # Test environment
SKIP_AUTH=true                   # Skip authentication for testing
IEC_API_USERNAME=your_username   # IEC API credentials
IEC_API_PASSWORD=your_password   # IEC API credentials
```

### Test Timeouts

- **Individual Test**: 30 seconds
- **Setup Phase**: 60 seconds
- **Database Operations**: 5 seconds
- **API Calls**: 10 seconds

## Expected Test Results

### Successful Test Run

```
🧪 IEC Electoral Events Integration Test Suite
==============================================

🔧 Setting up test environment...
✅ Database connection initialized
✅ Test environment configured
✅ Services loaded successfully
✅ Database connectivity verified (4 event types found)
🎯 Test environment setup completed

📋 Running Unit Tests...
   Tests individual components and methods in isolation
   ──────────────────────────────────────────────────
   ✅ Database Operations - getElectoralEventTypes
   ✅ Database Operations - getMunicipalElectionTypes
   ✅ API Authentication - successful authentication
   ✅ Unit Tests completed: 8 passed, 0 failed, 0 skipped
   ⏱️  Duration: 1250ms

📋 Running Integration Tests...
   Tests interaction between different components and services
   ──────────────────────────────────────────────────────────
   ✅ Database Integration - retrieve electoral event types
   ✅ Service Integration - electoral event context
   ✅ Integration Tests completed: 4 passed, 0 failed, 0 skipped
   ⏱️  Duration: 2100ms

📊 Test Results Summary
=======================
Total Tests: 24
✅ Passed: 24
❌ Failed: 0
⏭️  Skipped: 0
⏱️  Total Duration: 8500ms
📈 Success Rate: 100.0%

🎉 All tests passed successfully!
```

## Test Data

The tests use the following test data:

- **Test ID Number**: `8001015009087` (for voter verification tests)
- **Municipal Election Type ID**: `3` (Local Government Elections)
- **Current Election ID**: `1091` (LOCAL GOVERNMENT ELECTION 2021)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Verify database `membership_new` exists

2. **IEC API Tests Failing**
   - Check IEC API credentials
   - Verify network connectivity
   - API might be temporarily unavailable

3. **Performance Tests Failing**
   - Database might be under load
   - Adjust performance thresholds if needed
   - Check system resources

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true node test-runner.js
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate error handling
3. Include performance considerations
4. Update this README if needed
5. Ensure tests are deterministic and repeatable

## Test Coverage

The test suite aims for comprehensive coverage of:

- ✅ All public methods in `iecElectoralEventsService`
- ✅ All public methods in enhanced `voterVerificationService`
- ✅ All API endpoints in `iecElectoralEvents` routes
- ✅ Database operations and data integrity
- ✅ Error handling and edge cases
- ✅ Performance and scalability scenarios

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- Tests are deterministic and repeatable
- No external dependencies beyond database
- Configurable timeouts and retries
- Clear pass/fail criteria
- Detailed reporting for debugging

## Support

For issues with the test suite:

1. Check the troubleshooting section above
2. Review test logs for specific error messages
3. Ensure all prerequisites are met
4. Verify environment configuration
