/**
 * End-to-End Integration Tests for Bulk Upload Processing
 * 
 * These tests verify the complete flow:
 * 1. File upload via API
 * 2. Job queued in Bull
 * 3. Worker processes the job
 * 4. Database records created/updated
 * 5. Report generated
 * 6. WebSocket notifications sent
 */

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { Server } from 'socket.io';
import { io as ioClient, Socket } from 'socket.io-client';
import app from '../../backend/src/app';
import { getBulkUploadJobStatus } from '../../backend/src/services/bulk-upload/bulkUploadQueueService';

// Test configuration
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_ID = 'test-user-123';
let authToken: string;
let wsClient: Socket;
let testPool: Pool;

describe('E2E: Bulk Upload Processing', () => {
  
  beforeAll(async () => {
    // Setup test database connection
    testPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'eff_membership_test',
      user: 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });

    // Get auth token (mock or real login)
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_USER_EMAIL,
        password: 'test-password'
      });
    
    authToken = loginResponse.body.data.token;

    // Setup WebSocket client
    wsClient = ioClient('http://localhost:5000', {
      auth: { token: authToken }
    });

    await new Promise((resolve) => {
      wsClient.on('connect', resolve);
    });
  });

  afterAll(async () => {
    // Cleanup
    wsClient.disconnect();
    await testPool.end();
  });

  describe('Complete Processing Flow', () => {
    
    it('should process valid file end-to-end', async () => {
      const testFile = path.join(__dirname, 'test-data', 'valid-members-10.xlsx');
      
      // Step 1: Upload file
      const uploadResponse = await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile)
        .expect(200);

      expect(uploadResponse.body.success).toBe(true);
      const jobId = uploadResponse.body.data.jobId;
      expect(jobId).toBeDefined();

      // Step 2: Verify job is queued
      const jobStatus = await getBulkUploadJobStatus(jobId);
      expect(jobStatus).toBeDefined();
      expect(['waiting', 'active']).toContain(jobStatus?.state);

      // Step 3: Wait for processing to complete (with timeout)
      const maxWaitTime = 60000; // 60 seconds
      const startTime = Date.now();
      let finalStatus;

      while (Date.now() - startTime < maxWaitTime) {
        finalStatus = await getBulkUploadJobStatus(jobId);
        if (finalStatus?.state === 'completed' || finalStatus?.state === 'failed') {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }

      // Step 4: Verify job completed successfully
      expect(finalStatus?.state).toBe('completed');
      expect(finalStatus?.progress).toBe(100);

      // Step 5: Verify database records were created
      const dbResult = await testPool.query(
        'SELECT COUNT(*) as count FROM members WHERE created_at > NOW() - INTERVAL \'5 minutes\''
      );
      expect(parseInt(dbResult.rows[0].count)).toBeGreaterThan(0);

      // Step 6: Verify report was generated
      const reportResponse = await request(app)
        .get(`/api/v1/bulk-upload/jobs/${jobId}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(reportResponse.headers['content-type']).toContain('application/vnd.openxmlformats');

      // Step 7: Verify report metadata
      const metadataResponse = await request(app)
        .get(`/api/v1/bulk-upload/reports/${jobId}/metadata`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(metadataResponse.body.success).toBe(true);
      expect(metadataResponse.body.data.job_id).toBe(jobId);
      expect(metadataResponse.body.data.file_size_bytes).toBeGreaterThan(0);

    }, 90000); // 90 second timeout for this test

    it('should handle file with validation errors', async () => {
      const testFile = path.join(__dirname, 'test-data', 'mixed-validation-50.xlsx');
      
      // Upload file
      const uploadResponse = await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile)
        .expect(200);

      const jobId = uploadResponse.body.data.jobId;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

      // Verify job completed (even with errors)
      const finalStatus = await getBulkUploadJobStatus(jobId);
      expect(finalStatus?.state).toBe('completed');

      // Verify report contains error details
      const reportResponse = await request(app)
        .get(`/api/v1/bulk-upload/jobs/${jobId}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(reportResponse.headers['content-type']).toContain('application/vnd.openxmlformats');
      
    }, 60000);

  });

  describe('WebSocket Notifications', () => {
    
    it('should receive progress updates via WebSocket', async (done) => {
      const testFile = path.join(__dirname, 'test-data', 'valid-members-10.xlsx');
      
      const progressUpdates: number[] = [];

      // Listen for progress updates
      wsClient.on('bulk-upload:progress', (data) => {
        progressUpdates.push(data.progress);
        
        if (data.progress === 100) {
          expect(progressUpdates.length).toBeGreaterThan(0);
          expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
          done();
        }
      });

      // Upload file
      await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile)
        .expect(200);

    }, 60000);

  });

});

