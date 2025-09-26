import request from 'supertest';
import { app } from '../../src/app';
import { executeQuery } from '../../src/config/database';

describe('Performance Load Tests', () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // Setup test user and get auth token
    const userData = {
      email: 'loadtest@example.com',
      password: 'LoadTest123!',
      firstname: 'Load',
      surname: 'Test',
      phone: '+1234567890'
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    authToken = response.body.data.token;
    testUserId = response.body.data.user_id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await executeQuery('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  describe('API Response Times', () => {
    it('should handle authentication requests within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'loadtest@example.com',
          password: 'LoadTest123!'
        });

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle member list requests within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/members?limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle analytics dashboard within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    it('should handle search requests within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/search/members?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1500); // Should respond within 1.5 seconds
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent authentication requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'loadtest@example.com',
              password: 'LoadTest123!'
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(2000);
    });

    it('should handle multiple concurrent member queries', async () => {
      const concurrentRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/members?limit=10')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Memory Usage', () => {
    it('should not have significant memory leaks during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/v1/health')
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex analytics queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/analytics/comprehensive')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Complex queries within 5 seconds
    });

    it('should handle paginated queries efficiently', async () => {
      const promises = [];
      
      // Test multiple pages
      for (let page = 1; page <= 5; page++) {
        promises.push(
          request(app)
            .get(`/api/v1/members?page=${page}&limit=50`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // All paginated queries should complete within reasonable time
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting efficiently', async () => {
      const requests = [];
      
      // Make requests up to the rate limit
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .get('/api/v1/health')
            .expect(200)
        );
      }

      const startTime = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Rate limiting should not significantly impact performance
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Cache Performance', () => {
    it('should show improved performance with caching', async () => {
      // First request (cache miss)
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);
      const time1 = Date.now() - startTime1;

      expect(response1.status).toBe(200);

      // Second request (cache hit)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);
      const time2 = Date.now() - startTime2;

      expect(response2.status).toBe(200);

      // Cached request should be faster (allowing for some variance)
      expect(time2).toBeLessThan(time1 * 0.8);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      // Create test members for bulk operations
      const memberIds = [];
      for (let i = 0; i < 10; i++) {
        const memberData = {
          firstname: `BulkTest${i}`,
          surname: 'User',
          email: `bulktest${i}@example.com`,
          phone: `+123456789${i}`,
          date_of_birth: '1990-01-01',
          gender: 'Male',
          hierarchy_level: 'Ward',
          entity_id: 1,
          membership_type: 'Regular'
        };

        const response = await request(app)
          .post('/api/v1/members')
          .set('Authorization', `Bearer ${authToken}`)
          .send(memberData);

        if (response.status === 201) {
          memberIds.push(response.body.data.member_id);
        }
      }

      if (memberIds.length > 0) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/v1/bulk-operations/members/update')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            member_ids: memberIds,
            update_data: {
              membership_status: 'Active'
            },
            reason: 'Performance test bulk update'
          });

        const responseTime = Date.now() - startTime;

        expect(response.status).toBe(202);
        expect(responseTime).toBeLessThan(3000); // Bulk operations within 3 seconds

        // Cleanup test members
        for (const memberId of memberIds) {
          await executeQuery('DELETE FROM members WHERE member_id = ?', [memberId]);
        }
      }
    });
  });

  describe('Security Performance', () => {
    it('should handle security checks efficiently', async () => {
      const startTime = Date.now();
      
      // Test multiple security-sensitive endpoints
      const promises = [
        request(app)
          .get('/api/v1/security/settings')
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get('/api/v1/security/events')
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get('/api/v1/security/sessions')
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Security checks should not significantly impact performance
      expect(totalTime).toBeLessThan(2000);
    });
  });
});
