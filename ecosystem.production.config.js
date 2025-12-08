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
    },

    // =========================================================================
    // 2. Frontend Static Server (React Production Build)
    // =========================================================================
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
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // =========================================================================
    // 3. Python Bulk Upload Processor
    // =========================================================================
    {
      name: 'bulk-upload-processor',
      script: 'bulk_upload_processor.py',
      cwd: '/var/www/eff-membership-system/backend/python',
      interpreter: 'python3',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/processor-error.log',
      out_file: './logs/processor-out.log',
      log_file: './logs/processor-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};

