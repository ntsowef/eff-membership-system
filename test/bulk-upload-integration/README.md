# Bulk Upload Integration Tests

This directory contains integration tests for the bulk upload system.

## Overview

Integration tests verify that all components work together correctly:
- API endpoints
- Queue processing
- File monitoring
- Database operations
- WebSocket communication
- Report generation

## Test Categories

### 1. End-to-End Processing Tests
- Upload file → Queue → Process → Generate report
- Verify all stages complete successfully
- Check database records are created/updated
- Validate report content

### 2. API Integration Tests
- Test all REST endpoints with real requests
- Verify authentication and authorization
- Test error handling and validation
- Check response formats

### 3. Queue Integration Tests
- Test job lifecycle (add → process → complete)
- Verify retry logic
- Test concurrent job processing
- Check job cancellation

### 4. WebSocket Integration Tests
- Test real-time progress updates
- Verify connection handling
- Test multiple concurrent connections
- Check message format and delivery

### 5. Database Integration Tests
- Test actual database operations
- Verify transaction handling
- Test rollback on errors
- Check data integrity

### 6. File Monitor Integration Tests
- Test file detection and processing
- Verify automatic queue integration
- Test failed file handling
- Check duplicate detection

## Prerequisites

### Database Setup
```bash
# Ensure PostgreSQL is running on localhost:5432
# Database: eff_membership
# User: postgres
# Password: (from .env)
```

### Redis Setup
```bash
# Ensure Redis is running on localhost:6379
redis-cli ping  # Should return PONG
```

### Environment Variables
```bash
# Copy .env.example to .env and configure:
DATABASE_URL=postgresql://postgres:password@localhost:5432/eff_membership
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

## Running Integration Tests

### Run All Integration Tests
```bash
cd backend
npm run test:integration
```

### Run Specific Test Suite
```bash
npm test -- test/bulk-upload-integration/api-integration.test.ts
npm test -- test/bulk-upload-integration/e2e-processing.test.ts
```

### Run with Database Cleanup
```bash
npm run test:integration:clean
```

## Test Data

Test files are located in `test/bulk-upload-integration/test-data/`:
- `valid-members-10.xlsx` - 10 valid member records
- `valid-members-100.xlsx` - 100 valid member records
- `mixed-validation-50.xlsx` - 50 records with various validation issues
- `duplicate-ids-20.xlsx` - 20 records with duplicate IDs
- `invalid-ids-15.xlsx` - 15 records with invalid ID numbers

## Test Database

Integration tests use a separate test database to avoid affecting production data:
- Database: `eff_membership_test`
- Automatically created and seeded before tests
- Cleaned up after tests complete

## Coverage Goals

- **API Endpoints:** 100% coverage
- **Queue Operations:** 100% coverage
- **Database Operations:** 100% coverage
- **WebSocket Events:** 100% coverage
- **File Processing:** 100% coverage

## Troubleshooting

### Tests Hanging
- Check if Redis is running: `redis-cli ping`
- Check if PostgreSQL is running: `psql -h localhost -U postgres -l`
- Ensure no orphaned processes: `ps aux | grep node`

### Database Connection Errors
- Verify DATABASE_URL in .env
- Check PostgreSQL is accepting connections
- Ensure test database exists

### Redis Connection Errors
- Verify REDIS_URL in .env
- Check Redis is running on correct port
- Test connection: `redis-cli ping`

### File Upload Errors
- Check file permissions in uploads/ directory
- Verify multer configuration
- Check disk space

## CI/CD Integration

Integration tests are run in CI/CD pipeline:
```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    REDIS_URL: ${{ secrets.REDIS_URL }}
```

## Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data after tests
3. **Timeouts:** Set appropriate timeouts for async operations
4. **Mocking:** Mock external services (IEC API)
5. **Assertions:** Use specific assertions, not just truthy checks
6. **Error Cases:** Test both success and failure scenarios

## Next Steps

After integration tests pass:
1. Run comparison tests (Python vs Node.js)
2. Run performance benchmarks
3. Run load tests
4. Validate data accuracy
5. Conduct user acceptance testing (UAT)

