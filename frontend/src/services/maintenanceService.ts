import axios from 'axios';

export interface MaintenanceStatus {
  is_enabled: boolean;
  status: 'active' | 'scheduled' | 'should_be_active' | 'inactive';
  maintenance_message: string;
  maintenance_level: string;
  minutes_until_start?: number | null;
  minutes_until_end?: number | null;
  enabled_by_name?: string | null;
  enabled_by_email?: string | null;
}

export interface MaintenanceError {
  code: 'MAINTENANCE_MODE';
  message: string;
  maintenance_level: string;
  estimated_end?: string | null;
}

export class MaintenanceService {
  private static instance: MaintenanceService;
  private statusCache: MaintenanceStatus | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): MaintenanceService {
    if (!MaintenanceService.instance) {
      MaintenanceService.instance = new MaintenanceService();
    }
    return MaintenanceService.instance;
  }

  /**
   * Check if response indicates maintenance mode
   */
  static isMaintenanceError(error: any): boolean {
    return error?.response?.status === 503 && 
           error?.response?.data?.error?.code === 'MAINTENANCE_MODE';
  }

  /**
   * Extract maintenance error details
   */
  static getMaintenanceError(error: any): MaintenanceError | null {
    if (!this.isMaintenanceError(error)) {
      return null;
    }
    return error.response.data.error;
  }

  /**
   * Get current maintenance status
   */
  async getStatus(forceRefresh = false): Promise<MaintenanceStatus> {
    const now = Date.now();
    
    // Return cached status if still valid
    if (!forceRefresh && this.statusCache && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.statusCache;
    }

    try {
      const response = await axios.get('/api/v1/maintenance/status');
      
      if (response.data.success) {
        this.statusCache = response.data.data;
        this.lastFetch = now;
        return this.statusCache!;
      } else {
        throw new Error('Failed to fetch maintenance status');
      }
    } catch (error) {
      // If we can't fetch status, assume system is operational
      const fallbackStatus: MaintenanceStatus = {
        is_enabled: false,
        status: 'inactive',
        maintenance_message: '',
        maintenance_level: 'full_system'
      };
      
      this.statusCache = fallbackStatus;
      this.lastFetch = now;
      return fallbackStatus;
    }
  }

  /**
   * Check if user can bypass maintenance mode
   */
  async canBypass(): Promise<boolean> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return false;

      const response = await axios.get('/api/v1/maintenance/bypass-check', {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.success && response.data.data.can_bypass;
    } catch (error) {
      return false;
    }
  }

  /**
   * Toggle maintenance mode (admin only)
   */
  async toggle(enabled: boolean, message?: string, level?: string): Promise<MaintenanceStatus> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await axios.post('/api/v1/maintenance/toggle', {
      enabled,
      message: message || 'The system is currently under maintenance. Please check back shortly.',
      level: level || 'full_system'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      this.statusCache = response.data.data;
      this.lastFetch = Date.now();
      return this.statusCache!;
    } else {
      throw new Error(response.data.error?.message || 'Failed to toggle maintenance mode');
    }
  }

  /**
   * Schedule maintenance mode (admin only)
   */
  async schedule(
    startTime: Date,
    endTime: Date,
    message?: string,
    level?: string
  ): Promise<MaintenanceStatus> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await axios.post('/api/v1/maintenance/schedule', {
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      message: message || 'The system is currently under maintenance. Please check back shortly.',
      level: level || 'full_system'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      this.statusCache = response.data.data;
      this.lastFetch = Date.now();
      return this.statusCache!;
    } else {
      throw new Error(response.data.error?.message || 'Failed to schedule maintenance');
    }
  }

  /**
   * Get maintenance logs (admin only)
   */
  async getLogs(page = 1, limit = 20): Promise<any[]> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await axios.get('/api/v1/maintenance/logs', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page, limit }
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error?.message || 'Failed to fetch maintenance logs');
    }
  }

  /**
   * Clear cached status
   */
  clearCache(): void {
    this.statusCache = null;
    this.lastFetch = 0;
  }

  /**
   * Start periodic status checking
   */
  startPeriodicCheck(interval = 60000, callback?: (status: MaintenanceStatus) => void): () => void {
    const intervalId = setInterval(async () => {
      try {
        const status = await this.getStatus(true);
        callback?.(status);
      } catch (error) {
        console.warn('Failed to check maintenance status:', error);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }
}

// Export singleton instance
export const maintenanceService = MaintenanceService.getInstance();
