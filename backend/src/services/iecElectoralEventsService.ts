import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { getPrisma } from './prismaService';
import { createDatabaseError } from '../middleware/errorHandler';

const prisma = getPrisma();

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
      const response = await axios.post('' + config.iec.apiUrl + '/token', new URLSearchParams({
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
          'Authorization': 'bearer ' + accessToken + ''
        }
      });

      return response.data;
    } catch (error) {
      console.error('IEC API call failed for ' + endpoint + ':', error);
      throw createDatabaseError('Failed to fetch data from IEC API: ' + endpoint + '', error);
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
    return this.makeApiCall<IECElectoralEvent[]>('api/v1/ElectoralEvent? ElectoralEventTypeID=' + eventTypeId + '');
  }

  /**
   * Sync electoral event types from IEC API to database
   */
  async syncElectoralEventTypes() : Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    let errorMessage: string | undefined;

    try {
      console.log('Syncing electoral event types from IEC API...');
      
      const iecEventTypes = await this.fetchElectoralEventTypes();
      recordsProcessed = iecEventTypes.length;

      for (const iecEventType of iecEventTypes) {
        try {
          const isMunicipalElection = iecEventType.Description.toLowerCase().includes('local government');

          const result = await prisma.iec_electoral_event_types.upsert({
            where: { iec_event_type_id: iecEventType.ID },
            update: {
              description: iecEventType.Description,
              is_municipal_election: isMunicipalElection,
              updated_at: new Date()
            },
            create: {
              iec_event_type_id: iecEventType.ID,
              description: iecEventType.Description,
              is_municipal_election: isMunicipalElection
            }
          });

          // Check if it was created or updated by checking if created_at equals updated_at
          if (result.created_at?.getTime() === result.updated_at?.getTime()) {
            recordsCreated++;
          } else {
            recordsUpdated++;
          }
        } catch (error) {
          console.error('Failed to sync event type ' + iecEventType.ID + ':', error);
          recordsFailed++;
        }
      }

      const duration = Date.now() - startTime;
      console.log('Synced ' + recordsProcessed + ' electoral event types in ' + duration + 'ms');

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
      console.error('Failed to sync electoral event types:', errorMessage);
      
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
      console.log('Syncing electoral events from IEC API' + (eventTypeId ? ' for type ' + eventTypeId : '') + '...');
      
      // Get event types to sync
      const eventTypesToSync = eventTypeId ? [eventTypeId] : [1, 2, 3, 4]; // All known types
      
      for (const typeId of eventTypesToSync) {
        try {
          const iecEvents = await this.fetchElectoralEvents(typeId);
          recordsProcessed += iecEvents.length;

          for (const iecEvent of iecEvents) {
            try {
              const yearMatch = iecEvent.Description.match(/(\d{4})/);
              const electionYear = yearMatch ? parseInt(yearMatch[1]) : null;

              await prisma.iec_electoral_events.upsert({
                where: { iec_event_id: iecEvent.ID },
                update: {
                  description: iecEvent.Description,
                  is_active: iecEvent.IsActive,
                  election_year: electionYear,
                  last_synced_at: new Date(),
                  sync_status: 'completed',
                  updated_at: new Date()
                },
                create: {
                  iec_event_id: iecEvent.ID,
                  iec_event_type_id: typeId,
                  description: iecEvent.Description,
                  is_active: iecEvent.IsActive,
                  election_year: electionYear,
                  last_synced_at: new Date(),
                  sync_status: 'completed'
                }
              });

              recordsCreated++;
            } catch (error) {
              console.error('Failed to sync event ' + iecEvent.ID + ':', error);
              recordsFailed++;
            }
          }
        } catch (error) {
          console.error('Failed to fetch events for type ' + typeId + ':', error);
          recordsFailed++;
        }
      }

      const duration = Date.now() - startTime;
      console.log('Synced ' + recordsProcessed + ' electoral events in ' + duration + 'ms');

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
      console.error('Failed to sync electoral events:', errorMessage);
      
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
      console.log('Starting full IEC electoral events synchronization...');
      
      // Log sync start
      const syncLog = await prisma.iec_electoral_event_sync_logs.create({
        data: {
          sync_type: 'full_sync',
          sync_status: 'started',
          started_at: new Date(),
          triggered_by: 'manual'
        }
      });

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
      await prisma.iec_electoral_event_sync_logs.update({
        where: { id: syncLog.id },
        data: {
          sync_status: totalResult.success ? 'completed' : 'failed',
          completed_at: new Date(),
          records_processed: totalResult.records_processed,
          records_created: totalResult.records_created,
          records_updated: totalResult.records_updated,
          records_failed: totalResult.records_failed,
          sync_duration_ms: totalResult.duration_ms
        }
      });

      console.log('Full sync completed in ' + totalResult.duration_ms + 'ms');
      return totalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full sync failed:', errorMessage);
      
      // Log sync failure - find the most recent started sync
      const recentSync = await prisma.iec_electoral_event_sync_logs.findFirst({
        where: {
          sync_type: 'full_sync',
          sync_status: 'started'
        },
        orderBy: {
          started_at: 'desc'
        }
      });

      if (recentSync) {
        await prisma.iec_electoral_event_sync_logs.update({
          where: { id: recentSync.id },
          data: {
            sync_status: 'failed',
            completed_at: new Date(),
            error_message: errorMessage,
            sync_duration_ms: Date.now() - startTime
          }
        });
      }

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
      const results = await prisma.iec_electoral_event_types.findMany({
        orderBy: {
          iec_event_type_id: 'asc'
        }
      });
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch electoral event types', error);
    }
  }

  /**
   * Get municipal election types only
   */
  async getMunicipalElectionTypes(): Promise<ElectoralEventType[]> {
    try {
      const results = await prisma.iec_electoral_event_types.findMany({
        where: {
          is_municipal_election: true
        },
        orderBy: {
          iec_event_type_id: 'asc'
        }
      });
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipal election types', error);
    }
  }

  /**
   * Get electoral events by type
   */
  async getElectoralEventsByType(eventTypeId: number): Promise<ElectoralEvent[]> {
    try {
      const results = await prisma.iec_electoral_events.findMany({
        where: {
          iec_event_type_id: eventTypeId
        },
        orderBy: [
          { election_year: 'desc' },
          { iec_event_id: 'desc' }
        ]
      });
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch electoral events by type', error);
    }
  }

  /**
   * Get active municipal elections
   */
  async getActiveMunicipalElections() : Promise<ElectoralEvent[]> {
    try {
      const results = await prisma.iec_electoral_events.findMany({
        where: {
          is_active: true,
          iec_electoral_event_types: {
            is_municipal_election: true
          }
        },
        orderBy: {
          election_year: 'desc'
        }
      });
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch active municipal elections', error);
    }
  }

  /**
   * Get municipal election history
   */
  async getMunicipalElectionHistory(): Promise<ElectoralEvent[]> {
    try {
      const results = await prisma.iec_electoral_events.findMany({
        where: {
          iec_electoral_event_types: {
            is_municipal_election: true
          }
        },
        orderBy: [
          { election_year: 'desc' },
          { iec_event_id: 'desc' }
        ]
      });
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipal election history', error);
    }
  }

  /**
   * Get current active municipal election
   */
  async getCurrentMunicipalElection(): Promise<ElectoralEvent | null> {
    try {
      const result = await prisma.iec_electoral_events.findFirst({
        where: {
          is_active: true,
          iec_electoral_event_types: {
            is_municipal_election: true
          }
        },
        orderBy: [
          { election_year: 'desc' },
          { iec_event_id: 'desc' }
        ]
      });
      return result as any;
    } catch (error) {
      throw createDatabaseError('Failed to fetch current municipal election', error);
    }
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(limit: number = 10): Promise<any[]> {
    try {
      const results = await prisma.iec_electoral_event_sync_logs.findMany({
        orderBy: {
          started_at: 'desc'
        },
        take: limit
      });
      return results as any[];
    } catch (error) {
      throw createDatabaseError('Failed to fetch sync logs', error);
    }
  }
}

export const iecElectoralEventsService = new IECElectoralEventsService();
export default iecElectoralEventsService;
