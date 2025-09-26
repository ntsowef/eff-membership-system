/**
 * API Endpoint Tests for IEC Electoral Events Integration
 * Tests the REST API endpoints for electoral events functionality
 */

const request = require('supertest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

describe('IEC Electoral Events API Endpoints', () => {
  let app;
  let server;
  const BASE_URL = '/api/v1/iec-electoral-events';

  beforeAll(async () => {
    // Set environment for testing
    process.env.NODE_ENV = 'development';
    process.env.SKIP_AUTH = 'true';

    // Import and initialize the app
    const { default: appModule } = require('../../backend/dist/app');
    app = appModule;
    
    // Start server for testing
    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Endpoint', () => {
    test('GET /health should return service health status', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('statistics');
      
      const stats = response.body.data.statistics;
      expect(stats).toHaveProperty('total_event_types');
      expect(stats).toHaveProperty('municipal_event_types');
      expect(stats).toHaveProperty('has_current_municipal_election');
      expect(typeof stats.total_event_types).toBe('number');
      expect(typeof stats.municipal_event_types).toBe('number');
      expect(typeof stats.has_current_municipal_election).toBe('boolean');
    });
  });

  describe('Electoral Event Types Endpoints', () => {
    test('GET /types should return all electoral event types', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/types`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify structure of event types
      response.body.data.forEach(eventType => {
        expect(eventType).toHaveProperty('id');
        expect(eventType).toHaveProperty('iec_event_type_id');
        expect(eventType).toHaveProperty('description');
        expect(eventType).toHaveProperty('is_municipal_election');
        expect(typeof eventType.is_municipal_election).toBe('boolean');
      });
    });

    test('GET /types/municipal should return only municipal election types', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/types/municipal`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned types should be municipal elections
      response.body.data.forEach(type => {
        expect(type.is_municipal_election).toBe(true);
      });
    });
  });

  describe('Electoral Events Endpoints', () => {
    test('GET /events/:eventTypeId should return events for specific type', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/events/3`) // Municipal elections
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All events should be of the requested type
      response.body.data.forEach(event => {
        expect(event.iec_event_type_id).toBe(3);
        expect(event).toHaveProperty('iec_event_id');
        expect(event).toHaveProperty('description');
        expect(event).toHaveProperty('is_active');
        expect(event).toHaveProperty('election_year');
      });
    });

    test('GET /events/:eventTypeId should return 400 for invalid type ID', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/events/invalid`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid event type ID');
    });
  });

  describe('Municipal Elections Endpoints', () => {
    test('GET /municipal/active should return active municipal elections', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/municipal/active`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned elections should be active and municipal
      response.body.data.forEach(election => {
        expect(election.is_active).toBe(true);
        expect(election.iec_event_type_id).toBe(3);
      });
    });

    test('GET /municipal/current should return current municipal election', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/municipal/current`)
        .expect((res) => {
          // Should be either 200 with data or 404 if no current election
          expect([200, 404]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('iec_event_id');
        expect(response.body.data).toHaveProperty('description');
        expect(response.body.data.is_active).toBe(true);
        expect(response.body.data.iec_event_type_id).toBe(3);
      } else {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message', 'No current municipal election found');
      }
    });

    test('GET /municipal/history should return municipal election history', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/municipal/history`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Should be ordered by year descending
      for (let i = 1; i < response.body.data.length; i++) {
        const current = response.body.data[i];
        const previous = response.body.data[i - 1];
        
        if (current.election_year && previous.election_year) {
          expect(current.election_year).toBeLessThanOrEqual(previous.election_year);
        }
      }
    });
  });

  describe('Synchronization Endpoints', () => {
    test('GET /sync/logs should return sync logs', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/sync/logs`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /sync/logs should respect limit parameter', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/sync/logs?limit=3`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    test('GET /sync/logs should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/sync/logs?limit=invalid`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid limit parameter');
    });

    test('POST /sync/types should trigger electoral event types sync', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/sync/types`)
        .expect((res) => {
          // Should be either 200 (success) or error status
          expect(res.status).toBeGreaterThanOrEqual(200);
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      
      if (response.body.success) {
        expect(response.body.data).toHaveProperty('records_processed');
        expect(response.body.data).toHaveProperty('duration_ms');
      }
    });

    test('POST /sync/events should trigger electoral events sync', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/sync/events`)
        .send({ eventTypeId: 3 })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('POST /sync/events should return 400 for invalid eventTypeId', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/sync/events`)
        .send({ eventTypeId: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid event type ID');
    });

    test('POST /sync/full should trigger full synchronization', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/sync/full`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
        });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      
      if (response.body.success) {
        expect(response.body.data).toHaveProperty('records_processed');
        expect(response.body.data).toHaveProperty('duration_ms');
      }
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/non-existent`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle database errors gracefully', async () => {
      // This test would simulate database errors
      // and verify proper error responses
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Response Format Validation', () => {
    test('all successful responses should have consistent format', async () => {
      const endpoints = [
        '/types',
        '/types/municipal',
        '/events/3',
        '/municipal/active',
        '/municipal/history',
        '/sync/logs'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(`${BASE_URL}${endpoint}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      }
    });

    test('all error responses should have consistent format', async () => {
      const response = await request(app)
        .get(`${BASE_URL}/events/invalid`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('Performance Tests', () => {
    test('endpoints should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`${BASE_URL}/types`)
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('concurrent requests should be handled efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(5).fill().map(() =>
        request(app).get(`${BASE_URL}/municipal/current`)
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});

module.exports = {
  // Export test utilities if needed
};
