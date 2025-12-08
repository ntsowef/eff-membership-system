# Bulk Upload Processor Migration Plan
## Python to Node.js/TypeScript

---

## 📋 Executive Summary

**Objective:** Migrate bulk upload processing system from standalone Python scripts to integrated Node.js/TypeScript services within the existing backend architecture.

**Timeline:** 14 weeks (3.5 months)

**Foundation:** Proof-of-concept at `test/bulk-upload-poc/test-bulk-upload-processor.ts`

**Strategy:** Phased migration with parallel operation, gradual rollout (10% → 25% → 50% → 100%), and comprehensive testing.

---

## 🎯 Migration Scope

### Python Modules to Migrate
1. **bulk_upload_processor.py** - Main orchestrator
2. **pre_validation_processor.py** - ID validation, duplicate detection
3. **iec_verification_module.py** - IEC API integration
4. **excel_report_generator.py** - 7-sheet Excel reports
5. **upload_validation_utils.py** - Utility functions
6. **flexible_membership_ingestionV2.py** - Database operations

### Target Architecture
- **Language:** TypeScript (Node.js)
- **Location:** `src/services/bulk-upload/`
- **Integration:** Existing backend services (IEC API, database pools, WebSocket)
- **Libraries:** `xlsx`, `exceljs`, `pg`, `bull` (queue), `multer` (file upload)

---

## 📅 Phase Overview

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **Phase 1** | Week 1-2 | Preparation & Analysis | Architecture docs, technical spec, dev environment |
| **Phase 2** | Week 3-5 | Core Services | 7 TypeScript services implemented |
| **Phase 3** | Week 6-7 | Integration | API endpoints, WebSocket, queue, file monitoring |
| **Phase 4** | Week 8-9 | Testing & Validation | Unit tests, integration tests, performance benchmarks |
| **Phase 5** | Week 10-12 | Rollout | Gradual rollout with feature flags (10% → 100%) |
| **Phase 6** | Week 13-14 | Deprecation | Python deprecation, documentation, cleanup |

---

## 🔧 Technical Requirements

### Core Features to Migrate
- ✅ **SA ID Validation** - Luhn checksum algorithm
- ✅ **Duplicate Detection** - Within file and against database
- ✅ **IEC Verification** - Batch processing (5 records/batch), rate limiting
- ✅ **VD Code Mapping** - 222222222 (registered, no VD), 999999999 (non-registered)
- ✅ **Expiry Date Calculation** - Last Payment + 24 months
- ✅ **Metro-to-Subregion Mapping** - Municipality code conversion
- ✅ **Database Operations** - Insert/update with transaction handling
- ✅ **Excel Report Generation** - 7 sheets with styling and color coding
- ✅ **WebSocket Communication** - Real-time progress updates
- ✅ **Column Normalization** - Handle "Name" vs "Firstname" variations

### Performance Targets
- **Processing Speed:** 500 records in <60 seconds
- **Concurrent Uploads:** Support 5+ simultaneous uploads
- **Memory Usage:** <500MB per upload job
- **Database Connections:** Efficient pool usage (<10 connections)
- **Error Rate:** <1% after full rollout

### Data Accuracy Requirements
- **Zero Data Loss** - All records processed or logged
- **100% ID Validation Accuracy** - Luhn algorithm correctness
- **IEC Verification Accuracy** - Match Python processor results
- **Date Calculation Accuracy** - Correct expiry date calculation
- **Report Accuracy** - All 7 sheets match Python output

---

## 🏗️ Service Architecture

### New TypeScript Services

```
src/services/bulk-upload/
├── idValidationService.ts          # SA ID validation (Luhn)
├── preValidationService.ts         # Validation orchestration
├── fileReaderService.ts            # Excel file reading
├── iecVerificationService.ts       # IEC API integration (adapt existing)
├── databaseOperationsService.ts    # Insert/update members
├── excelReportService.ts           # 7-sheet report generation
├── bulkUploadOrchestrator.ts       # Main coordinator
├── bulkUploadWebSocketService.ts   # Real-time updates
├── processingQueueService.ts       # Job queue (Bull + Redis)
├── fileMonitoringService.ts        # Auto-process uploads
├── reportStorageService.ts         # Report management
├── bulkUploadLogger.ts             # Audit trail
└── parallelProcessorService.ts     # Python/Node.js routing
```

### API Endpoints

```
POST   /api/bulk-upload/process        # Initiate processing
GET    /api/bulk-upload/status/:jobId  # Check progress
GET    /api/bulk-upload/report/:jobId  # Download report
POST   /api/bulk-upload/cancel/:jobId  # Cancel job
GET    /api/bulk-upload/history        # Job history
```

---

## 🧪 Testing Strategy

### 1. Unit Tests (Week 8)
- **Coverage Target:** >80%
- **Focus:** Individual service logic
- **Tools:** Jest, ts-jest
- **Test Cases:** 
  - ID validation (valid/invalid IDs, edge cases)
  - Date parsing (Excel serial dates, various formats)
  - Duplicate detection (within file, database)
  - Report generation (all 7 sheets)

### 2. Integration Tests (Week 8)
- **Focus:** Service interactions
- **Test Database:** Separate test PostgreSQL instance
- **Mock Services:** IEC API mock server
- **Test Cases:**
  - End-to-end file processing
  - Database transactions
  - WebSocket communication
  - Queue processing

### 3. Comparison Testing (Week 9)
- **Method:** Process same files with Python and Node.js
- **Compare:**
  - Validation results (invalid IDs, duplicates)
  - IEC verification results
  - Database operations (inserts/updates)
  - Excel reports (cell-by-cell)
- **Acceptance:** <0.1% discrepancy rate

### 4. Performance Testing (Week 9)
- **Test Sizes:** 100, 500, 1000, 5000 records
- **Metrics:**
  - File reading time
  - Validation time
  - IEC verification time
  - Database operations time
  - Report generation time
  - Total processing time
- **Baseline:** Compare with Python processor

### 5. Load Testing (Week 9)
- **Tools:** Artillery, k6
- **Scenarios:**
  - 5 concurrent uploads
  - 10 concurrent uploads
  - Large files (10,000+ records)
- **Monitor:** CPU, memory, database connections, queue depth

---

## 🚀 Rollout Strategy

### Feature Flag Configuration

```typescript
// Environment variables
BULK_UPLOAD_PROCESSOR_TYPE: 'python' | 'nodejs' | 'both'
BULK_UPLOAD_NODEJS_PERCENTAGE: 0-100
BULK_UPLOAD_COMPARISON_MODE: true | false
```

### Rollout Phases

| Phase | Traffic | Duration | Comparison Mode | Rollback Criteria |
|-------|---------|----------|-----------------|-------------------|
| **Phase 1** | 10% | 1 week | ✅ Enabled | >5% error rate increase |
| **Phase 2** | 25% | 1 week | ✅ Enabled | >3% error rate increase |
| **Phase 3** | 50% | 1 week | ✅ Enabled | >2% error rate increase |
| **Phase 4** | 100% | 2 weeks | ❌ Disabled | >1% error rate increase |

### Monitoring Metrics

**Success Metrics:**
- Processing success rate: >99%
- Average processing time: <60s for 500 records
- Error rate: <1%
- Data accuracy: 100% (zero data loss)
- User satisfaction: >90%

**Alert Thresholds:**
- Error rate >2% (warning), >5% (critical)
- Processing time >90s for 500 records (warning)
- Queue depth >10 jobs (warning), >20 jobs (critical)
- Database connection pool >80% (warning)
- Memory usage >1GB per job (warning)

---

## 🔄 Parallel Operation Strategy

### Comparison Mode (Phases 1-3)

```typescript
// Pseudo-code for parallel processing
async function processUpload(file: File, userId: string) {
  const percentage = getFeatureFlagPercentage();
  const useNodeJS = Math.random() * 100 < percentage;

  if (comparisonMode) {
    // Run both processors
    const [pythonResult, nodejsResult] = await Promise.all([
      processPython(file),
      processNodeJS(file)
    ]);

    // Compare results
    const discrepancies = compareResults(pythonResult, nodejsResult);
    if (discrepancies.length > 0) {
      logDiscrepancies(discrepancies);
      alertTeam(discrepancies);
    }

    // Return Python result (safe fallback)
    return pythonResult;
  } else {
    // Use selected processor
    return useNodeJS ? processNodeJS(file) : processPython(file);
  }
}
```

### Fallback Strategy

1. **Automatic Fallback:** If Node.js processor fails, automatically use Python
2. **Manual Override:** Admin can force Python processor for specific uploads
3. **Emergency Rollback:** Feature flag can be set to 0% instantly
4. **Gradual Rollback:** Reduce percentage gradually if issues detected

---

## ⚠️ Risk Mitigation

### Risk 1: Data Loss or Corruption
**Mitigation:**
- Comprehensive comparison testing before rollout
- Transaction-based database operations with rollback
- Audit trail for all operations
- Backup Python processor on standby

### Risk 2: Performance Degradation
**Mitigation:**
- Performance benchmarking before rollout
- Load testing with production-like data
- Monitoring and alerting on performance metrics
- Gradual rollout to detect issues early

### Risk 3: IEC API Integration Issues
**Mitigation:**
- Reuse existing iecApiService.ts (proven)
- Rate limiting and retry logic
- Mock server for testing
- Fallback to Python on API failures

### Risk 4: Excel Report Discrepancies
**Mitigation:**
- Cell-by-cell comparison testing
- Visual inspection of sample reports
- User acceptance testing
- Keep Python report generator as reference

### Risk 5: Database Connection Pool Exhaustion
**Mitigation:**
- Use existing database pool (proven)
- Connection limit monitoring
- Queue-based processing (limit concurrency)
- Load testing to find limits

### Risk 6: WebSocket Connection Issues
**Mitigation:**
- Reuse existing WebSocket infrastructure
- Connection timeout handling
- Graceful degradation (polling fallback)
- Integration testing

---

## 📊 Success Criteria

### Technical Success Criteria
- ✅ All unit tests passing (>80% coverage)
- ✅ All integration tests passing
- ✅ Comparison tests show <0.1% discrepancy
- ✅ Performance targets met (500 records in <60s)
- ✅ Load tests passed (5+ concurrent uploads)
- ✅ Zero data loss in production
- ✅ Error rate <1%

### Business Success Criteria
- ✅ User satisfaction >90%
- ✅ Processing time reduced by >20% (vs Python)
- ✅ System stability maintained
- ✅ No critical incidents during rollout
- ✅ Stakeholder sign-off obtained

### Operational Success Criteria
- ✅ Team trained on new system
- ✅ Documentation complete and up-to-date
- ✅ Monitoring and alerting operational
- ✅ Rollback procedures tested and documented
- ✅ Python processor successfully deprecated

---

## 🔙 Rollback Plan

### Immediate Rollback (Emergency)
**Trigger:** Critical data loss, system crash, >10% error rate

**Steps:**
1. Set `BULK_UPLOAD_NODEJS_PERCENTAGE=0` (immediate)
2. Restart affected services
3. Verify Python processor operational
4. Notify stakeholders
5. Investigate root cause
6. Fix issues before re-attempting

**Time to Rollback:** <5 minutes

### Gradual Rollback
**Trigger:** Elevated error rate (2-5%), performance degradation

**Steps:**
1. Reduce `BULK_UPLOAD_NODEJS_PERCENTAGE` by 50%
2. Monitor for 24 hours
3. If issues persist, reduce to 0%
4. Analyze logs and metrics
5. Fix issues and re-test
6. Resume gradual rollout

**Time to Rollback:** <1 hour

### Post-Rollback Actions
1. Root cause analysis
2. Fix identified issues
3. Additional testing
4. Team review and approval
5. Resume rollout with increased monitoring

---

## 📚 Documentation Requirements

### Technical Documentation
- [ ] Architecture diagrams (service interactions, data flow)
- [ ] API documentation (endpoints, request/response formats)
- [ ] Service documentation (each TypeScript service)
- [ ] Database schema documentation
- [ ] Configuration documentation (environment variables)
- [ ] Deployment documentation (setup, configuration)

### Operational Documentation
- [ ] User guide (how to use bulk upload)
- [ ] Admin guide (monitoring, troubleshooting)
- [ ] Runbook (common issues and resolutions)
- [ ] Rollback procedures (emergency and gradual)
- [ ] Monitoring dashboard guide
- [ ] Alert response procedures

### Migration Documentation
- [ ] Migration plan (this document)
- [ ] Comparison test results
- [ ] Performance benchmark results
- [ ] Lessons learned
- [ ] Post-migration review
- [ ] Python deprecation notes

---

## 👥 Team and Resources

### Required Roles
- **Backend Developer(s):** 2-3 developers for implementation
- **QA Engineer:** Testing and validation
- **DevOps Engineer:** Deployment, monitoring, infrastructure
- **Product Owner:** Requirements, acceptance criteria, sign-off
- **Stakeholders:** User acceptance testing, feedback

### Time Commitment
- **Backend Developers:** Full-time for 10 weeks, part-time for 4 weeks
- **QA Engineer:** Part-time for 6 weeks, full-time for 2 weeks
- **DevOps Engineer:** Part-time throughout (infrastructure, deployment)
- **Product Owner:** Part-time throughout (reviews, sign-offs)

### Infrastructure Requirements
- **Development Environment:** Local setup with PostgreSQL, Redis
- **Staging Environment:** Production-like environment for testing
- **Production Environment:** Existing infrastructure (no new servers)
- **Monitoring Tools:** Existing tools (Prometheus, Grafana, etc.)

---

## 📈 Timeline and Milestones

### Week 1-2: Preparation ✅
- **Milestone:** Technical specification approved
- **Deliverables:** Architecture docs, dev environment, migration checklist

### Week 3-5: Implementation 🔨
- **Milestone:** All core services implemented
- **Deliverables:** 7 TypeScript services, unit tests

### Week 6-7: Integration 🔗
- **Milestone:** Integrated with backend
- **Deliverables:** API endpoints, WebSocket, queue, file monitoring

### Week 8-9: Testing 🧪
- **Milestone:** All tests passing
- **Deliverables:** Test results, performance benchmarks, UAT sign-off

### Week 10: Rollout Phase 1-2 🚀
- **Milestone:** 25% traffic on Node.js
- **Deliverables:** Monitoring data, comparison results

### Week 11: Rollout Phase 3 📊
- **Milestone:** 50% traffic on Node.js
- **Deliverables:** Performance analysis, issue resolutions

### Week 12: Rollout Phase 4 🎯
- **Milestone:** 100% traffic on Node.js
- **Deliverables:** Full rollout complete, Python on standby

### Week 13-14: Deprecation 🗑️
- **Milestone:** Python processor deprecated
- **Deliverables:** Updated documentation, archived code, knowledge transfer

---

## ✅ Next Steps

1. **Review and Approve Plan** - Get stakeholder sign-off
2. **Allocate Resources** - Assign team members
3. **Set Up Project Tracking** - Create tickets/tasks in project management tool
4. **Begin Phase 1** - Start with Python codebase analysis
5. **Schedule Regular Check-ins** - Weekly progress reviews

---

## 📞 Contact and Support

**Project Lead:** [Name]
**Technical Lead:** [Name]
**QA Lead:** [Name]
**DevOps Lead:** [Name]

**Slack Channel:** #bulk-upload-migration
**Documentation:** [Link to project wiki]
**Issue Tracker:** [Link to Jira/GitHub Issues]

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Status:** Draft - Pending Approval


