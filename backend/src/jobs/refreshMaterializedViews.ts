/**
 * Scheduled Job: Refresh Materialized Views for Ward Audit, Analytics & Dashboard Systems
 *
 * This job refreshes the materialized views used by the ward audit, analytics, and
 * hierarchical dashboard systems to ensure data is up-to-date while maintaining fast query performance.
 *
 * Schedule: Every 15 minutes
 *
 * Materialized Views Refreshed:
 *   Ward Audit:
 *     - mv_voting_district_compliance
 *     - mv_ward_compliance_summary
 *   Analytics:
 *     - mv_membership_analytics_summary
 *     - mv_geographic_performance
 *     - mv_membership_growth_monthly
 *   Hierarchical Dashboard:
 *     - mv_hierarchical_dashboard_stats
 */

import cron from 'node-cron';
import { executeQuery } from '../config/database';
import logger from '../utils/logger';

/**
 * Check if a materialized view exists in the database
 */
async function materializedViewExists(viewName: string): Promise<boolean> {
  try {
    const result = await executeQuery<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_matviews WHERE matviewname = $1
      ) as exists`,
      [viewName]
    );
    return result[0]?.exists ?? false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a PostgreSQL function exists
 */
async function functionExists(functionName: string): Promise<boolean> {
  try {
    const result = await executeQuery<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = $1
      ) as exists`,
      [functionName]
    );
    return result[0]?.exists ?? false;
  } catch (error) {
    return false;
  }
}

/**
 * Safely refresh a materialized view if it exists
 */
async function safeRefreshMaterializedView(viewName: string): Promise<boolean> {
  const exists = await materializedViewExists(viewName);
  if (!exists) {
    logger.warn(`⚠️ Materialized view ${viewName} does not exist - skipping refresh`);
    return false;
  }

  await executeQuery(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`, []);
  return true;
}

/**
 * Refresh ward audit materialized views
 */
async function refreshWardAuditViews(): Promise<void> {
  const startTime = Date.now();

  try {
    // Check if the refresh function exists before calling it
    const fnExists = await functionExists('refresh_ward_audit_materialized_views');
    if (!fnExists) {
      logger.warn('⚠️ Ward audit refresh function does not exist - skipping');
      return;
    }

    logger.info('Starting materialized view refresh for ward audit system...');

    // Call the PostgreSQL function that refreshes both views in correct order
    await executeQuery('SELECT refresh_ward_audit_materialized_views()', []);

    const duration = Date.now() - startTime;

    logger.info(`✅ Ward audit views refreshed successfully in ${duration}ms`, {
      duration_ms: duration,
      refreshed_at: new Date().toISOString()
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('❌ Failed to refresh ward audit views', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration
    });

    // Don't throw - we don't want to crash the server
    // The next scheduled run will try again
  }
}

/**
 * Refresh analytics materialized views
 */
async function refreshAnalyticsViews(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting materialized view refresh for analytics system...');

    // Safely refresh each view (skips if view doesn't exist)
    const results = await Promise.all([
      safeRefreshMaterializedView('mv_membership_analytics_summary'),
      safeRefreshMaterializedView('mv_geographic_performance'),
      safeRefreshMaterializedView('mv_membership_growth_monthly')
    ]);

    const refreshedCount = results.filter(r => r).length;
    const duration = Date.now() - startTime;

    if (refreshedCount > 0) {
      logger.info(`✅ Analytics views refreshed: ${refreshedCount}/3 in ${duration}ms`, {
        duration_ms: duration,
        refreshed_at: new Date().toISOString()
      });
    } else {
      logger.warn('⚠️ No analytics materialized views found to refresh');
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('❌ Failed to refresh analytics views', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration
    });

    // Don't throw - we don't want to crash the server
    // The next scheduled run will try again
  }
}

/**
 * Refresh hierarchical dashboard materialized view
 */
async function refreshHierarchicalDashboardView(): Promise<void> {
  const startTime = Date.now();

  try {
    // Safely refresh (skips if view doesn't exist)
    const refreshed = await safeRefreshMaterializedView('mv_hierarchical_dashboard_stats');

    const duration = Date.now() - startTime;

    if (refreshed) {
      logger.info(`✅ Hierarchical dashboard view refreshed successfully in ${duration}ms`, {
        duration_ms: duration,
        refreshed_at: new Date().toISOString()
      });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('❌ Failed to refresh hierarchical dashboard view', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration
    });

    // Don't throw - we don't want to crash the server
    // The next scheduled run will try again
  }
}

/**
 * Refresh all materialized views
 */
async function refreshAllViews(): Promise<void> {
  await Promise.all([
    refreshWardAuditViews(),
    refreshAnalyticsViews(),
    refreshHierarchicalDashboardView()
  ]);
}

/**
 * Schedule the materialized view refresh job
 * Runs every 15 minutes (cron: star-slash-15 star star star star)
 */
export function scheduleWardAuditViewRefresh(): void {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await refreshAllViews();
  });

  logger.info('📅 Scheduled materialized view refresh for ward audit & analytics (every 15 minutes)');

  // Run immediately on startup to ensure views are fresh
  setTimeout(async () => {
    logger.info('🚀 Running initial materialized view refresh on startup...');
    await refreshAllViews();
  }, 5000); // Wait 5 seconds after startup
}

/**
 * Manual refresh function (can be called from API endpoint)
 */
export async function manualRefreshWardAuditViews(): Promise<{ duration_ms: number; refreshed_at: Date }> {
  const startTime = Date.now();

  await refreshAllViews();

  const duration = Date.now() - startTime;

  return {
    duration_ms: duration,
    refreshed_at: new Date()
  };
}

/**
 * Manual refresh for analytics views only
 */
export async function manualRefreshAnalyticsViews(): Promise<{ duration_ms: number; refreshed_at: Date }> {
  const startTime = Date.now();

  await refreshAnalyticsViews();

  const duration = Date.now() - startTime;

  return {
    duration_ms: duration,
    refreshed_at: new Date()
  };
}

