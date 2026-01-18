// PM2 Production Configuration for EFF Membership System
// Location: /var/www/eff-membership-system/ecosystem.production.config.js
// Usage: pm2 start ecosystem.production.config.js
//
// This configuration manages:
// 1. Backend API Server (Node.js)
// 2. Frontend Static Server (serve package)
// 3. Python Bulk Upload Processor
//
// Note: For production, you can also serve frontend with Nginx instead of PM2

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
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};

