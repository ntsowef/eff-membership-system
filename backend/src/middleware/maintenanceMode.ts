
import { Request, Response, NextFunction } from 'express';
import { MaintenanceModeService } from '../services/maintenanceModeService';
import { UserDetails } from '../models/users';

export interface MaintenanceModeOptions {
  // Paths that should always be accessible during maintenance
  exemptPaths?: string[];
  // API endpoints that should be accessible during maintenance
  exemptApiPaths?: string[];
  // Check maintenance mode for specific levels only
  checkLevels?: string[];
  // Custom maintenance response
  customResponse?: (req: Request, res: Response) => void;
}

/**
 * Middleware to check maintenance mode status and handle requests accordingly
 */
export const maintenanceModeMiddleware = (options: MaintenanceModeOptions = {}) => {
  const {
    exemptPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/logout',
      '/api/v1/maintenance/status',
      '/api/v1/maintenance/toggle',
      '/api/v1/health'
    ],
    exemptApiPaths = [
      '/auth/login',
      '/auth/logout',
      '/maintenance/status',
      '/maintenance/toggle',
      '/health'
    ],
    checkLevels = ['full_system', 'api_only'],
    customResponse
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get client IP
      const clientIP = getClientIP(req);
      
      // Check if path is exempt
      if (isPathExempt(req.path, exemptPaths, exemptApiPaths)) {
        return next();
      }

      // Get maintenance status
      const maintenanceStatus = await MaintenanceModeService.getCurrentStatus();
      
      if (!maintenanceStatus || !maintenanceStatus.is_enabled) {
        return next();
      }

      // Check if maintenance level applies to this request
      if (!checkLevels.includes(maintenanceStatus.maintenance_level)) {
        return next();
      }

      // For API-only maintenance, only block API requests
      if (maintenanceStatus.maintenance_level === 'api_only' && !req.path.startsWith('/api/')) {
        return next();
      }

      // For frontend-only maintenance, only block non-API requests
      if (maintenanceStatus.maintenance_level === 'frontend_only' && req.path.startsWith('/api/')) {
        return next();
      }

      // Check if user can bypass maintenance mode
      const user = req.user;
      const bypassCheck = await MaintenanceModeService.canUserBypass(
        user?.id || null,
        user?.role_name || null,
        user?.admin_level || null,
        clientIP
      );

      if (bypassCheck.canBypass) {
        // Add bypass information to response headers for debugging
        res.setHeader('X-Maintenance-Bypass', bypassCheck.reason);
        return next();
      }

      // Handle maintenance mode response
      if (customResponse) {
        return customResponse(req, res);
      }

      // Default maintenance mode response
      return sendMaintenanceResponse(req, res, maintenanceStatus);

    } catch (error) {
      console.error('Error in maintenance mode middleware:', error);
      // In case of error, allow request to proceed to avoid breaking the system
      return next();
    }
  };
};

/**
 * Check if a path is exempt from maintenance mode
 */
function isPathExempt(path: string, exemptPaths: string[], exemptApiPaths: string[]): boolean {
  // Check full paths
  if (exemptPaths.includes(path)) {
    return true;
  }

  // Check API paths (remove /api/v1 prefix)
  const apiPath = path.replace(/^\/api\/v\d+/, '');
  if (exemptApiPaths.includes(apiPath)) {
    return true;
  }

  // Check for wildcard matches
  for (const exemptPath of exemptPaths) {
    if (exemptPath.endsWith('*') && path.startsWith(exemptPath.slice(0, -1))) {
      return true;
    }
  }

  return false;
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Send maintenance mode response
 */
function sendMaintenanceResponse(req: Request, res: Response, maintenanceStatus: any): void {
  const isApiRequest = req.path.startsWith('/api/') || 
                      req.headers.accept?.includes('application/json') ||
                      req.headers['content-type']?.includes('application/json');

  if (isApiRequest) {
    // API response
    res.status(503).json({
      success: false,
      error: {
        code: 'MAINTENANCE_MODE',
        message: maintenanceStatus.maintenance_message,
        maintenance_level: maintenanceStatus.maintenance_level,
        estimated_end: maintenanceStatus.minutes_until_end ? 
          new Date(Date.now() + maintenanceStatus.minutes_until_end * 60000).toISOString() : null
      },
      timestamp: new Date().toISOString()
    });
  } else {
    // HTML response for web requests
    const maintenanceHtml = generateMaintenanceHTML(maintenanceStatus);
    res.status(503).set('Content-Type', 'text/html').send(maintenanceHtml);
  }
}

/**
 * Generate maintenance mode HTML page
 */
function generateMaintenanceHTML(maintenanceStatus: any): string {
  const estimatedEnd = maintenanceStatus.minutes_until_end ? 
    new Date(Date.now() + maintenanceStatus.minutes_until_end * 60000).toLocaleString() : null;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>System Maintenance</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .maintenance-container {
          background: white;
          border-radius: 12px;
          padding: 3rem;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .maintenance-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 2rem;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .estimated-time {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          border-left: 4px solid #007bff;
        }
        .refresh-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s;
        }
        .refresh-button:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="maintenance-container">
        <div class="maintenance-icon">🔧</div>
        <h1>System Under Maintenance</h1>
        <p>${maintenanceStatus.maintenance_message}</p>
        ${estimatedEnd ? `
          <div class="estimated-time">
            <strong>Estimated completion:</strong><br>
            ${estimatedEnd}
          </div>
        ` : ''}
        <button class="refresh-button" onclick="window.location.reload()">
          Check Again
        </button>
      </div>
      
      <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
          window.location.reload();
        }, 30000);
      </script>
    </body>
    </html>
  `;
}

/**
 * Middleware specifically for admin routes that should always be accessible
 */
export const adminBypassMaintenanceMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      return next();
    }

    // Check if user is admin
    const adminLevels = ['super_admin', 'national', 'province', 'district', 'municipality', 'ward'];
    if ((user.admin_level && adminLevels.includes(user.admin_level)) || user.role_name === 'super_admin') {
      // Add header to indicate admin bypass
      res.setHeader('X-Admin-Bypass', 'true');
    }
    
    next();
  } catch (error) {
    console.error('Error in admin bypass middleware:', error);
    next();
  }
};

/**
 * Scheduled maintenance checker - should be run periodically
 */
export const scheduledMaintenanceChecker = async (): Promise<void> => {
  try {
    await MaintenanceModeService.checkScheduledMaintenance();
  } catch (error) {
    console.error('Error checking scheduled maintenance:', error);
  }
};
