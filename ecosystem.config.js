module.exports = {
  apps: [{
    name: 'soipattaya',
    script: 'server/dist/index.js',
    cwd: '/var/www/soipattaya',
    env_file: '/var/www/soipattaya/.env',
    instances: 1,
    exec_mode: 'fork'
  }]
};
