const AWS = require("aws-sdk");
const awsConfig = require("../config-aws");
const uuid = require("uuid");

AWS.config.update({ region: awsConfig.region });

const S3_BUCKET = awsConfig.bucketName;
const s3 = new AWS.S3({
  accessKeyId: awsConfig.accessKeyId,
  secretAccessKey: awsConfig.secretAccessKey,
  region: awsConfig.region,
  signatureVersion: "v4",
});

const getPresignedUrl = ({ prefix = 'plants', streamId, fileType: fileEnding }) => {
  let fileType = fileEnding
  if (fileType != ".jpg" && fileType != ".png" && fileType != ".jpeg") {
    throw new Error('Unknown file type. Must be jpg or png.')
  }

  fileType = fileType.substring(1, fileType.length)

  const imageId = uuid.v4()
  const fileName = streamId ? `${prefix}/${streamId}/${imageId}` : imageId

  const s3Params = {
    Bucket: S3_BUCKET,
    Key: `${fileName}.${fileType}`,
    Expires: 60 * 60,
    ContentType: `image/${fileType}`,
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
          `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}` + "." + fileType,
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
          .filter(({ Key }) => Key.endsWith('.png'))
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
