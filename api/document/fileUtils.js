const _ = require('lodash');
const log = require('log')('app:document:fileUtils');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const config = openopps.fileStore || {};
const gm = require('gm').subClass({ imageMagick: true });
const exifParser = require('exif-parser');

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-1',
  });
}

const storageTypes = {
  local: {
    store: function (name, data, cb) {
      var dir = path.join(openopps.appPath, config.local.dirname || 'assets/uploads');
      if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFile(path.join(dir, name), data, cb);
    },
    get: function (name, cb) {
      var dir = path.join(openopps.appPath, config.local.dirname || 'assets/uploads');
      fs.readFile(path.join(dir, name), cb);
    },
    remove: function (name, cb) {
      var dir = path.join(openopps.appPath, config.local.dirname || 'assets/uploads');
      if(fs.existsSync(dir)) {
        fs.unlink(path.join(dir, name), cb);
      }
      
    },
  },
  s3: {
    store: function (name, data, cb) {
      var s3 = new AWS.S3();
      var params = {
        Bucket: config.s3.bucket,
        Key: path.join(config.s3.prefix || '', name),
        Body: data,
      };
      s3.upload(params, cb);
    },
    get: function (name, cb) {
      var s3 = new AWS.S3();
      var params = {
        Bucket: config.s3.bucket,
        Key: path.join(config.s3.prefix || '', name),
      };
      s3.getObject(params, (err, data) => {
        if(err) {
          cb(err, null);
        } else {
          cb(null, data.Body);
        }
      });
    },
    remove: function (name, cb) {
      var s3 = new AWS.S3();
      var params = {
        Bucket: config.s3.bucket,
        Key: path.join(config.s3.prefix || '', name),
      };
      s3.deleteObject(params, cb);
    },
  },
};

function getImageSize (data) {
  return new Promise(function (resolve) {
    gm(data, 'photo.jpg').size(function (err, size) {
      if (err || !size) {
        resolve({ message: 'Error with file: it is probably not an image. ', error: err });
      } else {
        resolve(size);
      }
    });
  });
}

function rotateIfNeeded (data) {
  return new Promise(async (resolve) => {
    // Read first 64K of image file (EXIF data located here)
    var exifData = data.subarray(0, 65536);
    var parser = exifParser.create(exifData);
    var exifResult = parser.parse();
    if (exifResult.tags && exifResult.tags.Orientation >= 2 && exifResult.tags.Orientation <= 8) {
      gm(data, 'photo.jpg').autoOrient().toBuffer(function (err, buffer) {
        if(err) {
          resolve({ message:'Error creating buffer.', error: err });
        } else {
          resolve(buffer);
        }
      });
    } else {
      resolve(data);
    }
  });
}

function cropImage (data) {
  return new Promise(async (resolve) => {
    log.info('Making square image...');
    var size = await getImageSize(data);
    if(size.error) {
      resolve(size);
    } else {
      var newCrop = Math.min(size.width, size.height);
      var newSize = Math.min(newCrop, 712);
      gm(data, 'photo.jpg')
        .crop(newCrop, newCrop, ((size.width - newCrop) / 2), ((size.height - newCrop) / 2))
        .resize(newSize, newSize)
        .noProfile()
        .toBuffer(function (err, buffer) {
          if(err) {
            resolve({ message:'Error creating buffer.', error: err });
          } else {
            resolve(buffer);
          }
        });
    }
  });
}

function resizeImage (data) {
  return new Promise(async (resolve) => {
    log.info('Resizing image...');
    var size = await getImageSize(data);
    if(size.error) {
      resolve(size);
    } else {
      var width = (size.height > size.width && size.width > 712) ? 712 : null;
      var height = (size.width > size.height && size.height > 712) ? 712 : null;
      if (!width && !height) {
        width = size.width;
      }
      gm(data, 'photo.jpg')
        .resize(width, height)
        .noProfile()
        .toBuffer(function (err, buffer) {
          if(err) {
            resolve({ message:'Error creating buffer.', error: err });
          } else {
            resolve(buffer);
          }
        });
    }
  });
}

module.exports = {};

module.exports.store = (name, data, cb) => {
  var service = config.service || 'local';
  storageTypes[service].store(name, data, cb);
};

module.exports.get = (name, cb) => {
  var service = (config.service || 'local');
  storageTypes[service].get(name, cb);
};

module.exports.remove = (name, cb) => {
  var service = (config.service || 'local');
  storageTypes[service].remove(name, cb);
};

module.exports.validType = (imageType, fileType) => {
  var expectedImageTypes = ['image_square', 'image'];
  var validImageTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/bmp'];
  if (_.includes(expectedImageTypes, imageType)) {
    return _.includes(validImageTypes, fileType);
  }
  if (fileType == 'exe') {
    sails.log.error('Executable files not allowed');
    return false;
  }
  // we didn't find anything bad so we'll generously accept any other file
  return true;
};

module.exports.processFile = (type, file) => {
  log.info('Processing file => ', file.name);
  return new Promise((resolve) => {
    fs.readFile(file.path, async (err, data) => {
      if(err) {
        log.info('Error reading file ', file.name, err);
        resolve(false);
      } else {
        var rotatedImage = _.includes(['image/jpg', 'image/jpeg'], file.type) ? await rotateIfNeeded(data) : data;
        if(rotatedImage.error) {
          log.info(imageData.message, imageData.error);
          resolve(false);
        } else {
          var imageData = type === 'image_square' ?
            await cropImage(rotatedImage) : type === 'image' ?
              await resizeImage(rotatedImage) : rotatedImage;
          if(imageData.error) {
            log.info(imageData.message, imageData.error);
            resolve(false);
          } else {
            var f = {
              name: file.name,
              mimeType: file.type,
              fd: uuid.v1() + '.' + file.name.split('.').pop(),
              size: imageData.length,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            module.exports.store(f.fd, imageData, (err, data) => {
              if(err) {
                log.info('Error storing file ', file.name, err);
                resolve(false);
              }
              resolve(f);
            });
          }
        }
      }
    });
  });
};