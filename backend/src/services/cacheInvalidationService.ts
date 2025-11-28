import { cacheService } from './cacheService';

// Cache invalidation patterns for different data types
export const CacheInvalidationPatterns = {
  // Member-related cache patterns
  MEMBER: {
    ALL: 'member:*',
    SPECIFIC: (id: number) => 'member:*:' + id + '',
    LIST: 'member:*/list*',
    COUNT: 'member:*/count*'
  },
  
  // Analytics cache patterns
  ANALYTICS: {
    ALL: 'analytics:*',
    DASHBOARD: 'analytics:*/dashboard*',
    MEMBERSHIP: 'analytics:*/membership*',
    MEETINGS: 'analytics:*/meetings*',
    LEADERSHIP: 'analytics:*/leadership*',
    COMPREHENSIVE: 'analytics:*/comprehensive*'
  },
  
  // Statistics cache patterns
  STATISTICS: {
    ALL: 'statistics:*',
    WARD_MEMBERSHIP: 'statistics:*/ward-membership*',
    DEMOGRAPHICS: 'statistics:*/demographics*',
    TRENDS: 'statistics:*/membership-trends*',
    SYSTEM: 'statistics:*/system*'
  },
  
  // Geographic data cache patterns
  GEOGRAPHIC: {
    ALL: 'lookup:*/geographic*',
    PROVINCES: 'lookup:*/provinces*',
    MUNICIPALITIES: 'lookup:*/municipalities*',
    WARDS: 'lookup:*/wards*'
  },
  
  // Lookup data cache patterns
  LOOKUP: {
    ALL: 'lookup:*',
    GENDERS: 'lookup:*/genders*',
    RACES: 'lookup:*/races*',
    LANGUAGES: 'lookup:*/languages*',
    OCCUPATIONS: 'lookup:*/occupations*'
  }
};

// Cache invalidation service
export class CacheInvalidationService {
  
  // Invalidate member-related caches
  async invalidateMemberCaches(memberId?: number): Promise<void> {
    const patterns = [
      CacheInvalidationPatterns.MEMBER.ALL,
      CacheInvalidationPatterns.ANALYTICS.ALL,
      CacheInvalidationPatterns.STATISTICS.ALL
    ];
    
    if (memberId) {
      patterns.push(CacheInvalidationPatterns.MEMBER.SPECIFIC(memberId));
    }
    
    await this.invalidatePatterns(patterns);
    console.log(`Invalidated member caches${memberId ? ` for member ${memberId}` : ''}`);
  }
  
  // Invalidate analytics caches
  async invalidateAnalyticsCaches(specific?: string[]): Promise<void> {
    const patterns = specific || [CacheInvalidationPatterns.ANALYTICS.ALL];
    await this.invalidatePatterns(patterns);
    console.log('Invalidated analytics caches');
  }
  
  // Invalidate statistics caches
  async invalidateStatisticsCaches(specific?: string[]): Promise<void> {
    const patterns = specific || [CacheInvalidationPatterns.STATISTICS.ALL];
    await this.invalidatePatterns(patterns);
    console.log('Invalidated statistics caches');
  }
  
  // Invalidate geographic data caches
  async invalidateGeographicCaches(): Promise<void> {
    const patterns = [
      CacheInvalidationPatterns.GEOGRAPHIC.ALL,
      CacheInvalidationPatterns.ANALYTICS.ALL,
      CacheInvalidationPatterns.STATISTICS.ALL
    ];
    await this.invalidatePatterns(patterns);
    console.log('Invalidated geographic caches');
  }
  
  // Invalidate lookup data caches
  async invalidateLookupCaches(specific?: string[]): Promise<void> {
    const patterns = specific || [CacheInvalidationPatterns.LOOKUP.ALL];
    await this.invalidatePatterns(patterns);
    console.log('Invalidated lookup caches');
  }
  
  // Invalidate all caches
  async invalidateAllCaches(): Promise<void> {
    try {
      await cacheService.flushAll();
      console.log('Invalidated all caches');
    } catch (error) {
      console.error('Error invalidating all caches:', error);
      throw error;
    }
  }
  
  // Invalidate multiple patterns
  private async invalidatePatterns(patterns: string[]): Promise<void> {
    try {
      const promises = patterns.map(pattern => cacheService.delByPattern(pattern));
      const results = await Promise.all(promises);
      const totalDeleted = results.reduce((sum, count) => sum + count, 0);
      console.log(`Deleted ${totalDeleted} cache entries across ${patterns.length} patterns`);
    } catch (error) {
      console.error('Error invalidating cache patterns:', error);
      throw error;
    }
  }
  
  // Get cache invalidation statistics
  async getInvalidationStats(): Promise<{
    totalPatterns: number;
    availablePatterns: typeof CacheInvalidationPatterns;
  }> {
    const totalPatterns = Object.values(CacheInvalidationPatterns)
      .reduce((total, category) => total + Object.keys(category).length, 0);
    
    return {
      totalPatterns,
      availablePatterns: CacheInvalidationPatterns
    };
  }
}

// Create singleton instance
export const cacheInvalidationService = new CacheInvalidationService();

// Event-driven cache invalidation hooks
export const CacheInvalidationHooks = {
  
  // Hook for member operations
  onMemberChange: async (operation: 'create' | 'update' | 'delete', memberId: number) => {
    console.log(`Member ${operation} detected, invalidating caches...`);
    await cacheInvalidationService.invalidateMemberCaches(memberId);
    
    // Also invalidate related analytics and statistics
    await cacheInvalidationService.invalidateAnalyticsCaches([
      CacheInvalidationPatterns.ANALYTICS.DASHBOARD,
      CacheInvalidationPatterns.ANALYTICS.MEMBERSHIP
    ]);
    
    await cacheInvalidationService.invalidateStatisticsCaches([
      CacheInvalidationPatterns.STATISTICS.WARD_MEMBERSHIP,
      CacheInvalidationPatterns.STATISTICS.DEMOGRAPHICS,
      CacheInvalidationPatterns.STATISTICS.SYSTEM
    ]);
  },
  
  // Hook for membership application operations
  onMembershipApplicationChange: async (operation: 'create' | 'update' | 'approve' | 'reject') => {
    console.log(`Membership application ${operation} detected, invalidating caches...`);
    
    // Invalidate analytics and statistics that might be affected
    await cacheInvalidationService.invalidateAnalyticsCaches([
      CacheInvalidationPatterns.ANALYTICS.DASHBOARD,
      CacheInvalidationPatterns.ANALYTICS.MEMBERSHIP
    ]);
    
    await cacheInvalidationService.invalidateStatisticsCaches([
      CacheInvalidationPatterns.STATISTICS.SYSTEM,
      CacheInvalidationPatterns.STATISTICS.TRENDS
    ]);
  },
  
  // Hook for meeting operations
  onMeetingChange: async (operation: 'create' | 'update' | 'delete') => {
    console.log(`Meeting ${operation} detected, invalidating caches...`);

    await cacheInvalidationService.invalidateAnalyticsCaches([
      CacheInvalidationPatterns.ANALYTICS.MEETINGS,
      CacheInvalidationPatterns.ANALYTICS.DASHBOARD
    ]);
  },

  // Hook for leadership operations
  onLeadershipChange: async (operation: 'create' | 'update' | 'delete') => {
    console.log(`Leadership ${operation} detected, invalidating caches...`);

    await cacheInvalidationService.invalidateAnalyticsCaches([
      CacheInvalidationPatterns.ANALYTICS.LEADERSHIP,
      CacheInvalidationPatterns.ANALYTICS.DASHBOARD
    ]);
  },

  // Hook for geographic data changes
  onGeographicDataChange: async (operation: 'create' | 'update' | 'delete') => {
    console.log(`Geographic data ${operation} detected, invalidating caches...`);
    await cacheInvalidationService.invalidateGeographicCaches();
  },

  // Hook for lookup data changes
  onLookupDataChange: async (operation: 'create' | 'update' | 'delete', type: string) => {
    console.log(`Lookup data ${operation} detected, invalidating caches...`);

    if (type) {
      const specificPattern = (CacheInvalidationPatterns.LOOKUP as any)[type.toUpperCase()];
      if (specificPattern) {
        await cacheInvalidationService.invalidateLookupCaches([specificPattern]);
        return;
      }
    }
    
    await cacheInvalidationService.invalidateLookupCaches();
  },
  
  // Hook for bulk operations
  onBulkOperation: async (operation: string, affectedCount: number) => {
    console.log(`Bulk ${operation} completed (${affectedCount} records), invalidating all caches...`);

    // For bulk operations, it's safer to invalidate all caches
    await cacheInvalidationService.invalidateAllCaches();
  }
};

// Scheduled cache invalidation (for use with cron jobs)
export const ScheduledCacheInvalidation = {
  
  // Daily cache cleanup
  daily: async () => {
    console.log('Running daily cache cleanup...');
    
    // Clear analytics caches (they should be refreshed daily)
    await cacheInvalidationService.invalidateAnalyticsCaches();
    
    // Clear statistics caches
    await cacheInvalidationService.invalidateStatisticsCaches();
    
    console.log('Daily cache cleanup completed');
  },
  
  // Weekly cache cleanup
  weekly: async () => {
    console.log('Running weekly cache cleanup...');
    
    // Clear all caches for a fresh start
    await cacheInvalidationService.invalidateAllCaches();
    
    console.log('Weekly cache cleanup completed');
  },
  
  // Cache warm-up after cleanup
  warmUp: async () => {
    console.log('Starting cache warm-up...');
    
    // This would typically make requests to key endpoints to warm the cache
    // For now, we'll just log the intention
    const keyEndpoints = [
      '/api/v1/analytics/dashboard',
      '/api/v1/statistics/system',
      '/api/v1/statistics/demographics'
    ];
    
    console.log(`Would warm up ${keyEndpoints.length} key endpoints`);
    console.log('Cache warm-up completed');
  }
};
