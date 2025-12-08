// PM2 Configuration for EFF Membership System
// This file manages both backend and frontend processes
// Using .cjs extension for CommonJS compatibility

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
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true
    },
    
    // Frontend React App (Development Server)
    {
      name: 'eff-frontend',
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0',
      cwd: '/root/Application/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true
    }
  ]
};

