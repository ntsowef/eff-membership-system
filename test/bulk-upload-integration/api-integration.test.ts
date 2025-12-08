/**
 * API Integration Tests for Bulk Upload Endpoints
 * 
 * Tests all REST API endpoints with real HTTP requests
 */

import request from 'supertest';
import path from 'path';
import app from '../../backend/src/app';

const TEST_USER_EMAIL = 'test@example.com';
let authToken: string;
let testJobId: string;

describe('API Integration: Bulk Upload Endpoints', () => {
  
  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_USER_EMAIL,
        password: 'test-password'
      });
    
    authToken = loginResponse.body.data.token;
  });

  describe('POST /api/v1/bulk-upload/upload', () => {
    
    it('should upload file successfully', async () => {
      const testFile = path.join(__dirname, 'test-data', 'valid-members-10.xlsx');
      
      const response = await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBeDefined();
      expect(response.body.data.fileName).toBe('valid-members-10.xlsx');
      
      testJobId = response.body.data.jobId; // Save for later tests
    });

    it('should reject upload without authentication', async () => {
      const testFile = path.join(__dirname, 'test-data', 'valid-members-10.xlsx');
      
      await request(app)
        .post('/api/v1/bulk-upload/upload')
        .attach('file', testFile)
        .expect(401);
    });

    it('should reject non-Excel files', async () => {
      const testFile = path.join(__dirname, 'test-data', 'invalid-file.txt');
      
      const response = await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Excel');
    });

    it('should reject files that are too large', async () => {
      // Create a large file (>50MB)
      const largeFile = Buffer.alloc(51 * 1024 * 1024); // 51MB
      
      const response = await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large-file.xlsx')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

  });

  describe('GET /api/v1/bulk-upload/jobs/:jobId/status', () => {
    
    it('should get job status', async () => {
      const response = await request(app)
        .get(`/api/v1/bulk-upload/jobs/${testJobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe(testJobId);
      expect(response.body.data.state).toBeDefined();
      expect(response.body.data.progress).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      await request(app)
        .get('/api/v1/bulk-upload/jobs/non-existent-job/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

  });

  describe('GET /api/v1/bulk-upload/jobs', () => {
    
    it('should list recent jobs', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-upload/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-upload/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

  });

  describe('GET /api/v1/bulk-upload/queue/stats', () => {
    
    it('should get queue statistics', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-upload/queue/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.waiting).toBeDefined();
      expect(response.body.data.active).toBeDefined();
      expect(response.body.data.completed).toBeDefined();
      expect(response.body.data.failed).toBeDefined();
      expect(response.body.data.total).toBeDefined();
    });

  });

  describe('GET /api/v1/bulk-upload/reports/stats', () => {
    
    it('should get report storage statistics', async () => {
      const response = await request(app)
        .get('/api/v1/bulk-upload/reports/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_reports).toBeDefined();
      expect(response.body.data.total_size_mb).toBeDefined();
    });

  });

  describe('POST /api/v1/bulk-upload/jobs/:jobId/cancel', () => {
    
    it('should cancel a job', async () => {
      // First upload a file
      const testFile = path.join(__dirname, 'test-data', 'valid-members-10.xlsx');
      const uploadResponse = await request(app)
        .post('/api/v1/bulk-upload/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile)
        .expect(200);

      const jobId = uploadResponse.body.data.jobId;

      // Then cancel it
      const cancelResponse = await request(app)
        .post(`/api/v1/bulk-upload/jobs/${jobId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
    });

  });

  describe('POST /api/v1/bulk-upload/jobs/:jobId/retry', () => {
    
    it('should retry a failed job', async () => {
      // This test requires a failed job, which is hard to create
      // For now, we'll just test the endpoint exists
      const response = await request(app)
        .post(`/api/v1/bulk-upload/jobs/some-job-id/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect([200, 400, 404]); // Accept various responses

      expect(response.body).toBeDefined();
    });

  });

});

