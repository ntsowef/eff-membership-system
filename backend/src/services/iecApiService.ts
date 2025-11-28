import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '../config/config';
import { createDatabaseError } from '../middleware/errorHandler';

// IEC API Response Types
export interface IECVoterDetails {
  id_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  address: string;
  voting_district: string;
  ward_code: string;
  municipality: string;
  province: string;
  registration_status: string;
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
  private client: AxiosInstance;
  private rateLimitCount: number = 0;
  private rateLimitResetTime: number = Date.now() + 60000; // Reset every minute

  constructor() {
    this.client = axios.create({
      baseURL: config.iec.apiUrl,
      timeout: config.iec.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'GEOMAPS-Membership-System/1.0'
      }
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (requestConfig) => {
        // Add basic authentication
        const credentials = Buffer.from(
          '${config.iec.username}:' + config.iec.password + ''
        ).toString('base64');

        requestConfig.headers.Authorization = 'Basic ' + credentials + '';

        // Rate limiting check
        this.checkRateLimit();

        return requestConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

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
   * Verify voter details by ID number
   */
  async verifyVoter(idNumber: string): Promise<IECVoterDetails | null> {
    try {
      const response = await this.client.get<IECApiResponse<IECVoterDetails>>(
        '/voters/verify/' + idNumber + ''
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('Error verifying voter:', error);
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
