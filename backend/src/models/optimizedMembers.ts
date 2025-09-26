import { executeQuery, executeQuerySingle } from '../config/database';
import { cacheService, CacheTTL } from '../services/cacheService';
import { DatabaseError } from '../middleware/errorHandler';

// Optimized member interface for high-performance queries
export interface OptimizedMemberData {
  member_id: string;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  province_name: string;
  municipality_name: string;
  ward_number: string;
  voting_station_name: string;
  membership_type: string;
  join_date: string;
  expiry_date: string;
  id_number?: string;
}

export class OptimizedMemberModel {
  // Cache keys
  private static readonly CACHE_PREFIX = 'member:';
  private static readonly CACHE_PREFIX_ID_NUMBER = 'member:id_number:';
  private static readonly CACHE_PREFIX_MEMBER_ID = 'member:member_id:';
  
  // Cache TTL for different types of data
  private static readonly MEMBER_CACHE_TTL = CacheTTL.LONG; // 1 hour
  private static readonly MEMBER_LIST_CACHE_TTL = CacheTTL.MEDIUM; // 30 minutes

  /**
   * Get member by ID number with aggressive caching
   * Optimized for high concurrency
   */
  static async getMemberByIdNumberOptimized(idNumber: string): Promise<OptimizedMemberData | null> {
    const cacheKey = `${this.CACHE_PREFIX_ID_NUMBER}${idNumber}`;
    
    try {
      // Try cache first
      const cachedMember = await cacheService.get(cacheKey);
      if (cachedMember) {
        return cachedMember as OptimizedMemberData;
      }

      // Use optimized stored procedure
      const query = 'CALL sp_get_member_by_id_number_optimized(?)';
      const results = await executeQuery(query, [idNumber]);
      
      // Handle stored procedure result format
      const memberData = results[0]?.[0] || null;
      
      if (memberData) {
        // Cache the result
        await cacheService.set(cacheKey, memberData, this.MEMBER_CACHE_TTL);
        
        // Also cache by member_id for cross-referencing
        const memberIdCacheKey = `${this.CACHE_PREFIX_MEMBER_ID}${memberData.member_id}`;
        await cacheService.set(memberIdCacheKey, memberData, this.MEMBER_CACHE_TTL);
      }

      return memberData;
    } catch (error) {
      console.error('Error in getMemberByIdNumberOptimized:', error);
      
      // Fallback to direct query if stored procedure fails
      return this.getMemberByIdNumberFallback(idNumber);
    }
  }

  /**
   * Get member by member ID with aggressive caching
   */
  static async getMemberByIdOptimized(memberId: string): Promise<OptimizedMemberData | null> {
    const cacheKey = `${this.CACHE_PREFIX_MEMBER_ID}${memberId}`;
    
    try {
      // Try cache first
      const cachedMember = await cacheService.get(cacheKey);
      if (cachedMember) {
        return cachedMember as OptimizedMemberData;
      }

      // Use optimized stored procedure
      const query = 'CALL sp_get_member_by_id_optimized(?)';
      const results = await executeQuery(query, [memberId]);
      
      // Handle stored procedure result format
      const memberData = results[0]?.[0] || null;
      
      if (memberData) {
        // Cache the result
        await cacheService.set(cacheKey, memberData, this.MEMBER_CACHE_TTL);
        
        // Also cache by id_number for cross-referencing
        if (memberData.id_number) {
          const idNumberCacheKey = `${this.CACHE_PREFIX_ID_NUMBER}${memberData.id_number}`;
          await cacheService.set(idNumberCacheKey, memberData, this.MEMBER_CACHE_TTL);
        }
      }

      return memberData;
    } catch (error) {
      console.error('Error in getMemberByIdOptimized:', error);
      
      // Fallback to direct query if stored procedure fails
      return this.getMemberByIdFallback(memberId);
    }
  }

  /**
   * Fallback method using vw_member_details view when cache table doesn't exist
   */
  private static async getMemberByIdNumberFallback(idNumber: string): Promise<OptimizedMemberData | null> {
    try {
      // First try the cache table
      const cacheQuery = `
        SELECT
          member_id,
          membership_number,
          SUBSTRING_INDEX(full_name, ' ', 1) as first_name,
          CASE
            WHEN LOCATE(' ', full_name) > 0
            THEN SUBSTRING(full_name, LOCATE(' ', full_name) + 1)
            ELSE ''
          END as last_name,
          email,
          phone as phone_number,
          province_name,
          municipality_name,
          ward_number,
          voting_station_name,
          'Standard' as membership_type,
          join_date,
          expiry_date,
          id_number
        FROM member_cache_summary
        WHERE id_number = ?
          AND membership_status = 'Active'
        LIMIT 1
      `;

      try {
        return await executeQuerySingle<OptimizedMemberData>(cacheQuery, [idNumber]);
      } catch (cacheError: any) {
        // If cache table doesn't exist, fall back to vw_member_details
        if (cacheError.code === 'ER_NO_SUCH_TABLE') {
          console.log('Cache table not found, using vw_member_details fallback');

          const fallbackQuery = `
            SELECT
              member_id,
              CONCAT('MEM', LPAD(member_id, 6, '0')) as membership_number,
              firstname as first_name,
              COALESCE(surname, '') as last_name,
              COALESCE(email, '') as email,
              COALESCE(cell_number, '') as phone_number,
              province_name,
              municipality_name,
              ward_number,
              COALESCE(voting_station_name, 'Not Available') as voting_station_name,
              'Standard' as membership_type,
              member_created_at as join_date,
              DATE_ADD(member_created_at, INTERVAL 365 DAY) as expiry_date,
              id_number
            FROM vw_member_details
            WHERE id_number = ?
            LIMIT 1
          `;

          return await executeQuerySingle<OptimizedMemberData>(fallbackQuery, [idNumber]);
        }
        throw cacheError;
      }
    } catch (error) {
      console.error('Error in fallback query:', error);
      throw new DatabaseError('Failed to fetch member data', error);
    }
  }

  /**
   * Fallback method for member ID lookup
   */
  private static async getMemberByIdFallback(memberId: string): Promise<OptimizedMemberData | null> {
    try {
      // First try the cache table
      const cacheQuery = `
        SELECT
          member_id,
          membership_number,
          SUBSTRING_INDEX(full_name, ' ', 1) as first_name,
          CASE
            WHEN LOCATE(' ', full_name) > 0
            THEN SUBSTRING(full_name, LOCATE(' ', full_name) + 1)
            ELSE ''
          END as last_name,
          email,
          phone as phone_number,
          province_name,
          municipality_name,
          ward_number,
          voting_station_name,
          'Standard' as membership_type,
          join_date,
          expiry_date
        FROM member_cache_summary
        WHERE member_id = ?
          AND membership_status = 'Active'
        LIMIT 1
      `;

      try {
        return await executeQuerySingle<OptimizedMemberData>(cacheQuery, [memberId]);
      } catch (cacheError: any) {
        // If cache table doesn't exist, fall back to vw_member_details
        if (cacheError.code === 'ER_NO_SUCH_TABLE') {
          console.log('Cache table not found, using vw_member_details fallback for member ID lookup');

          const fallbackQuery = `
            SELECT
              member_id,
              CONCAT('MEM', LPAD(member_id, 6, '0')) as membership_number,
              firstname as first_name,
              COALESCE(surname, '') as last_name,
              COALESCE(email, '') as email,
              COALESCE(cell_number, '') as phone_number,
              province_name,
              municipality_name,
              ward_number,
              COALESCE(voting_station_name, 'Not Available') as voting_station_name,
              'Standard' as membership_type,
              member_created_at as join_date,
              DATE_ADD(member_created_at, INTERVAL 365 DAY) as expiry_date
            FROM vw_member_details
            WHERE member_id = ?
            LIMIT 1
          `;

          return await executeQuerySingle<OptimizedMemberData>(fallbackQuery, [memberId]);
        }
        throw cacheError;
      }
    } catch (error) {
      console.error('Error in member ID fallback query:', error);
      throw new DatabaseError('Failed to fetch member data', error);
    }
  }

  /**
   * Batch get members by ID numbers (for bulk operations)
   */
  static async getMembersByIdNumbersBatch(idNumbers: string[]): Promise<OptimizedMemberData[]> {
    if (idNumbers.length === 0) return [];
    
    const cacheKeys = idNumbers.map(id => `${this.CACHE_PREFIX_ID_NUMBER}${id}`);

    // Get cached results individually (since mget is not available)
    const cachedResults = await Promise.all(
      cacheKeys.map(key => cacheService.get(key))
    );

    const uncachedIdNumbers: string[] = [];
    const results: OptimizedMemberData[] = [];

    // Separate cached and uncached
    idNumbers.forEach((idNumber, index) => {
      if (cachedResults[index]) {
        results.push(cachedResults[index] as OptimizedMemberData);
      } else {
        uncachedIdNumbers.push(idNumber);
      }
    });
    
    // Fetch uncached members
    if (uncachedIdNumbers.length > 0) {
      const placeholders = uncachedIdNumbers.map(() => '?').join(',');
      const query = `
        SELECT 
          member_id,
          membership_number,
          SUBSTRING_INDEX(full_name, ' ', 1) as first_name,
          CASE 
            WHEN LOCATE(' ', full_name) > 0 
            THEN SUBSTRING(full_name, LOCATE(' ', full_name) + 1)
            ELSE ''
          END as last_name,
          email,
          phone as phone_number,
          province_name,
          municipality_name,
          ward_number,
          voting_station_name,
          'Standard' as membership_type,
          join_date,
          expiry_date,
          id_number
        FROM member_cache_summary 
        WHERE id_number IN (${placeholders})
          AND membership_status = 'Active'
      `;
      
      const uncachedMembers = await executeQuery<OptimizedMemberData>(query, uncachedIdNumbers);
      
      // Cache the newly fetched members
      const cachePromises = uncachedMembers.map(member => {
        const cacheKey = `${this.CACHE_PREFIX_ID_NUMBER}${member.id_number}`;
        return cacheService.set(cacheKey, member, this.MEMBER_CACHE_TTL);
      });
      
      await Promise.all(cachePromises);
      results.push(...uncachedMembers);
    }
    
    return results;
  }

  /**
   * Invalidate member cache
   */
  static async invalidateMemberCache(memberId: string, idNumber?: string): Promise<void> {
    const cacheKeys = [`${this.CACHE_PREFIX_MEMBER_ID}${memberId}`];
    
    if (idNumber) {
      cacheKeys.push(`${this.CACHE_PREFIX_ID_NUMBER}${idNumber}`);
    }
    
    await Promise.all(cacheKeys.map(key => cacheService.del(key)));
  }

  /**
   * Warm up cache with frequently accessed members
   */
  static async warmUpCache(limit: number = 1000): Promise<void> {
    try {
      const query = `
        SELECT 
          member_id,
          membership_number,
          SUBSTRING_INDEX(full_name, ' ', 1) as first_name,
          CASE 
            WHEN LOCATE(' ', full_name) > 0 
            THEN SUBSTRING(full_name, LOCATE(' ', full_name) + 1)
            ELSE ''
          END as last_name,
          email,
          phone as phone_number,
          province_name,
          municipality_name,
          ward_number,
          voting_station_name,
          'Standard' as membership_type,
          join_date,
          expiry_date,
          id_number
        FROM member_cache_summary 
        WHERE membership_status = 'Active'
        ORDER BY last_updated DESC
        LIMIT ?
      `;
      
      const members = await executeQuery<OptimizedMemberData>(query, [limit]);
      
      // Cache all members
      const cachePromises = members.map(member => {
        const promises = [
          cacheService.set(
            `${this.CACHE_PREFIX_MEMBER_ID}${member.member_id}`, 
            member, 
            this.MEMBER_CACHE_TTL
          )
        ];
        
        if (member.id_number) {
          promises.push(
            cacheService.set(
              `${this.CACHE_PREFIX_ID_NUMBER}${member.id_number}`, 
              member, 
              this.MEMBER_CACHE_TTL
            )
          );
        }
        
        return Promise.all(promises);
      });
      
      await Promise.all(cachePromises);
      console.log(`✅ Cache warmed up with ${members.length} members`);
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalCachedMembers: number;
    cacheHitRate: number;
    cacheSize: string;
  }> {
    try {
      const stats = await cacheService.getStats();
      return {
        totalCachedMembers: stats.keys || 0,
        cacheHitRate: stats.hitRate || 0,
        cacheSize: `${Math.round((stats.memoryUsage || 0) / 1024 / 1024)}MB`
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalCachedMembers: 0,
        cacheHitRate: 0,
        cacheSize: '0MB'
      };
    }
  }
}
