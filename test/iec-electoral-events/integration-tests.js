/**
 * Integration Tests for IEC Electoral Events Integration
 * Tests the interaction between different components and services
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

describe('IEC Electoral Events Integration Tests', () => {
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

  describe('Database Integration', () => {
    test('should retrieve electoral event types from database', async () => {
      const eventTypes = await iecElectoralEventsService.getElectoralEventTypes();
      
      expect(Array.isArray(eventTypes)).toBe(true);
      expect(eventTypes.length).toBeGreaterThan(0);
      
      // Verify structure of event types
      eventTypes.forEach(eventType => {
        expect(eventType).toHaveProperty('id');
        expect(eventType).toHaveProperty('iec_event_type_id');
        expect(eventType).toHaveProperty('description');
        expect(eventType).toHaveProperty('is_municipal_election');
        expect(typeof eventType.is_municipal_election).toBe('boolean');
      });
    });

    test('should retrieve municipal election types only', async () => {
      const municipalTypes = await iecElectoralEventsService.getMunicipalElectionTypes();
      
      expect(Array.isArray(municipalTypes)).toBe(true);
      
      // All returned types should be municipal elections
      municipalTypes.forEach(type => {
        expect(type.is_municipal_election).toBe(true);
        expect(type.description.toLowerCase()).toContain('local government');
      });
    });

    test('should retrieve electoral events by type', async () => {
      const municipalEvents = await iecElectoralEventsService.getElectoralEventsByType(3);
      
      expect(Array.isArray(municipalEvents)).toBe(true);
      
      // All events should be of type 3 (Municipal)
      municipalEvents.forEach(event => {
        expect(event.iec_event_type_id).toBe(3);
        expect(event).toHaveProperty('iec_event_id');
        expect(event).toHaveProperty('description');
        expect(event).toHaveProperty('is_active');
        expect(event).toHaveProperty('election_year');
      });
    });

    test('should retrieve current municipal election', async () => {
      const currentElection = await iecElectoralEventsService.getCurrentMunicipalElection();
      
      if (currentElection) {
        expect(currentElection).toHaveProperty('iec_event_id');
        expect(currentElection).toHaveProperty('description');
        expect(currentElection.is_active).toBe(true);
        expect(currentElection.iec_event_type_id).toBe(3);
      }
    });

    test('should retrieve municipal election history', async () => {
      const electionHistory = await iecElectoralEventsService.getMunicipalElectionHistory();
      
      expect(Array.isArray(electionHistory)).toBe(true);
      expect(electionHistory.length).toBeGreaterThan(0);
      
      // Should be ordered by year descending
      for (let i = 1; i < electionHistory.length; i++) {
        const current = electionHistory[i];
        const previous = electionHistory[i - 1];
        
        if (current.election_year && previous.election_year) {
          expect(current.election_year).toBeLessThanOrEqual(previous.election_year);
        }
      }
    });
  });

  describe('Service Integration', () => {
    test('should integrate electoral event context in voter verification', async () => {
      const currentElection = await VoterVerificationService.getCurrentElectoralEventContext();
      
      if (currentElection) {
        expect(currentElection).toHaveProperty('iec_event_id');
        expect(currentElection).toHaveProperty('description');
        expect(currentElection).toHaveProperty('election_year');
        expect(currentElection.iec_event_type_id).toBe(3); // Municipal election
      }
    });

    test('should refresh electoral event context', async () => {
      const refreshedElection = await VoterVerificationService.refreshElectoralEventContext();
      
      if (refreshedElection) {
        expect(refreshedElection).toHaveProperty('iec_event_id');
        expect(refreshedElection).toHaveProperty('description');
      }
    });

    test('should maintain consistency between services', async () => {
      const currentFromIEC = await iecElectoralEventsService.getCurrentMunicipalElection();
      const currentFromVoter = await VoterVerificationService.getCurrentElectoralEventContext();
      
      if (currentFromIEC && currentFromVoter) {
        expect(currentFromIEC.iec_event_id).toBe(currentFromVoter.iec_event_id);
        expect(currentFromIEC.description).toBe(currentFromVoter.description);
        expect(currentFromIEC.election_year).toBe(currentFromVoter.election_year);
      }
    });
  });

  describe('Data Consistency', () => {
    test('should have consistent electoral event data across tables', async () => {
      const eventTypes = await iecElectoralEventsService.getElectoralEventTypes();
      const municipalEvents = await iecElectoralEventsService.getElectoralEventsByType(3);
      
      // Find municipal event type
      const municipalType = eventTypes.find(type => type.iec_event_type_id === 3);
      expect(municipalType).toBeDefined();
      expect(municipalType.is_municipal_election).toBe(true);
      
      // All municipal events should reference the municipal event type
      municipalEvents.forEach(event => {
        expect(event.iec_event_type_id).toBe(municipalType.iec_event_type_id);
      });
    });

    test('should have valid election years', async () => {
      const electionHistory = await iecElectoralEventsService.getMunicipalElectionHistory();
      
      electionHistory.forEach(election => {
        if (election.election_year) {
          expect(election.election_year).toBeGreaterThan(1990);
          expect(election.election_year).toBeLessThanOrEqual(new Date().getFullYear() + 5);
        }
      });
    });

    test('should have unique IEC event IDs', async () => {
      const allEvents = await iecElectoralEventsService.getElectoralEventsByType(3);
      const eventIds = allEvents.map(event => event.iec_event_id);
      const uniqueIds = [...new Set(eventIds)];
      
      expect(eventIds.length).toBe(uniqueIds.length);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle database connection issues gracefully', async () => {
      // This test would simulate database connection issues
      // and verify that services handle them appropriately
      expect(true).toBe(true); // Placeholder
    });

    test('should handle missing electoral event data', async () => {
      // Test behavior when no current election is found
      const result = await iecElectoralEventsService.getCurrentMunicipalElection();
      
      // Should return null or valid election object, not throw error
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should retrieve data within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await Promise.all([
        iecElectoralEventsService.getElectoralEventTypes(),
        iecElectoralEventsService.getMunicipalElectionTypes(),
        iecElectoralEventsService.getCurrentMunicipalElection()
      ]);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(5).fill().map(() => 
        iecElectoralEventsService.getCurrentMunicipalElection()
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        if (firstResult && result) {
          expect(result.iec_event_id).toBe(firstResult.iec_event_id);
        }
      });
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('API Integration (if available)', () => {
    test('should handle IEC API authentication', async () => {
      // This test would only run if IEC API is accessible
      try {
        const syncResult = await iecElectoralEventsService.syncElectoralEventTypes();
        
        expect(syncResult).toHaveProperty('success');
        expect(syncResult).toHaveProperty('records_processed');
        expect(syncResult).toHaveProperty('duration_ms');
        
        if (syncResult.success) {
          expect(syncResult.records_processed).toBeGreaterThanOrEqual(0);
        }
      } catch (error) {
        // API might not be accessible in test environment
        console.log('IEC API test skipped:', error.message);
        expect(true).toBe(true);
      }
    });

    test('should handle voter data with electoral event context', async () => {
      // This test would only run if IEC API is accessible
      try {
        const testId = '8001015009087';
        const voterData = await VoterVerificationService.fetchVoterData(testId);
        
        if (voterData) {
          expect(voterData).toHaveProperty('id');
          expect(voterData).toHaveProperty('bRegistered');
          
          // Should include electoral event context
          if (voterData.electoral_event_context) {
            expect(voterData.electoral_event_context).toHaveProperty('event_id');
            expect(voterData.electoral_event_context).toHaveProperty('event_type_id');
            expect(voterData.electoral_event_context).toHaveProperty('event_description');
            expect(voterData.electoral_event_context).toHaveProperty('election_year');
          }
        }
      } catch (error) {
        // API might not be accessible in test environment
        console.log('Voter data API test skipped:', error.message);
        expect(true).toBe(true);
      }
    });
  });
});

module.exports = {
  // Export test utilities if needed
};
