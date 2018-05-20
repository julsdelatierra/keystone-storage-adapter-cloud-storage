# Google cloud storage adapter for KeystoneJS

This adapter is designed to use it in KeystoneJS File field.

## Usage

Configure the storage adapter:

```js
var storage = new keystone.Storage({
  adapter: require('keystone-storage-adapter-cloud-storage'),
  cloudStorage: {
    keyFilename: process.env.CLOUD_STORAGE_KEY_FILENAME,
    path: 'tests/',
    bucket: 'covela-bucket',
    uploadOptions: {
      public: true
    }
  },
  schema: {
    bucket: true, // optional; store the bucket the file was uploaded to in your db
    etag: true, // optional; store the etag for the resource
    path: true, // optional; store the path of the file in your db
    url: true, // optional; generate & store a public URL
  },
});
```

Schema options:

* filename
* size
* mimetype
* path
* originalname
* url
* bucket
* etag
* md5
* storageClass

Then use it as the storage provider for a File field:

```js
File.add({
  name: { type: String },
  file: { type: Types.File, storage: storage },
});
```

# Thanks

Thanks keystone team, your source code allow me to build my own adapter.

https://github.com/keystonejs/keystone-storage-adapter-s3

# License

Licensed under the standard MIT license. See [LICENSE](license).
