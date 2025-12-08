import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import cloudscraper from 'cloudscraper';
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

// OAuth2 Token Response
interface IECTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class IECApiService {
  private client: AxiosInstance;
  private tokenClient: AxiosInstance;
  private scraper: any; // CloudScraper instance
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private rateLimitCount: number = 0;
  private rateLimitResetTime: number = Date.now() + 60000; // Reset every minute

  constructor() {
    // Create CloudScraper instance with browser configuration (matching Python)
    this.scraper = cloudscraper.defaults({
      agentOptions: {
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256'
      }
    });

    // Client for token requests (kept for fallback)
    this.tokenClient = axios.create({
      baseURL: 'https://api.elections.org.za',
      timeout: config.iec.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Client for API requests (kept for fallback)
    this.client = axios.create({
      baseURL: 'https://api.elections.org.za',
      timeout: config.iec.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('IEC API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });

        return Promise.reject(this.handleApiError(error));
      }
    );

    console.log(' IEC API Service initialized with CloudScraper (Chrome/Windows profile)');
  }

  /**
   * Get OAuth2 access token using CloudScraper to bypass Cloudflare
   * Matches Python implementation: cloudscraper.create_scraper with Chrome/Windows profile
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      console.log(' Authenticating with IEC API (CloudScraper - Chrome/Windows)...');

      // Use CloudScraper with same configuration as Python
      // Python: scraper.post(token_url, data=token_data, timeout=60)
      const response = await this.scraper.post({
        uri: 'https://api.elections.org.za/token',
        form: {
          grant_type: 'password',
          username: config.iec.username,
          password: config.iec.password
        },
        json: true, // Automatically parse JSON response
        timeout: 60000, // 60 seconds (matching Python timeout=60)
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        // CloudScraper options (matching Python delay=10)
        cloudflareTimeout: 60000,
        cloudflareMaxTimeout: 60000
      }) as IECTokenResponse;

      this.accessToken = response.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((response.expires_in - 300) * 1000);

      console.log(' Token obtained successfully!');
      console.log(`   Token (first 50 chars): ${this.accessToken.substring(0, 50)}...`);
      console.log(`   Expires in: ${response.expires_in} seconds`);

      return this.accessToken;
    } catch (error: any) {
      console.error(' Failed to get IEC API access token:', error.message);
      if (error.error) {
        console.error('   Error details:', error.error);
      }
      throw new Error('Failed to authenticate with IEC API: ' + (error.error_description || error.message));
    }
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
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      switch (status) {
        case 401:
          return new Error('IEC API authentication failed. Please check credentials.');
        case 403:
          return new Error('IEC API access forbidden. Insufficient permissions.');
        case 404:
          return new Error('IEC API endpoint not found.');
        case 429:
          return new Error('IEC API rate limit exceeded. Please try again later.');
        case 500:
          return new Error('IEC API server error. Please try again later.');
        default:
          return new Error('IEC API error: ' + message + '');
      }
    } else if (error.request) {
      // Network error
      return new Error('IEC API network error. Please check your connection.');
    } else {
      // Other error
      return new Error('IEC API error: ' + error.message + '');
    }
  }

  /**
   * Verify voter details by ID number using IEC API
   */
  async verifyVoter(idNumber: string): Promise<IECVoterDetails | null> {
    try {
      // Check rate limit
      this.checkRateLimit();

      // Get access token
      const token = await this.getAccessToken();

      console.log(`🔍 Checking voter registration for ID: ${idNumber}`);

      // Make API request using CloudScraper (matching Python implementation)
      // Python: response = scraper.get(voter_url, headers=headers, timeout=60)
      const response = await this.scraper.get({
        uri: `https://api.elections.org.za/api/Voters/IDNumber/${idNumber}`,
        json: true,
        timeout: 60000, // 60 seconds (matching Python timeout=60)
        headers: {
          'Authorization': `Bearer ${token}`, // Note: Capital 'B' in Bearer (matching Python)
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        cloudflareTimeout: 60000,
        cloudflareMaxTimeout: 60000
      }) as IECVoterResponse;

      console.log('IEC API response received:', {
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

          // 2. Map Municipality - Use municipality mapping table or lookup by name
          const municipalityMapping = await prisma.iec_municipality_mappings.findFirst({
            where: {
              iec_municipality_id: delimitation.MunicipalityID.toString()
            },
            select: {
              municipality_code: true
            }
          });

          if (municipalityMapping) {
            voterDetails.municipality_code = municipalityMapping.municipality_code;
            console.log(` Municipality mapped: IEC Municipality ID ${delimitation.MunicipalityID} → ${municipalityMapping.municipality_code}`);

            // Get district code from municipality
            const municipality = await prisma.municipalities.findUnique({
              where: {
                municipality_code: municipalityMapping.municipality_code
              },
              select: {
                district_code: true
              }
            });

            if (municipality?.district_code) {
              voterDetails.district_code = municipality.district_code;
              console.log(` District mapped: ${municipality.district_code}`);
            }
          } else {
            // Fallback: Try to find municipality by name matching
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
              console.log(`✅ Municipality mapped (by name): ${delimitation.Municipality} → ${municipality.municipality_code}`);
            } else {
              console.warn(`⚠️ No municipality found for: ${delimitation.Municipality}`);
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
      console.error('Error verifying voter:', error.response?.data || error.message);

      // If voter not found, return null instead of throwing error
      if (error.response?.status === 404) {
        console.log('ℹ Voter not found in IEC database');
        return {
          id_number: idNumber,
          is_registered: false,
          voter_status: 'Not Registered'
        };
      }

      throw createDatabaseError('Failed to verify voter with IEC API', error);
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
