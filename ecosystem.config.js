module.exports = {
  apps: [{
    name: 'soipattaya',
    script: 'server/dist/index.js',
    cwd: '/opt/soipattaya',
    env_file: '/opt/soipattaya/.env',
    instances: 1,
    exec_mode: 'fork'
  }]
};
