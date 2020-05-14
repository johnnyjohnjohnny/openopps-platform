const gen = require('postgres-gen');

var config = openopps.dbConnection || {
  host: process.env.DATABASE_HOST || 'localhost',
  db: process.env.DATABASE_NAME || 'midas',
  user: process.env.DATABASE_USER || 'midas',
  password: process.env.DATABASE_PASSWORD || 'midas',
  port: process.env.DATABASE_PORT || '5432',
};

module.exports = gen(config);
