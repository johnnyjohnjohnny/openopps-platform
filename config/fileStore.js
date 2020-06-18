var AWS = require('aws-sdk');

var FS = {
  service: process.env.FILESTORE || 'local',

  local: {
    dirname: 'assets/uploads',
  },

  /**
   * Store files on AWS S3
   * Useful for multi-server hosting environments
   *
   * Set fileStore.service = 's3'
   *
   * Set credentials according `aws-sdk` instructions:
   * http://v.gd/aws_sdk_creds
   *
   * @bucket: s3 bucket to use
   * @prefix: prefix string / virtual path within bucket
   */

  s3: {
    bucket: process.env.S3_BUCKET || null,
    prefix: process.env.S3_PREFIX || 'uploads',
  },

};


if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-1',
  });
}


module.exports.fileStore = FS;
