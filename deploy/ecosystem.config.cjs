module.exports = {
  apps: [
    {
      name: 'technician-api',
      cwd: '/home/bitnami/apps/technician-current/server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      time: true,
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
