/**
 * Performance Tests for IEC Electoral Events Integration
 * Tests performance, load handling, and scalability aspects
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

describe('IEC Electoral Events Performance Tests', () => {
  let iecElectoralEventsService;
  let VoterVerificationService;
  let initializeDatabase;

  beforeAll(async () => {
    // Initialize database connection
    const { initializeDatabase: initDb } = require('../../backend/dist/config/database');
    initializeDatabase = initDb;
    await initializeDatabase();

    // Import services
    const { iecElectoralEventsService: iecService } = require('../../backend/dist/services/iecElectoralEventsService');
    const { VoterVerificationService: voterService } = require('../../backend/dist/services/voterVerificationService');
    
    iecElectoralEventsService = iecService;
    VoterVerificationService = voterService;
  });

  describe('Database Query Performance', () => {
    test('getElectoralEventTypes should complete within acceptable time', async () => {
      const startTime = Date.now();
      
      const result = await iecElectoralEventsService.getElectoralEventTypes();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(result)).toBe(true);
    });

    test('getMunicipalElectionTypes should be optimized', async () => {
      const startTime = Date.now();
      
      const result = await iecElectoralEventsService.getMunicipalElectionTypes();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(result)).toBe(true);
    });

    test('getCurrentMunicipalElection should be fast', async () => {
      const startTime = Date.now();
      
      const result = await iecElectoralEventsService.getCurrentMunicipalElection();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 0.5 seconds
    });

    test('getElectoralEventsByType should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      const result = await iecElectoralEventsService.getElectoralEventsByType(3);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1500); // Should complete within 1.5 seconds
      expect(Array.isArray(result)).toBe(true);
    });

    test('getMunicipalElectionHistory should be optimized for sorting', async () => {
      const startTime = Date.now();
      
      const result = await iecElectoralEventsService.getMunicipalElectionHistory();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple concurrent getElectoralEventTypes requests', async () => {
      const startTime = Date.now();
      const concurrentRequests = 10;
      
      const promises = Array(concurrentRequests).fill().map(() =>
        iecElectoralEventsService.getElectoralEventTypes()
      );
      
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      
      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.length).toBe(firstResult.length);
      });
    });

    test('should handle mixed concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        iecElectoralEventsService.getElectoralEventTypes(),
        iecElectoralEventsService.getMunicipalElectionTypes(),
        iecElectoralEventsService.getCurrentMunicipalElection(),
        iecElectoralEventsService.getElectoralEventsByType(3),
        iecElectoralEventsService.getMunicipalElectionHistory()
      ];
      
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all results are valid
      expect(Array.isArray(results[0])).toBe(true); // getElectoralEventTypes
      expect(Array.isArray(results[1])).toBe(true); // getMunicipalElectionTypes
      // results[2] can be null or object (getCurrentMunicipalElection)
      expect(Array.isArray(results[3])).toBe(true); // getElectoralEventsByType
      expect(Array.isArray(results[4])).toBe(true); // getMunicipalElectionHistory
    });

    test('should handle voter verification with electoral context concurrently', async () => {
      const startTime = Date.now();
      const concurrentRequests = 5;
      
      const promises = Array(concurrentRequests).fill().map(() =>
        VoterVerificationService.getCurrentElectoralEventContext()
      );
      
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      
      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        if (firstResult && result) {
          expect(result.iec_event_id).toBe(firstResult.iec_event_id);
        }
      });
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should not cause memory leaks with repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many requests
      for (let i = 0; i < 50; i++) {
        await iecElectoralEventsService.getElectoralEventTypes();
        await iecElectoralEventsService.getCurrentMunicipalElection();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      // Get all electoral events (potentially large dataset)
      const allEvents = await iecElectoralEventsService.getElectoralEventsByType(3);
      
      const duration = Date.now() - startTime;
      const memoryUsage = process.memoryUsage().heapUsed;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(Array.isArray(allEvents)).toBe(true);
      
      // Memory usage should be reasonable
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Caching Performance', () => {
    test('should benefit from caching on repeated requests', async () => {
      // First request (cache miss)
      const startTime1 = Date.now();
      const result1 = await VoterVerificationService.getCurrentElectoralEventContext();
      const duration1 = Date.now() - startTime1;
      
      // Second request (should be cached)
      const startTime2 = Date.now();
      const result2 = await VoterVerificationService.getCurrentElectoralEventContext();
      const duration2 = Date.now() - startTime2;
      
      // Second request should be faster (cached)
      expect(duration2).toBeLessThanOrEqual(duration1);
      
      // Results should be identical
      if (result1 && result2) {
        expect(result1.iec_event_id).toBe(result2.iec_event_id);
        expect(result1.description).toBe(result2.description);
      }
    });

    test('should refresh cache efficiently', async () => {
      const startTime = Date.now();
      
      const refreshedResult = await VoterVerificationService.refreshElectoralEventContext();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Database Connection Pool Performance', () => {
    test('should handle connection pool efficiently under load', async () => {
      const startTime = Date.now();
      const concurrentRequests = 20;
      
      // Create many concurrent database requests
      const promises = Array(concurrentRequests).fill().map((_, index) => {
        if (index % 4 === 0) return iecElectoralEventsService.getElectoralEventTypes();
        if (index % 4 === 1) return iecElectoralEventsService.getMunicipalElectionTypes();
        if (index % 4 === 2) return iecElectoralEventsService.getCurrentMunicipalElection();
        return iecElectoralEventsService.getElectoralEventsByType(3);
      });
      
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // All requests should succeed
      results.forEach((result, index) => {
        if (index % 4 !== 2) { // Skip getCurrentMunicipalElection which can be null
          expect(Array.isArray(result)).toBe(true);
        }
      });
    });
  });

  describe('API Response Time Performance', () => {
    test('should maintain performance under simulated load', async () => {
      const iterations = 10;
      const durations = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await Promise.all([
          iecElectoralEventsService.getElectoralEventTypes(),
          iecElectoralEventsService.getCurrentMunicipalElection(),
          VoterVerificationService.getCurrentElectoralEventContext()
        ]);
        
        const duration = Date.now() - startTime;
        durations.push(duration);
      }
      
      // Calculate average response time
      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      expect(averageDuration).toBeLessThan(2000); // Average should be under 2 seconds
      expect(maxDuration).toBeLessThan(5000); // Max should be under 5 seconds
      
      // Performance should be consistent (standard deviation check)
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / durations.length;
      const standardDeviation = Math.sqrt(variance);
      
      expect(standardDeviation).toBeLessThan(averageDuration * 0.5); // SD should be less than 50% of average
    });
  });

  describe('Scalability Tests', () => {
    test('should scale linearly with request volume', async () => {
      const testSizes = [1, 5, 10];
      const results = [];
      
      for (const size of testSizes) {
        const startTime = Date.now();
        
        const promises = Array(size).fill().map(() =>
          iecElectoralEventsService.getCurrentMunicipalElection()
        );
        
        await Promise.all(promises);
        
        const duration = Date.now() - startTime;
        results.push({ size, duration });
      }
      
      // Performance should scale reasonably
      const ratio1to5 = results[1].duration / results[0].duration;
      const ratio5to10 = results[2].duration / results[1].duration;
      
      // Ratios should be reasonable (not exponential growth)
      expect(ratio1to5).toBeLessThan(10);
      expect(ratio5to10).toBeLessThan(5);
    });
  });
});

module.exports = {
  // Export performance test utilities if needed
};
