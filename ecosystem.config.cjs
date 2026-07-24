module.exports = {
  apps: [
    {
      name: 'salybrasas-api',
      script: './backend/src/server.js',
      cwd: '/home/ubuntu/SISTEMAS/SALYBRASAS',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3007,
      },
      error_file: '/home/ubuntu/logs/salybrasas-error.log',
      out_file: '/home/ubuntu/logs/salybrasas-out.log',
      time: true,
    },
  ],
};
