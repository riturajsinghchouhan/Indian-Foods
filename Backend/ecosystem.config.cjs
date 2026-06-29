module.exports = {
  apps: [
    {
      name: 'indian-foods-api',
      script: './server.js',

      // Cluster mode: utilizes all CPU cores on the VPS.
      // Since socket.js already uses the Redis adapter,
      // Socket.IO works seamlessly across all worker processes.
      instances: 'max',
      exec_mode: 'cluster',

      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Log Management (Crucial for KV2 VPS to prevent disk exhaustion)
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Environment variables (production)
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
