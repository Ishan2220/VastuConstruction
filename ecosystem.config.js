module.exports = {
  apps: [
    {
      name: 'vastu-server',
      script: 'npm',
      args: 'start',
      cwd: './server',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      }
    }
  ]
};
