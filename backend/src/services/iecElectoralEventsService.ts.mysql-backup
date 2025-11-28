import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// IEC Electoral Event Types
export interface IECElectoralEventType {
  ID: number;
  Description: string;
}

export interface IECElectoralEvent {
  ID: number;
  Description: string;
  IsActive: boolean;
}

export interface ElectoralEventType {
  id: number;
  iec_event_type_id: number;
  description: string;
  is_municipal_election: boolean;
  created_at: string;
  updated_at: string;
}

export interface ElectoralEvent {
  id: number;
  iec_event_id: number;
  iec_event_type_id: number;
  description: string;
  is_active: boolean;
  election_year: number | null;
  election_date: string | null;
  last_synced_at: string | null;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  success: boolean;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  duration_ms: number;
}

class IECElectoralEventsService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.iec.apiUrl,
      timeout: config.iec.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get access token for IEC API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${config.iec.apiUrl}/token`, new URLSearchParams({
        grant_type: 'password',
        username: config.iec.username,
        password: config.iec.password
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: config.iec.timeout
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes
        return this.accessToken as string;
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('Failed to get IEC API access token:', error);
      throw createDatabaseError('Failed to authenticate with IEC API', error);
    }
  }

  /**
   * Make authenticated API call to IEC
   */
  private async makeApiCall<T>(endpoint: string): Promise<T> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await this.client.get<T>(endpoint, {
        headers: {
          'Authorization': `bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error(`IEC API call failed for ${endpoint}:`, error);
      throw createDatabaseError(`Failed to fetch data from IEC API: ${endpoint}`, error);
    }
  }

  /**
   * Fetch electoral event types from IEC API
   */
  async fetchElectoralEventTypes(): Promise<IECElectoralEventType[]> {
    return this.makeApiCall<IECElectoralEventType[]>('api/v1/ElectoralEvent');
  }

  /**
   * Fetch electoral events for a specific type from IEC API
   */
  async fetchElectoralEvents(eventTypeId: number): Promise<IECElectoralEvent[]> {
    return this.makeApiCall<IECElectoralEvent[]>(`api/v1/ElectoralEvent?ElectoralEventTypeID=${eventTypeId}`);
  }

  /**
   * Sync electoral event types from IEC API to database
   */
  async syncElectoralEventTypes(): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    let errorMessage: string | undefined;

    try {
      console.log('🔄 Syncing electoral event types from IEC API...');
      
      const iecEventTypes = await this.fetchElectoralEventTypes();
      recordsProcessed = iecEventTypes.length;

      for (const iecEventType of iecEventTypes) {
        try {
          const isMunicipalElection = iecEventType.Description.toLowerCase().includes('local government');
          
          const [result] = await executeQuery(`
            INSERT INTO iec_electoral_event_types (iec_event_type_id, description, is_municipal_election)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              description = VALUES(description),
              is_municipal_election = VALUES(is_municipal_election),
              updated_at = CURRENT_TIMESTAMP
          `, [iecEventType.ID, iecEventType.Description, isMunicipalElection]);

          if ((result as any).insertId > 0) {
            recordsCreated++;
          } else {
            recordsUpdated++;
          }
        } catch (error) {
          console.error(`Failed to sync event type ${iecEventType.ID}:`, error);
          recordsFailed++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Synced ${recordsProcessed} electoral event types in ${duration}ms`);

      return {
        success: true,
        records_processed: recordsProcessed,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: recordsFailed,
        duration_ms: duration
      };

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to sync electoral event types:', errorMessage);
      
      return {
        success: false,
        records_processed: recordsProcessed,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: recordsFailed,
        error_message: errorMessage,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Sync electoral events from IEC API to database
   */
  async syncElectoralEvents(eventTypeId?: number): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    let errorMessage: string | undefined;

    try {
      console.log(`🔄 Syncing electoral events from IEC API${eventTypeId ? ` for type ${eventTypeId}` : ''}...`);
      
      // Get event types to sync
      const eventTypesToSync = eventTypeId ? [eventTypeId] : [1, 2, 3, 4]; // All known types
      
      for (const typeId of eventTypesToSync) {
        try {
          const iecEvents = await this.fetchElectoralEvents(typeId);
          recordsProcessed += iecEvents.length;

          for (const iecEvent of iecEvents) {
            try {
              // Extract year from description
              const yearMatch = iecEvent.Description.match(/(\d{4})/);
              const electionYear = yearMatch ? parseInt(yearMatch[1]) : null;

              const [result] = await executeQuery(`
                INSERT INTO iec_electoral_events (
                  iec_event_id, iec_event_type_id, description, is_active, 
                  election_year, last_synced_at, sync_status
                )
                VALUES (?, ?, ?, ?, ?, NOW(), 'completed')
                ON DUPLICATE KEY UPDATE 
                  description = VALUES(description),
                  is_active = VALUES(is_active),
                  election_year = VALUES(election_year),
                  last_synced_at = NOW(),
                  sync_status = 'completed',
                  updated_at = CURRENT_TIMESTAMP
              `, [iecEvent.ID, typeId, iecEvent.Description, iecEvent.IsActive, electionYear]);

              if ((result as any).insertId > 0) {
                recordsCreated++;
              } else {
                recordsUpdated++;
              }
            } catch (error) {
              console.error(`Failed to sync event ${iecEvent.ID}:`, error);
              recordsFailed++;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch events for type ${typeId}:`, error);
          recordsFailed++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Synced ${recordsProcessed} electoral events in ${duration}ms`);

      return {
        success: true,
        records_processed: recordsProcessed,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: recordsFailed,
        duration_ms: duration
      };

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to sync electoral events:', errorMessage);
      
      return {
        success: false,
        records_processed: recordsProcessed,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: recordsFailed,
        error_message: errorMessage,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Perform full synchronization of all IEC electoral data
   */
  async performFullSync(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting full IEC electoral events synchronization...');
      
      // Log sync start
      await executeQuery(`
        INSERT INTO iec_electoral_event_sync_logs (
          sync_type, sync_status, started_at, triggered_by
        ) VALUES ('full_sync', 'started', NOW(), 'manual')
      `);

      // Sync event types first
      const eventTypesResult = await this.syncElectoralEventTypes();
      
      // Sync events
      const eventsResult = await this.syncElectoralEvents();

      const totalResult: SyncResult = {
        success: eventTypesResult.success && eventsResult.success,
        records_processed: eventTypesResult.records_processed + eventsResult.records_processed,
        records_created: eventTypesResult.records_created + eventsResult.records_created,
        records_updated: eventTypesResult.records_updated + eventsResult.records_updated,
        records_failed: eventTypesResult.records_failed + eventsResult.records_failed,
        duration_ms: Date.now() - startTime
      };

      // Log sync completion
      await executeQuery(`
        UPDATE iec_electoral_event_sync_logs 
        SET sync_status = ?, completed_at = NOW(), 
            records_processed = ?, records_created = ?, 
            records_updated = ?, records_failed = ?,
            sync_duration_ms = ?
        WHERE sync_type = 'full_sync' AND sync_status = 'started'
        ORDER BY started_at DESC LIMIT 1
      `, [
        totalResult.success ? 'completed' : 'failed',
        totalResult.records_processed,
        totalResult.records_created,
        totalResult.records_updated,
        totalResult.records_failed,
        totalResult.duration_ms
      ]);

      console.log(`🎉 Full sync completed in ${totalResult.duration_ms}ms`);
      return totalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Full sync failed:', errorMessage);
      
      // Log sync failure
      await executeQuery(`
        UPDATE iec_electoral_event_sync_logs 
        SET sync_status = 'failed', completed_at = NOW(), 
            error_message = ?, sync_duration_ms = ?
        WHERE sync_type = 'full_sync' AND sync_status = 'started'
        ORDER BY started_at DESC LIMIT 1
      `, [errorMessage, Date.now() - startTime]);

      return {
        success: false,
        records_processed: 0,
        records_created: 0,
        records_updated: 0,
        records_failed: 0,
        error_message: errorMessage,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Get all electoral event types from database
   */
  async getElectoralEventTypes(): Promise<ElectoralEventType[]> {
    try {
      const results = await executeQuery(`
        SELECT * FROM iec_electoral_event_types 
        ORDER BY iec_event_type_id
      `);
      return results as ElectoralEventType[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch electoral event types', error);
    }
  }

  /**
   * Get municipal election types only
   */
  async getMunicipalElectionTypes(): Promise<ElectoralEventType[]> {
    try {
      const results = await executeQuery(`
        SELECT * FROM iec_electoral_event_types 
        WHERE is_municipal_election = TRUE
        ORDER BY iec_event_type_id
      `);
      return results as ElectoralEventType[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipal election types', error);
    }
  }

  /**
   * Get electoral events by type
   */
  async getElectoralEventsByType(eventTypeId: number): Promise<ElectoralEvent[]> {
    try {
      const results = await executeQuery(`
        SELECT * FROM iec_electoral_events 
        WHERE iec_event_type_id = ?
        ORDER BY election_year DESC, iec_event_id DESC
      `, [eventTypeId]);
      return results as ElectoralEvent[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch electoral events by type', error);
    }
  }

  /**
   * Get active municipal elections
   */
  async getActiveMunicipalElections(): Promise<ElectoralEvent[]> {
    try {
      const results = await executeQuery(`
        SELECT iee.* FROM iec_electoral_events iee
        JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
        WHERE ieet.is_municipal_election = TRUE AND iee.is_active = TRUE
        ORDER BY iee.election_year DESC
      `);
      return results as ElectoralEvent[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch active municipal elections', error);
    }
  }

  /**
   * Get municipal election history
   */
  async getMunicipalElectionHistory(): Promise<ElectoralEvent[]> {
    try {
      const results = await executeQuery(`
        SELECT iee.* FROM iec_electoral_events iee
        JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
        WHERE ieet.is_municipal_election = TRUE
        ORDER BY iee.election_year DESC, iee.iec_event_id DESC
      `);
      return results as ElectoralEvent[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipal election history', error);
    }
  }

  /**
   * Get current active municipal election
   */
  async getCurrentMunicipalElection(): Promise<ElectoralEvent | null> {
    try {
      const result = await executeQuerySingle(`
        SELECT iee.* FROM iec_electoral_events iee
        JOIN iec_electoral_event_types ieet ON iee.iec_event_type_id = ieet.iec_event_type_id
        WHERE ieet.is_municipal_election = TRUE AND iee.is_active = TRUE
        ORDER BY iee.election_year DESC, iee.iec_event_id DESC
        LIMIT 1
      `);
      return result as ElectoralEvent | null;
    } catch (error) {
      throw createDatabaseError('Failed to fetch current municipal election', error);
    }
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(limit: number = 10): Promise<any[]> {
    try {
      const results = await executeQuery(`
        SELECT * FROM iec_electoral_event_sync_logs
        ORDER BY started_at DESC
        LIMIT ?
      `, [limit]);
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch sync logs', error);
    }
  }
}

export const iecElectoralEventsService = new IECElectoralEventsService();
export default iecElectoralEventsService;
