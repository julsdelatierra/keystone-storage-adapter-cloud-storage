/* eslint-env node, mocha */

require('dotenv').config()

const assert = require('assert')
const CloudStorageAdapter = require('./index')
const fs = require('fs')

describe('Cloud Storage file field', function () {
  const adapter = new CloudStorageAdapter({
    cloudStorage: {
      keyFilename: process.env.CLOUD_STORAGE_KEY_FILENAME,
      path: 'tests/',
      bucket: 'covela-bucket',
      uploadOptions: {
        public: true
      }
    }
  }, {
    filename: true,
    size: true,
    mimetype: true,
    path: true,
    originalname: true,
    url: true
  })
  beforeEach(function () {
    this.timeout(10000)
  })

  it('304s when you request the file using the returned etag')
  it('the returned etag doesnt contain enclosing quotes')

  describe('fileExists', () => {
    it('returns an options object if you ask about a file that does exist', function (done) {
      adapter.uploadFile({
        name: 'hello.txt',
        mimetype: 'text/plain',
        originalname: 'hello.txt',
        path: './fixtures/hello.txt',
        extension: 'txt',
        size: fs.statSync('fixtures/hello.txt').size
      }, function (err, file) {
        if (err) throw err

        adapter.fileExists(file.filename, function (err, result) {
          if (err) throw err
          assert.ok(result)

          assert.ok(adapter.getFileURL(file))

          adapter.removeFile(file, done)
        })
      })
    })

    it('returns falsy when you ask if fileExists for a nonexistant file', function (done) {
      adapter.fileExists('filethatdoesnotexist.txt', function (err, result) {
        if (err) throw err
        assert(!result)
        done()
      })
    })
  })
})
