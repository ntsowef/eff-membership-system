# File Upload Testing Infrastructure

This directory contains comprehensive testing infrastructure for the high-volume concurrent file upload system.

## 📁 Directory Structure

```
test/
├── README.md                           # This file
├── sample-data/                        # Sample data generation scripts
│   ├── generate-member-applications.js # Generate member application Excel files
│   └── generate-renewals.js            # Generate renewal Excel files
├── concurrent-uploads/                 # Concurrent upload test scripts
│   ├── test-5-concurrent.js            # Test with 5 concurrent uploads
│   ├── test-10-concurrent.js           # Test with 10 concurrent uploads
│   ├── test-15-concurrent.js           # Test with 15 concurrent uploads
│   └── test-20-concurrent.js           # Test with 20 concurrent uploads
├── scenarios/                          # Test scenario scripts
│   ├── scenario-1-small-files.js       # 5 users, small files (100-500 rows)
│   ├── scenario-2-medium-files.js      # 10 users, medium files (1000-2000 rows)
│   ├── scenario-3-large-files.js       # 5 users, large files (5000-10000 rows)
│   ├── scenario-4-mixed-files.js       # 20 users, mixed file sizes
│   └── scenario-5-stress-test.js       # Continuous uploads for 10 minutes
└── results/                            # Test results documentation
    └── test-results-template.md        # Template for documenting results
```

## 🚀 Quick Start

### Prerequisites

1. **Backend server running** on `http://localhost:5000`
2. **Redis server running** on `localhost:6379`
3. **PostgreSQL database** running on `localhost:5432`
4. **Node.js** installed (v16 or higher)
5. **npm packages** installed in backend directory

### Installation

```bash
cd test
npm install
```

### Running Tests

#### 1. Generate Sample Data

```bash
# Generate member application files
node sample-data/generate-member-applications.js

# Generate renewal files
node sample-data/generate-renewals.js
```

This will create Excel files in `test/sample-data/output/`:
- `member-applications-100.xlsx` (100 rows)
- `member-applications-1000.xlsx` (1000 rows)
- `member-applications-5000.xlsx` (5000 rows)
- `member-applications-10000.xlsx` (10000 rows)
- `renewals-100.xlsx` (100 rows)
- `renewals-1000.xlsx` (1000 rows)
- `renewals-5000.xlsx` (5000 rows)

#### 2. Run Concurrent Upload Tests

```bash
# Test with 5 concurrent uploads
node concurrent-uploads/test-5-concurrent.js

# Test with 10 concurrent uploads
node concurrent-uploads/test-10-concurrent.js

# Test with 15 concurrent uploads
node concurrent-uploads/test-15-concurrent.js

# Test with 20 concurrent uploads
node concurrent-uploads/test-20-concurrent.js
```

#### 3. Run Test Scenarios

```bash
# Scenario 1: Small files
node scenarios/scenario-1-small-files.js

# Scenario 2: Medium files
node scenarios/scenario-2-medium-files.js

# Scenario 3: Large files
node scenarios/scenario-3-large-files.js

# Scenario 4: Mixed files
node scenarios/scenario-4-mixed-files.js

# Scenario 5: Stress test
node scenarios/scenario-5-stress-test.js
```

## 📊 Test Metrics

Each test script tracks and reports the following metrics:

### Upload Metrics
- **Total uploads**: Number of files uploaded
- **Successful uploads**: Files accepted by the server
- **Failed uploads**: Files rejected or errored
- **Average upload time**: Time to upload and receive response
- **Peak upload time**: Longest upload time
- **Throughput**: Files per second

### Processing Metrics
- **Total processing time**: Time from upload to completion
- **Average processing time**: Average time per file
- **Peak processing time**: Longest processing time
- **Records processed**: Total number of records
- **Processing rate**: Records per second

### System Metrics
- **Database connections**: Peak connection usage
- **Memory usage**: Peak memory consumption
- **Queue depth**: Maximum queue size
- **Error rate**: Percentage of failed operations

### Rate Limiting Metrics
- **Rate limit hits**: Number of requests blocked
- **Concurrent limit hits**: Number of concurrent blocks
- **System limit hits**: Number of system-wide blocks

## 🎯 Test Scenarios

### Scenario 1: Small Files (5 users, 100-500 rows)
**Purpose**: Test basic concurrent upload handling with small files
**Expected**: All uploads should complete quickly with minimal queuing

### Scenario 2: Medium Files (10 users, 1000-2000 rows)
**Purpose**: Test moderate load with realistic file sizes
**Expected**: Queue should manage load effectively, processing should be smooth

### Scenario 3: Large Files (5 users, 5000-10000 rows)
**Purpose**: Test system with large files that take significant time to process
**Expected**: Queue should handle long-running jobs, no timeouts

### Scenario 4: Mixed Files (20 users, mixed sizes)
**Purpose**: Test realistic scenario with varying file sizes
**Expected**: Priority system should work, smaller files should complete faster

### Scenario 5: Stress Test (continuous uploads for 10 minutes)
**Purpose**: Test system stability under sustained load
**Expected**: System should remain stable, no memory leaks, consistent performance

## 📝 Documenting Results

After running tests, document results using the template in `results/test-results-template.md`:

```bash
cp results/test-results-template.md results/test-results-YYYY-MM-DD.md
# Edit the file with your test results
```

## 🔧 Configuration

Test scripts can be configured via environment variables:

```bash
# Backend API URL
export API_URL=http://localhost:5000

# Test user credentials
export TEST_USER_ID=1
export TEST_USER_ROLE=super_admin

# Test parameters
export CONCURRENT_UPLOADS=10
export TEST_DURATION_MINUTES=10
```

## 📈 Performance Benchmarks

### Before Optimization (Baseline)
- **Concurrent uploads**: 1-2 (no queue)
- **Processing rate**: ~50 records/second
- **Memory usage**: Spikes with each upload
- **Database connections**: Exhausted at 5+ uploads

### After Optimization (Target)
- **Concurrent uploads**: 20+ (with queue)
- **Processing rate**: ~500 records/second (batch processing)
- **Memory usage**: Stable under load
- **Database connections**: Controlled, never exhausted

## 🐛 Troubleshooting

### Tests failing with "Connection refused"
- Ensure backend server is running on port 5000
- Check Redis is running on port 6379

### Tests failing with "Rate limit exceeded"
- This is expected behavior - tests are designed to hit rate limits
- Check rate limiting middleware is working correctly

### Tests failing with "Insufficient disk space"
- Ensure at least 5GB free disk space
- Run file cleanup: `node scripts/cleanup-test-files.js`

### Queue not processing jobs
- Check Redis connection
- Check queue workers are started in backend
- Check backend logs for errors

## 📚 Additional Resources

- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Rate Limiting Best Practices](https://www.npmjs.com/package/express-rate-limit)
- [Load Testing Guide](https://k6.io/docs/)

