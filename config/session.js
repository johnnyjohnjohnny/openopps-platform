const dbURL = process.env.DATABASE_URL;
var session = {

  /* Session secret is automatically generated when your new app is created
   * Replace at your own risk in production-- you will invalidate the cookies of your users,
   * forcing them to log in again.
   */
  secret: process.env.SAILS_SECRET,

  /* Set the cookie maximum age (timeout).
   * If this is not set, then cookies will persist forever.
   * Setting this to null will make cookies non-persistent.
   */
  cookie: {
    maxAge: null,
  },
  /* Set the session store's expiration time.
   * This is different from cookie.maxAge, setting
   * this to null to get ttl from cookie.maxAge.
   */
  ttl: 16 * 60 * 1000, // 16 minutes

  /* Force a session identifier cookie to be set on every response.
   * The expiration is reset to the original maxAge, resetting the
   * expiration countdown. Default is false.
   */
  rolling: true,
};

// Use redis for sessions
if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD && process.env.REDIS_PORT) {
  session.store = require('koa-redis')({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASS,
  });
} else if (process.env.REDIS_URL) {
  session.store = require('koa-redis')({
    url: process.env.REDIS_URL
  });
} else if (process.env.NODE_ENV === 'development' && process.env.REDIS) {
  session.store = require('koa-redis')({});
}

module.exports.session = session;
