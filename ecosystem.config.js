module.exports = {
  apps: [
    {
      name: 'xelnova-api',
      cwd: './backend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'xelnova-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'xelnova-seller',
      cwd: './apps/seller',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
    {
      name: 'xelnova-admin',
      cwd: './apps/admin',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
  ],
};
