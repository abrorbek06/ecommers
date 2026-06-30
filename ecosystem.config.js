// ⚠️ DEPRECATED: PM2 Configuration
// 
// This project uses Docker Compose for production deployment.
// PM2 should NOT be used in production as it conflicts with Docker container management.
// 
// This file is kept only for local development purposes.
// For production deployment, use: ./one-click.sh
//
// To use PM2 locally (development only):
//   npm run build
//   npm run pm2:start
//
// For production deployment:
//   ./one-click.sh

module.exports = {
  apps: [
    {
      name: 'sales-bot',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 8000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
