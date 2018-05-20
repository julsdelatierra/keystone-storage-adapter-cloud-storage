/*
TODO
- Check whether files exist before uploading (will always overwrite as-is)
- Support multiple retry attempts if a file exists (see FS Adapter)
*/

const debug = require('debug')('keystone-cloud-storage')
const storage = require('@google-cloud/storage')
const ensureCallback = require('keystone-storage-namefunctions/ensureCallback')
const nameFunctions = require('keystone-storage-namefunctions')
const pathlib = require('path')

const DEFAULT_OPTIONS = {
  keyFilename: process.env.CLOUD_STORAGE_KEY_FILENAME,
  generateFilename: nameFunctions.randomFilename
}

function CloudStorageAdapter (options, schema) {
  this.options = Object.assign({}, DEFAULT_OPTIONS, options.cloudStorage)

  this.client = storage(this.options)

  // If keyFilename is specified it must be absolute.
  if (options.keyFilename != null && !pathlib.isAbsolute(options.keyFilename)) {
    throw Error('Configuration error: Google cloud container keyFilename must be absolute')
  }

  // Ensure the generateFilename option takes a callback
  this.options.generateFilename = ensureCallback(this.options.generateFilename)

  return this
}

CloudStorageAdapter.compatibilityLevel = 1

CloudStorageAdapter.SCHEMA_TYPES = {
  filename: String,
  originalname: String,
  mimetype: String,
  url: String
}

CloudStorageAdapter.SCHEMA_FIELD_DEFAULTS = {
  filename: true,
  originalname: true,
  mimetype: true,
  url: true
}

// Return a reserved client for file if it belongs
// to a different bucket that the global.
CloudStorageAdapter.prototype._clientForFile = function (file) {
  if (file.bucket && file.bucket !== this.options.bucket) {
    const options = Object.assign({}, this.options, {
      bucket: file.bucket
    })
    return storage(options)
  } else {
    return this.client
  }
}

CloudStorageAdapter.prototype._resolveFilename = function (file) {
  return pathlib.posix.resolve(file.path)
}

CloudStorageAdapter.prototype._resolveRemoteFilename = function (file) {
  const path = file.path || this.options.path || '/'
  return `${path}${file.filename}`
}

CloudStorageAdapter.prototype.uploadFile = function (file, callback) {
  const self = this
  this.options.generateFilename(file, 0, function (err, filename) {
    if (err) return callback(err)

    // The expanded path of the file on the filesystem.
    const localpath = self._resolveFilename(file)

    // Relative path inside cloud storage bucket.
    file.path = self.options.path
    file.filename = filename
    const destpath = self._resolveRemoteFilename(file)

    const uploadOptions = Object.assign({}, self.options.uploadOptions, {
      destination: destpath
    })

    debug('Uploading file %s', filename)
    self.client
      .bucket(self.options.bucket)
      .upload(localpath, uploadOptions, function (err, response) {
        if (err) return callback(err)

        const metadata = response.metadata || {}

        const fileData = {
          filename: filename,
          size: metadata.size,
          mimetype: metadata.contentType,
          path: self.options.path,
          originalname: file.originalname,
          url: metadata.mediaLink,
          bucket: self.options.bucket,
          etag: metadata.etag,
          md5: metadata.md5Hash,
          storageClass: metadata.storageClass
        }

        debug('file upload successful')
        callback(null, fileData)
      })
  })
}

CloudStorageAdapter.prototype.getFileURL = async function (file) {
  let url = null

  const promise = this._clientForFile(file)
                    .bucket(file.bucket)
                    .file(this._resolveRemoteFilename(file))

  try {
    const result = await promise.getMetadata()
    url = result[0].mediaLink
  } catch (error) {
    console.error(error)
    throw Error('Cloud Storage cannot provide a mediaLink for resource.')
  }

  return url
}

CloudStorageAdapter.prototype.removeFile = function (file, callback) {
  const fullpath = this._resolveRemoteFilename(file)
  this._clientForFile(file)
    .bucket(file.bucket)
    .file(fullpath)
    .delete(function (err) {
      if (err) return callback(err)

      callback()
    })
}

CloudStorageAdapter.prototype.fileExists = function (filename, callback) {
  const fullpath = this._resolveRemoteFilename({
    filename: filename
  })
  this.client
    .bucket(this.options.bucket)
    .file(fullpath)
    .exists(function (err, exists) {
      if (err) return callback(err)

      if (!exists) return callback() // File does not exist

      callback(null, exists)
    })
}

module.exports = CloudStorageAdapter
