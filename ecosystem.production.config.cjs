// PM2 Production Configuration for EFF Membership System
// This configuration serves the built frontend (production mode)

module.exports = {
  apps: [
    // Backend API Server
    {
      name: 'eff-backend',
      script: './dist/app.js',
      cwd: '/root/Application/backend',
      instances: 1,
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
      merge_logs: true
    },
    
    // Frontend - Production Build (Static Files)
    {
      name: 'eff-frontend-prod',
      script: 'serve',
      args: '-s dist -l 3000 -n',
      cwd: '/root/Application/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-prod-error.log',
      out_file: './logs/frontend-prod-out.log',
      log_file: './logs/frontend-prod-combined.log',
      time: true,
      merge_logs: true
    }
  ]
};

