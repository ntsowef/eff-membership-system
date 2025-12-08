/**
 * PM2 Ecosystem Configuration for EFF Membership Management System
 * Backend Server - Production Configuration
 * 
 * This file configures PM2 process manager for the backend API
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'eff-api',
      
      // Script to run
      script: './dist/app.js',
      
      // Working directory
      cwd: '/opt/eff-membership/backend',
      
      // Instances (cluster mode)
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Auto restart
      autorestart: true,
      watch: false,
      
      // Maximum memory before restart (1GB)
      max_memory_restart: '1G',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Logging
      error_file: '/opt/eff-membership/logs/pm2/eff-api-error.log',
      out_file: '/opt/eff-membership/logs/pm2/eff-api-out.log',
      log_file: '/opt/eff-membership/logs/pm2/eff-api-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Advanced features
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Cron restart (optional - restart daily at 3 AM)
      // cron_restart: '0 3 * * *',
      
      // Post-deploy hooks
      post_update: ['npm install', 'npm run build'],
      
      // Health check
      // Uncomment if you have a health check endpoint
      // health_check: {
      //   url: 'http://localhost:5000/api/v1/health',
      //   interval: 30000,
      //   timeout: 5000
      // }
    },
    
    // Optional: Background job processor
    {
      name: 'eff-worker',
      script: './dist/jobs/worker.js',
      cwd: '/opt/eff-membership/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background'
      },
      
      error_file: '/opt/eff-membership/logs/pm2/eff-worker-error.log',
      out_file: '/opt/eff-membership/logs/pm2/eff-worker-out.log',
      time: true,
      
      // Only start if worker.js exists
      // Comment out if you don't have a worker process
      // ignore_watch: ['node_modules', 'logs']
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'BACKEND_SERVER_IP',
      ref: 'origin/main',
      repo: 'https://github.com/ntsowef/eff-membership-system.git',
      path: '/opt/eff-membership',
      'post-deploy': 'cd backend && npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y'
    }
  }
};

