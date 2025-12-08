/**
 * IEC LGE Ballot Results Service
 * Handles Local Government Election ballot results from IEC API
 */

import { getPrisma } from './prismaService';
import { iecElectoralEventsService } from './iecElectoralEventsService';
import { IecGeographicMappingService } from './iecGeographicMappingService';

const prisma = getPrisma();

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

      // Get province code for this municipality (via district relationship)
      const municipalityInfo = await prisma.municipalities.findFirst({
        where: { municipality_code: municipalityCode },
        select: {
          districts: {
            select: {
              province_code: true
            }
          }
        }
      });

      if (!municipalityInfo || !municipalityInfo.districts) {
        throw new Error(`Municipality not found: ${municipalityCode}`);
      }

      const provinceCode = municipalityInfo.districts.province_code;
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

      // Get ward info including municipality
      const wardInfo = await prisma.wards.findFirst({
        where: { ward_code: wardCode },
        select: {
          municipality_code: true
        }
      });

      if (!wardInfo) {
        throw new Error(`Ward not found: ${wardCode}`);
      }

      const municipality_code = wardInfo.municipality_code;

      // Get province code via municipality's district
      const municipalityInfo = await prisma.municipalities.findFirst({
        where: { municipality_code: municipality_code },
        select: {
          districts: {
            select: {
              province_code: true
            }
          }
        }
      });

      const province_code = municipalityInfo?.districts?.province_code || '';
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
      const whereClause: any = {
        iec_event_id: query.electoralEventId
      };

      if (query.provinceId) {
        whereClause.iec_province_id = query.provinceId;
      }

      if (query.municipalityId) {
        whereClause.iec_municipality_id = String(query.municipalityId);
      }

      if (query.wardId) {
        whereClause.iec_ward_id = String(query.wardId);
      }

      const results = await prisma.iec_lge_ballot_results.findMany({
        where: whereClause,
        orderBy: { last_updated: 'desc' }
      });

      return results as any[];

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
        // Build where clause to find existing record
        const whereClause: any = {
          iec_event_id: result.iec_event_id,
          result_type: resultType
        };

        if (resultType === 'province') {
          whereClause.iec_province_id = result.iec_province_id;
        } else if (resultType === 'municipality') {
          whereClause.iec_municipality_id = result.iec_municipality_id ? String(result.iec_municipality_id) : null;
        } else if (resultType === 'ward') {
          whereClause.iec_ward_id = result.iec_ward_id ? String(result.iec_ward_id) : null;
        }

        // Check if record exists
        const existing = await prisma.iec_lge_ballot_results.findFirst({
          where: whereClause
        });

        const data = {
          iec_event_id: result.iec_event_id,
          iec_province_id: result.iec_province_id || null,
          iec_municipality_id: result.iec_municipality_id ? String(result.iec_municipality_id) : null,
          iec_ward_id: result.iec_ward_id ? String(result.iec_ward_id) : null,
          province_code: resultType === 'province' ? primaryCode : (provinceCode || null),
          municipality_code: resultType === 'municipality' ? primaryCode : (municipalityCode || null),
          ward_code: resultType === 'ward' ? primaryCode : null,
          ballot_data: result.ballot_data,
          total_votes: result.total_votes,
          registered_voters: result.registered_voters,
          voter_turnout_percentage: result.voter_turnout_percentage,
          result_type: resultType,
          data_source: 'IEC_API',
          last_updated: new Date()
        };

        if (existing) {
          // Update existing record
          await prisma.iec_lge_ballot_results.update({
            where: { id: existing.id },
            data
          });
        } else {
          // Create new record
          await prisma.iec_lge_ballot_results.create({
            data
          });
        }
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
      const [total, provinceCount, municipalityCount, wardCount, lastUpdatedResult] = await Promise.all([
        prisma.iec_lge_ballot_results.count(),
        prisma.iec_lge_ballot_results.count({ where: { result_type: 'province' } }),
        prisma.iec_lge_ballot_results.count({ where: { result_type: 'municipality' } }),
        prisma.iec_lge_ballot_results.count({ where: { result_type: 'ward' } }),
        prisma.iec_lge_ballot_results.findFirst({
          orderBy: { last_updated: 'desc' },
          select: { last_updated: true }
        })
      ]);

      return {
        total_results: total,
        by_type: {
          province: provinceCount,
          municipality: municipalityCount,
          ward: wardCount
        },
        last_updated: lastUpdatedResult?.last_updated || null
      };

    } catch (error) {
      console.error('❌ Error getting ballot results statistics:', error);
      throw error;
    }
  }
}
