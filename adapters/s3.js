const AWS = require("aws-sdk");
const awsConfig = require("../config-aws");
const uuid = require("uuid");

const allowedImageTypes = ['jpg', 'jpeg', 'png']

AWS.config.update({ region: awsConfig.region });

const S3_BUCKET = awsConfig.bucketName;
const s3 = new AWS.S3({
  accessKeyId: awsConfig.accessKeyId,
  secretAccessKey: awsConfig.secretAccessKey,
  region: awsConfig.region,
  signatureVersion: "v4",
});

const getImageTypeFromFileType = fileType => {
  const dotSplit = fileType.split('.')
  const slashSplit = fileType.split('/')
  return dotSplit.length > 1 ? dotSplit[1] : slashSplit.length > 1 ? slashSplit[1] : ''
}

const getPresignedUrl = ({ prefix = 'plants', streamId, fileType }) => {
  const imageType = getImageTypeFromFileType(fileType)

  if (!allowedImageTypes.includes(imageType)) {
    throw new Error('Unknown file type. Must be jpg or png.')
  }

  const imageId = uuid.v4()
  const fileName = streamId ? `${prefix}/${streamId}/${imageId}` : imageId
  const metadata = {
    timestamp: new Date().toISOString(),
  }

  const s3Params = {
    Bucket: S3_BUCKET,
    Key: `${fileName}.${imageType}`,
    Expires: 60 * 60,
    ContentType: `image/${imageType}`,
    ACL: "public-read",
    Metadata: metadata,
  }

  return new Promise((resolve, reject) => {
    s3.getSignedUrl("putObject", s3Params, (err, data) => {
      if (err) {
        reject(err)
      }
      const returnData = {
        success: true,
        message: "Url generated",
        uploadUrl: data,
        downloadUrl:
          `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}` + "." + imageType,
      }
      resolve(returnData)
    })
  })
}


const listStreamImages = ({ from, to, prefix }) =>
  new Promise((resolve, reject) => {
    const bucketParams = {
      Bucket: S3_BUCKET,
      Prefix: prefix,
    };
    let images = []
    const getImages = () => {
      s3.listObjectsV2(bucketParams, (err, data) => {
        if (err) reject(err)

        images.push(...data.Contents
          .filter(({ Key }) => Key.startsWith(prefix))
          .filter(({ Key }) => allowedImageTypes.some(type => Key.endsWith(`.${type}`)))
          .map(({ Key, LastModified }) => ({
            time: LastModified,
            key: Key,
            url: `https://${S3_BUCKET}.s3.amazonaws.com/${Key}`
          })))
        if (data.NextContinuationToken) {
          bucketParams.ContinuationToken = data.NextContinuationToken
          getImages()
        } else {
          resolve(images)
        }
      })
    }
    getImages()
  })
  .then(images => Promise.all(images.map(async image => ({
    ...image,
    metadata: await getMetadata({ key: image.key }),
  }))))
  .then(images => images.filter(({ metadata }) => new Date(metadata.timestamp) >= new Date(from) && new Date(metadata.timestamp) <= new Date(to)))
  .then(images => images.sort((a, b) => a.metadata.timestamp < b.metadata.timestamp ? -1 : a.metadata.timestamp > b.metadata.timestamp ? 1 : 0))

const getLatest = async ({ prefix }) => {
  const images = await listStreamImages({ from: '2020-01-01', to: new Date(), prefix })
  if (images.length === 0) {
    return null
  }
  const latest = images[images.length - 1]
  return latest
}

const createFolder = ({ folderName, metadata = {} }) => {
  const params = {
    Bucket: S3_BUCKET,
    Key: folderName,
    Metadata: metadata,
  }
  return new Promise((resolve, reject) => {
    s3.putObject(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

const listObjects = ({ prefix }) =>
  new Promise((resolve, reject) => {
    const bucketParams = {
      Bucket: S3_BUCKET,
      Prefix: prefix ? `${prefix}/` : '',
      Delimiter: '/',
    };
    let folders = []
    const getObjects = () => {
      s3.listObjectsV2(bucketParams, (err, data) => {
        if (err) reject(err)

        folders.push(...data.Contents
          .map(({ Key }) => Key.split('/').slice(-1)[0]))
        if (data.NextContinuationToken) {
          bucketParams.ContinuationToken = data.NextContinuationToken
          getObjects()
        } else {
          resolve(folders)
        }
      })
    }
    getObjects()
  })

const getMetadata = ({ key }) =>
  new Promise((resolve, reject) => {
    const params = {
      Bucket: S3_BUCKET,
      Key: key,
    }
    s3.headObject(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Metadata)
      }
    })
  })

const setMetadata = ({ key, metadata }) =>
  new Promise((resolve, reject) => {
    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      CopySource: `${S3_BUCKET}/${key}`,
      Metadata: metadata,
    }
    s3.copyObject(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })

const deleteFolder = ({ folderName }) => {
  // delete contents of folder
  const params = {
    Bucket: S3_BUCKET,
    Prefix: folderName,
  }
  return new Promise((resolve, reject) => {
    s3.listObjectsV2(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        const objects = data.Contents.map(({ Key }) => ({ Key }))
        const deleteParams = {
          Bucket: S3_BUCKET,
          Delete: { Objects: objects },
        }
        s3.deleteObjects(deleteParams, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      }
    })
  }).then(_ => {
    // delete folder itself
    const params = {
      Bucket: S3_BUCKET,
      Key: folderName,
    }
    return new Promise((resolve, reject) => {
      s3.deleteObject(params, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    }
    )
  })
}

module.exports = {
  getPresignedUrl,
  listStreamImages,
  getLatest,
  createFolder,
  listObjects,
  getMetadata,
  setMetadata,
  deleteFolder,
}
