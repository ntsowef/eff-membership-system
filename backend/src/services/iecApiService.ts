import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { createDatabaseError } from '../middleware/errorHandler';
import { getPrisma } from './prismaService';

const prisma = getPrisma();

// IEC API Response Types (Based on actual IEC API structure)
export interface IECDelimitation {
  ProvinceID: number;
  Province: string;
  MunicipalityID: number;
  Municipality: string;
  WardID: number;
  VDNumber: number;
}

export interface IECLocation {
  Town: string;
  Suburb: string;
  Street: string;
  Latitude: number;
  Longitude: number;
  ProvinceID: number;
  Province: string;
  MunicipalityID: number;
  Municipality: string;
  WardID: number;
  VDNumber: number;
  VotingDistrict: string;
  VDAddress: string;
}

export interface IECVotingStation {
  Name: string;
  Delimitation: IECDelimitation;
  Location: IECLocation;
}

export interface IECVoterResponse {
  Id: string;
  VoterStatus: string;
  VoterStatusID: number;
  bRegistered: boolean;
  VotingStation: IECVotingStation;
  VoterId: number;
}

// Simplified response for our application
export interface IECVoterDetails {
  id_number: string;
  is_registered: boolean;
  voter_status: string;
  // IEC IDs
  province_id?: number;
  province?: string;
  municipality_id?: number;
  municipality?: string;
  ward_id?: number;
  vd_number?: number;
  // Our internal codes (mapped from IEC IDs)
  province_code?: string;
  district_code?: string;
  municipality_code?: string;
  ward_code?: string;
  voting_district_code?: string;
  // Location details
  voting_district?: string;
  voting_station_name?: string;
  voting_station_address?: string;
  town?: string;
  suburb?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
}

export interface IECApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface IECVotingDistrictInfo {
  voting_district_code: string;
  voting_district_name: string;
  ward_code: string;
  municipality_code: string;
  province_code: string;
  voting_station_name?: string;
  voting_station_address?: string;
}

class IECApiService {
  // HTTP client pointed at the IECProxy service. The proxy handles all
  // authentication / Cloudflare bypass and forwards lookups to the IEC Voter
  // API, returning the raw IEC payload (same shape as IECVoterResponse).
  private client: AxiosInstance;
  private rateLimitCount: number = 0;
  private rateLimitResetTime: number = Date.now() + 60000; // Reset every minute

  constructor() {
    this.client = axios.create({
      baseURL: config.iec.proxyUrl,
      timeout: config.iec.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`✅ IEC API Service initialized (IECProxy at ${config.iec.proxyUrl})`);
  }

  /**
   * Fetch voter details from the IECProxy service.
   * Endpoint: GET {proxyUrl}/api/voters/{id_number}
   * The proxy returns the raw IEC voter payload (IECVoterResponse shape).
   */
  private async fetchVoter(idNumber: string): Promise<IECVoterResponse> {
    const resp = await this.client.get<IECVoterResponse>(
      `/api/voters/${idNumber}`
    );
    return resp.data;
  }

  private checkRateLimit(): void {
    const now = Date.now();
    
    // Reset rate limit counter every minute
    if (now > this.rateLimitResetTime) {
      this.rateLimitCount = 0;
      this.rateLimitResetTime = now + 60000;
    }
    
    // Check if rate limit exceeded
    if (this.rateLimitCount >= config.iec.rateLimit) {
      throw new Error('IEC API rate limit exceeded. Maximum ' + config.iec.rateLimit + ' requests per minute.');
    }
    
    this.rateLimitCount++;
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      // Proxy responded with an error status
      const status = error.response.status;
      const message = error.response.data?.detail
        || error.response.data?.message
        || error.response.statusText;

      switch (status) {
        case 401:
          return new Error('IEC proxy authentication failed.');
        case 403:
          return new Error('IEC proxy access forbidden. Insufficient permissions.');
        case 404:
          return new Error('IEC proxy endpoint not found.');
        case 422:
          return new Error('IEC proxy validation error (invalid ID number).');
        case 429:
          return new Error('IEC proxy rate limit exceeded. Please try again later.');
        case 500:
        case 502:
        case 503:
        case 504:
          return new Error('IEC proxy/upstream server error. Please try again later.');
        default:
          return new Error('IEC proxy error: ' + (typeof message === 'string' ? message : JSON.stringify(message)));
      }
    } else if (error.request) {
      // No response received — proxy unreachable / network failure
      return new Error(`IEC proxy unreachable at ${config.iec.proxyUrl}. Please check the service.`);
    } else {
      // Other error
      return new Error('IEC proxy error: ' + error.message + '');
    }
  }

  /**
   * Verify voter details by ID number via the IECProxy service.
   */
  async verifyVoter(idNumber: string): Promise<IECVoterDetails | null> {
    try {
      // Check rate limit
      this.checkRateLimit();

      console.log(`🔍 Checking voter registration for ID: ${idNumber} (via IECProxy)`);

      const response = await this.fetchVoter(idNumber);

      console.log('IEC proxy response received:', {
        registered: response.bRegistered,
        status: response.VoterStatus
      });

      // Transform IEC response to our format
      const voterDetails: IECVoterDetails = {
        id_number: idNumber,
        is_registered: response.bRegistered,
        voter_status: response.VoterStatus
      };

      // Extract geographic information if registered
      if (response.bRegistered && response.VotingStation) {
        const delimitation = response.VotingStation.Delimitation;
        const location = response.VotingStation.Location;

        voterDetails.province_id = delimitation.ProvinceID;
        voterDetails.province = delimitation.Province;
        voterDetails.municipality_id = delimitation.MunicipalityID;
        voterDetails.municipality = delimitation.Municipality;
        voterDetails.ward_id = delimitation.WardID;
        voterDetails.vd_number = delimitation.VDNumber;

        // SIMPLIFIED DIRECT MAPPING: Use IEC values directly as our codes
        console.log(` Mapping IEC geographic data directly...`);
        console.log(`   IEC Province ID: ${delimitation.ProvinceID} (${delimitation.Province})`);
        console.log(`   IEC Municipality ID: ${delimitation.MunicipalityID} (${delimitation.Municipality})`);
        console.log(`   IEC Ward ID: ${delimitation.WardID}`);
        console.log(`   IEC VD Number: ${delimitation.VDNumber}`);

        try {
          // 1. Map Province - Use province mapping table
          const provinceMapping = await prisma.iec_province_mappings.findFirst({
            where: {
              iec_province_id: delimitation.ProvinceID
            },
            select: {
              province_code: true
            }
          });

          if (provinceMapping) {
            voterDetails.province_code = provinceMapping.province_code;
            console.log(` Province mapped: IEC Province ID ${delimitation.ProvinceID} → ${provinceMapping.province_code}`);
          } else {
            console.warn(` No province mapping found for IEC Province ID: ${delimitation.ProvinceID}`);
          }

          // 2. Map Municipality - Use enhanced municipality mapping table (includes district_code)
          const municipalityMapping = await prisma.iec_municipality_mappings.findFirst({
            where: {
              iec_municipality_id: delimitation.MunicipalityID.toString()
            },
            select: {
              municipality_code: true,
              district_code: true  // Now included directly in the mapping table
            }
          });

          if (municipalityMapping) {
            voterDetails.municipality_code = municipalityMapping.municipality_code;
            console.log(` Municipality mapped: IEC Municipality ID ${delimitation.MunicipalityID} → ${municipalityMapping.municipality_code}`);

            // District code is now directly in the mapping table - no extra lookup needed!
            if (municipalityMapping.district_code) {
              voterDetails.district_code = municipalityMapping.district_code;
              console.log(` District mapped (from mapping table): ${municipalityMapping.district_code}`);
            }
          } else {
            // Fallback: Try to find municipality by name matching in municipalities table
            console.log(` No municipality mapping found, trying name match...`);
            const municipality = await prisma.municipalities.findFirst({
              where: {
                municipality_name: {
                  contains: delimitation.Municipality.split(' - ')[1] || delimitation.Municipality
                }
              },
              select: {
                municipality_code: true,
                district_code: true
              }
            });

            if (municipality) {
              voterDetails.municipality_code = municipality.municipality_code;
              if (municipality.district_code) {
                voterDetails.district_code = municipality.district_code;
              }
              console.log(`Municipality mapped (by name): ${delimitation.Municipality} → ${municipality.municipality_code}`);
            } else {
              console.warn(` No municipality found for: ${delimitation.Municipality}`);
            }
          }

          // 3. Map Ward - USE IEC WARD_ID DIRECTLY AS WARD_CODE
          voterDetails.ward_code = delimitation.WardID.toString();
          console.log(` Ward mapped DIRECTLY: IEC Ward ID ${delimitation.WardID} → Ward Code ${voterDetails.ward_code}`);

          // 4. Map Voting District - USE IEC VD_NUMBER DIRECTLY AS VOTING_DISTRICT_CODE
          voterDetails.voting_district_code = delimitation.VDNumber.toString();
          console.log(` Voting District mapped DIRECTLY: IEC VD Number ${delimitation.VDNumber} → Voting District Code ${voterDetails.voting_district_code}`);

        } catch (mappingError) {
          console.error('Error looking up geographic codes:', mappingError);
        }

        voterDetails.voting_station_name = response.VotingStation.Name;
        voterDetails.voting_district = location.VotingDistrict;
        voterDetails.voting_station_address = location.VDAddress;
        voterDetails.town = location.Town;
        voterDetails.suburb = location.Suburb;
        voterDetails.street = location.Street;
        voterDetails.latitude = location.Latitude;
        voterDetails.longitude = location.Longitude;

        console.log('📍 Geographic data extracted:', {
          iec_ids: {
            province_id: voterDetails.province_id,
            municipality_id: voterDetails.municipality_id,
            ward_id: voterDetails.ward_id,
            vd_number: voterDetails.vd_number
          },
          our_codes: {
            province_code: voterDetails.province_code,
            district_code: voterDetails.district_code,
            municipality_code: voterDetails.municipality_code,
            ward_code: voterDetails.ward_code,
            voting_district_code: voterDetails.voting_district_code
          }
        });
      }

      return voterDetails;
    } catch (error: any) {
      console.error('Error verifying voter via IECProxy:', error.response?.data || error.message);

      // If voter not found, treat as "Not Registered" instead of throwing.
      if (error.response?.status === 404) {
        console.log('ℹ Voter not found in IEC database (via proxy)');
        return {
          id_number: idNumber,
          is_registered: false,
          voter_status: 'Not Registered'
        };
      }

      // For all other failures (proxy unreachable, upstream 5xx, validation, etc.)
      // throw a descriptive error so the bulk-upload processors can record the
      // per-record failure without crashing the job.
      throw this.handleApiError(error);
    }
  }

  /**
   * Get voting district information
   */
  async getVotingDistrictInfo(votingDistrictCode: string): Promise<IECVotingDistrictInfo | null> {
    try {
      const response = await this.client.get<IECApiResponse<IECVotingDistrictInfo>>(
        '/voting-districts/' + votingDistrictCode + ''
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('Error getting voting district info:', error);
      throw createDatabaseError('Failed to get voting district information', error);
    }
  }

  /**
   * Search voters by criteria
   */
  async searchVoters(criteria: {
    firstName?: string;
    lastName?: string;
    idNumber?: string;
    votingDistrict?: string;
    ward?: string;
  }): Promise<IECVoterDetails[]> {
    try {
      const response = await this.client.post<IECApiResponse<IECVoterDetails[]>>(
        '/voters/search',
        criteria
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('Error searching voters:', error);
      throw createDatabaseError('Failed to search voters', error);
    }
  }

  /**
   * Validate voting district code
   */
  async validateVotingDistrict(votingDistrictCode: string): Promise<boolean> {
    try {
      const info = await this.getVotingDistrictInfo(votingDistrictCode);
      return info !== null;
    } catch (error) {
      console.error('Error validating voting district:', error);
      return false;
    }
  }

  /**
   * Get API status and health
   */
  async getApiStatus(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const iecApiService = new IECApiService();
export default iecApiService;
