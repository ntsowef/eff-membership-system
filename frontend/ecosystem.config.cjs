module.exports = {
  apps: [
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
      time: true
    }
  ]
};

