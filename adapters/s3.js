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

  const s3Params = {
    Bucket: S3_BUCKET,
    Key: `${fileName}.${imageType}`,
    Expires: 60 * 60,
    ContentType: `image/${imageType}`,
    ACL: "public-read",
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


const listStreamImages = ({ from, to, streamId }) =>
  new Promise((resolve, reject) => {
    const bucketParams = {
      Bucket: S3_BUCKET,
    };
    if (streamId) {
      bucketParams.Prefix = `streams/${streamId}/`
    }
    let images = []
    const getImages = () => {
      s3.listObjectsV2(bucketParams, (err, data) => {
        if (err) reject(err)

        images.push(...data.Contents
          .filter(({ LastModified: date }) => new Date(date) >= new Date(from) && new Date(date) <= new Date(to))
          .filter(({ Key }) => streamId || !Key.startsWith('streams/'))
          .filter(({ Key }) => allowedImageTypes.some(type => Key.endsWith(`.${type}`)))
          .map(({ Key, LastModified }) => ({
            time: LastModified,
            url: `https://${S3_BUCKET}.s3.amazonaws.com/${Key}`
          })))
        if (data.NextContinuationToken) {
          bucketParams.ContinuationToken = data.NextContinuationToken
          getImages()
        } else {
          resolve(images.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
        }
      })
    }
    getImages()
  })

const getLatest = async streamId => {
  const images = await listStreamImages({ from: '2020-01-01', to: new Date(), streamId })
  if (images.length === 0) {
    return null
  }
  const latest = images.sort((a, b) => a.LastModified < b.LastModified ? -1 : a.LastModified > b.LastModified ? 1 : 0)[images.length - 1]
  return latest
}

module.exports = {
  getPresignedUrl,
  listStreamImages,
  getLatest,
}
