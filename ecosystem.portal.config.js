// PM2 Production Configuration for EFF Membership Portal
// ============================================================================
// Location: /var/www/eff-membership-system/ecosystem.portal.config.js
// Usage: pm2 start ecosystem.portal.config.js
//
// This configuration manages both backend and frontend on the same server:
// 1. Backend API Server (Node.js) - Port 5000
// 2. Frontend Static Server (serve) - Port 3000 (optional, Nginx can serve static)
//
// Note: Frontend is served via Nginx directly from /frontend/dist
//       The eff-frontend process below is OPTIONAL if using Nginx static serving
// ============================================================================

module.exports = {
  apps: [
    // =========================================================================
    // 1. Backend API Server (Node.js + Express)
    // =========================================================================
    {
      name: 'eff-backend',
      script: './dist/app.js',
      cwd: '/var/www/eff-membership-system/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Environment Variables
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Logging
      error_file: '/var/www/eff-membership-system/logs/backend-error.log',
      out_file: '/var/www/eff-membership-system/logs/backend-out.log',
      log_file: '/var/www/eff-membership-system/logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },

    // =========================================================================
    // 2. Frontend Static Server (OPTIONAL - Use if not serving via Nginx)
    // =========================================================================
    // Uncomment this section if you want PM2 to serve the frontend
    // instead of Nginx serving static files directly
    /*
    {
      name: 'eff-frontend',
      script: 'serve',
      args: '-s dist -l 3000 -n',
      cwd: '/var/www/eff-membership-system/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      
      env: {
        NODE_ENV: 'production'
      },
      
      error_file: '/var/www/eff-membership-system/logs/frontend-error.log',
      out_file: '/var/www/eff-membership-system/logs/frontend-out.log',
      log_file: '/var/www/eff-membership-system/logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
    */
  ],
  
  // ===========================================================================
  // Deployment Configuration
  // ===========================================================================
  deploy: {
    production: {
      user: 'deploy',
      host: 'portal.effmemberportal.org',
      ref: 'origin/main',
      repo: 'https://github.com/ntsowef/eff-membership-system.git',
      path: '/var/www/eff-membership-system',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && cd backend && npm install && npm run build && pm2 reload ecosystem.portal.config.js --env production',
      'pre-setup': ''
    }
  }
};

