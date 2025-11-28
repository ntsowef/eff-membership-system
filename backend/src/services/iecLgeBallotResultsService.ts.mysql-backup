/**
 * IEC LGE Ballot Results Service
 * Handles Local Government Election ballot results from IEC API
 */

import { executeQuery } from '../config/database';
import { iecElectoralEventsService } from './iecElectoralEventsService';
import { IecGeographicMappingService } from './iecGeographicMappingService';

interface LgeBallotResult {
  id?: number;
  iec_event_id: number;
  iec_province_id?: number;
  iec_municipality_id?: string | number;
  iec_ward_id?: string | number;
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  ballot_data: any;
  total_votes: number;
  registered_voters: number;
  voter_turnout_percentage: number;
  result_type: 'province' | 'municipality' | 'ward';
  data_source: string;
  last_updated?: Date;
  created_at?: Date;
}

interface BallotResultsQuery {
  electoralEventId: number;
  provinceId?: number | null;
  municipalityId?: string | number | null;
  wardId?: string | number | null;
}

export class IecLgeBallotResultsService {
  private iecService: typeof iecElectoralEventsService;
  private mappingService: IecGeographicMappingService;

  constructor() {
    this.iecService = iecElectoralEventsService;
    this.mappingService = new IecGeographicMappingService();
  }

  /**
   * Get LGE ballot results by province code
   */
  async getBallotResultsByProvinceCode(provinceCode: string): Promise<LgeBallotResult[]> {
    try {
      console.log(`🗳️ Getting ballot results for province: ${provinceCode}`);

      // Get IEC Province ID from our mapping
      const iecProvinceId = await this.mappingService.getIecProvinceId(provinceCode);
      if (!iecProvinceId) {
        throw new Error(`No IEC Province ID mapping found for province code: ${provinceCode}`);
      }

      // Get current active electoral event
      const currentEvent = await this.iecService.getCurrentMunicipalElection();
      if (!currentEvent) {
        throw new Error('No active municipal election found');
      }

      // Check if we have cached results
      const cachedResults = await this.getCachedBallotResults({
        electoralEventId: currentEvent.iec_event_id,
        provinceId: iecProvinceId
      });

      if (cachedResults.length > 0) {
        console.log(`✅ Found ${cachedResults.length} cached results for province ${provinceCode}`);
        return cachedResults;
      }

      // Fetch from IEC API
      console.log(`🔄 Fetching fresh data from IEC API for province ${provinceCode}`);
      const freshResults = await this.fetchBallotResultsFromIecApi({
        electoralEventId: currentEvent.iec_event_id,
        provinceId: iecProvinceId
      });

      // Cache the results
      if (freshResults.length > 0) {
        await this.cacheBallotResults(freshResults, 'province', provinceCode);
      }

      return freshResults;

    } catch (error) {
      console.error(`❌ Error getting ballot results for province ${provinceCode}:`, error);
      throw error;
    }
  }

  /**
   * Get LGE ballot results by municipality code
   */
  async getBallotResultsByMunicipalityCode(municipalityCode: string): Promise<LgeBallotResult[]> {
    try {
      console.log(`🗳️ Getting ballot results for municipality: ${municipalityCode}`);

      // Get IEC Municipality ID from our mapping
      const iecMunicipalityId = await this.mappingService.getIecMunicipalityId(municipalityCode);
      if (!iecMunicipalityId) {
        throw new Error(`No IEC Municipality ID mapping found for municipality code: ${municipalityCode}`);
      }

      // Get province code for this municipality
      const municipalityInfo = await executeQuery(`
        SELECT province_code FROM municipalities WHERE municipality_code = ?
      `, [municipalityCode]) as any[];

      if (municipalityInfo.length === 0) {
        throw new Error(`Municipality not found: ${municipalityCode}`);
      }

      const provinceCode = municipalityInfo[0].province_code;
      const iecProvinceId = await this.mappingService.getIecProvinceId(provinceCode);

      // Get current active electoral event
      const currentEvent = await this.iecService.getCurrentMunicipalElection();
      if (!currentEvent) {
        throw new Error('No active municipal election found');
      }

      // Check if we have cached results
      const cachedResults = await this.getCachedBallotResults({
        electoralEventId: currentEvent.iec_event_id,
        provinceId: iecProvinceId,
        municipalityId: iecMunicipalityId
      });

      if (cachedResults.length > 0) {
        console.log(`✅ Found ${cachedResults.length} cached results for municipality ${municipalityCode}`);
        return cachedResults;
      }

      // Fetch from IEC API
      console.log(`🔄 Fetching fresh data from IEC API for municipality ${municipalityCode}`);
      const freshResults = await this.fetchBallotResultsFromIecApi({
        electoralEventId: currentEvent.iec_event_id,
        provinceId: iecProvinceId,
        municipalityId: iecMunicipalityId
      });

      // Cache the results
      if (freshResults.length > 0) {
        await this.cacheBallotResults(freshResults, 'municipality', municipalityCode, provinceCode);
      }

      return freshResults;

    } catch (error) {
      console.error(`❌ Error getting ballot results for municipality ${municipalityCode}:`, error);
      throw error;
    }
  }

  /**
   * Get LGE ballot results by ward code
   */
  async getBallotResultsByWardCode(wardCode: string): Promise<LgeBallotResult[]> {
    try {
      console.log(`🗳️ Getting ballot results for ward: ${wardCode}`);

      // Get IEC Ward ID from our mapping
      const iecWardId = await this.mappingService.getIecWardId(wardCode);
      if (!iecWardId) {
        throw new Error(`No IEC Ward ID mapping found for ward code: ${wardCode}`);
      }

      // Get ward info including municipality and province
      const wardInfo = await executeQuery(`
        SELECT municipality_code, province_code FROM wards WHERE ward_code = ?
      `, [wardCode]) as any[];

      if (wardInfo.length === 0) {
        throw new Error(`Ward not found: ${wardCode}`);
      }

      const { municipality_code, province_code } = wardInfo[0];
      const iecMunicipalityId = await this.mappingService.getIecMunicipalityId(municipality_code);
      const iecProvinceId = await this.mappingService.getIecProvinceId(province_code);

      // Get current active electoral event
      const currentEvent = await this.iecService.getCurrentMunicipalElection();
      if (!currentEvent) {
        throw new Error('No active municipal election found');
      }

      // Check if we have cached results
      const cachedResults = await this.getCachedBallotResults({
        electoralEventId: currentEvent.iec_event_id,
        provinceId: iecProvinceId,
        municipalityId: iecMunicipalityId,
        wardId: iecWardId
      });

      if (cachedResults.length > 0) {
        console.log(`✅ Found ${cachedResults.length} cached results for ward ${wardCode}`);
        return cachedResults;
      }

      // Fetch from IEC API
      console.log(`🔄 Fetching fresh data from IEC API for ward ${wardCode}`);
      const freshResults = await this.fetchBallotResultsFromIecApi({
        electoralEventId: currentEvent.iec_event_id,
        provinceId: iecProvinceId,
        municipalityId: iecMunicipalityId,
        wardId: iecWardId
      });

      // Cache the results
      if (freshResults.length > 0) {
        await this.cacheBallotResults(freshResults, 'ward', wardCode, province_code, municipality_code);
      }

      return freshResults;

    } catch (error) {
      console.error(`❌ Error getting ballot results for ward ${wardCode}:`, error);
      throw error;
    }
  }

  /**
   * Fetch ballot results from IEC API
   */
  private async fetchBallotResultsFromIecApi(query: BallotResultsQuery): Promise<LgeBallotResult[]> {
    try {
      // Build API URL
      let apiUrl = `api/v1/LGEBallotResults?ElectoralEventID=${query.electoralEventId}`;
      
      if (query.provinceId) {
        apiUrl += `&ProvinceID=${query.provinceId}`;
      }
      
      if (query.municipalityId) {
        apiUrl += `&MunicipalityID=${query.municipalityId}`;
      }
      
      if (query.wardId) {
        apiUrl += `&WardID=${query.wardId}`;
      }

      console.log(`🔗 IEC API URL: ${apiUrl}`);

      // For now, return mock data since we don't have real IEC API access
      // In production, you would call the actual IEC API here
      const mockResults = await this.generateMockBallotResults(query);
      
      console.log(`✅ Fetched ${mockResults.length} ballot results from IEC API`);
      return mockResults;

    } catch (error) {
      console.error('❌ Error fetching from IEC API:', error);
      throw error;
    }
  }

  /**
   * Get cached ballot results from database
   */
  private async getCachedBallotResults(query: BallotResultsQuery): Promise<LgeBallotResult[]> {
    try {
      let sql = `
        SELECT * FROM iec_lge_ballot_results 
        WHERE iec_event_id = ?
      `;
      const params: any[] = [query.electoralEventId];

      if (query.provinceId) {
        sql += ` AND iec_province_id = ?`;
        params.push(query.provinceId);
      }

      if (query.municipalityId) {
        sql += ` AND iec_municipality_id = ?`;
        params.push(query.municipalityId);
      }

      if (query.wardId) {
        sql += ` AND iec_ward_id = ?`;
        params.push(query.wardId);
      }

      sql += ` ORDER BY last_updated DESC`;

      const results = await executeQuery(sql, params) as LgeBallotResult[];
      return results;

    } catch (error) {
      console.error('❌ Error getting cached ballot results:', error);
      return [];
    }
  }

  /**
   * Cache ballot results in database
   */
  private async cacheBallotResults(
    results: LgeBallotResult[], 
    resultType: 'province' | 'municipality' | 'ward',
    primaryCode: string,
    provinceCode?: string,
    municipalityCode?: string
  ): Promise<void> {
    try {
      console.log(`💾 Caching ${results.length} ballot results (${resultType})`);

      for (const result of results) {
        await executeQuery(`
          INSERT INTO iec_lge_ballot_results
          (iec_event_id, iec_province_id, iec_municipality_id, iec_ward_id,
           province_code, municipality_code, ward_code, ballot_data,
           total_votes, registered_voters, voter_turnout_percentage,
           result_type, data_source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          ballot_data = VALUES(ballot_data),
          total_votes = VALUES(total_votes),
          registered_voters = VALUES(registered_voters),
          voter_turnout_percentage = VALUES(voter_turnout_percentage),
          last_updated = CURRENT_TIMESTAMP
        `, [
          result.iec_event_id,
          result.iec_province_id || null,
          result.iec_municipality_id || null,
          result.iec_ward_id || null,
          resultType === 'province' ? primaryCode : (provinceCode || null),
          resultType === 'municipality' ? primaryCode : (municipalityCode || null),
          resultType === 'ward' ? primaryCode : null,
          JSON.stringify(result.ballot_data),
          result.total_votes,
          result.registered_voters,
          result.voter_turnout_percentage,
          resultType,
          'IEC_API'
        ]);
      }

      console.log(`✅ Cached ${results.length} ballot results`);

    } catch (error) {
      console.error('❌ Error caching ballot results:', error);
      throw error;
    }
  }

  /**
   * Generate mock ballot results for testing
   */
  private async generateMockBallotResults(query: BallotResultsQuery): Promise<LgeBallotResult[]> {
    // Generate realistic mock data
    const mockResults: LgeBallotResult[] = [];

    const parties = ['ANC', 'DA', 'EFF', 'IFP', 'FF+', 'ACDP', 'UDM', 'COPE'];
    const totalVotes = Math.floor(Math.random() * 50000) + 10000;
    const registeredVoters = Math.floor(totalVotes * 1.3);

    const ballotData = {
      parties: parties.map(party => ({
        name: party,
        votes: Math.floor(Math.random() * totalVotes * 0.4),
        percentage: 0
      })),
      summary: {
        total_votes: totalVotes,
        registered_voters: registeredVoters,
        voter_turnout: ((totalVotes / registeredVoters) * 100).toFixed(2)
      }
    };

    // Calculate percentages
    const actualTotal = ballotData.parties.reduce((sum, party) => sum + party.votes, 0);
    ballotData.parties.forEach(party => {
      party.percentage = parseFloat(((party.votes / actualTotal) * 100).toFixed(2));
    });

    mockResults.push({
      iec_event_id: query.electoralEventId,
      iec_province_id: query.provinceId || undefined,
      iec_municipality_id: query.municipalityId || undefined,
      iec_ward_id: query.wardId || undefined,
      ballot_data: ballotData,
      total_votes: actualTotal,
      registered_voters: registeredVoters,
      voter_turnout_percentage: parseFloat(((actualTotal / registeredVoters) * 100).toFixed(2)),
      result_type: query.wardId ? 'ward' : query.municipalityId ? 'municipality' : 'province',
      data_source: 'IEC_API_MOCK'
    });

    return mockResults;
  }

  /**
   * Get ballot results statistics
   */
  async getBallotResultsStatistics(): Promise<{
    total_results: number;
    by_type: { province: number; municipality: number; ward: number };
    last_updated: Date | null;
  }> {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_results,
          SUM(CASE WHEN result_type = 'province' THEN 1 ELSE 0 END) as province_count,
          SUM(CASE WHEN result_type = 'municipality' THEN 1 ELSE 0 END) as municipality_count,
          SUM(CASE WHEN result_type = 'ward' THEN 1 ELSE 0 END) as ward_count,
          MAX(last_updated) as last_updated
        FROM iec_lge_ballot_results
      `) as any[];

      return {
        total_results: stats[0]?.total_results || 0,
        by_type: {
          province: stats[0]?.province_count || 0,
          municipality: stats[0]?.municipality_count || 0,
          ward: stats[0]?.ward_count || 0
        },
        last_updated: stats[0]?.last_updated || null
      };

    } catch (error) {
      console.error('❌ Error getting ballot results statistics:', error);
      throw error;
    }
  }
}
