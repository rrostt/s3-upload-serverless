const express = require("express");
const fetch = require('node-fetch')
const cors = require('cors')
const AWS = require("aws-sdk");
const awsConfig = require("./config-aws");
const uuid = require("uuid");
const app = express();
var bodyParser = require("body-parser");

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

AWS.config.update({ region: awsConfig.region });

const S3_BUCKET = awsConfig.bucketName;
const s3 = new AWS.S3({
  accessKeyId: awsConfig.accessKeyId,
  secretAccessKey: awsConfig.secretAccessKey,
  region: awsConfig.region,
  signatureVersion: "v4",
});

const getPresignedUrl = (req, res) => {
  console.log(req.body)
  const plantId = req.body.plantId

  let fileType = req.body.fileType;
  if (fileType != ".jpg" && fileType != ".png" && fileType != ".jpeg") {
    return res
      .status(403)
      .json({ success: false, message: "Image format invalid" });
  }

  fileType = fileType.substring(1, fileType.length);

  const imageId = uuid.v4();
  const fileName = plantId ? `plants/${plantId}/${imageId}` : imageId

  console.log({ fileName })
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: `${fileName}.${fileType}`,
    Expires: 60 * 60,
    ContentType: `image/${fileType}`,
    ACL: "public-read",
  };

  s3.getSignedUrl("putObject", s3Params, (err, data) => {
    if (err) {
      console.log(err);
      return res.end();
    }
    const returnData = {
      success: true,
      message: "Url generated",
      uploadUrl: data,
      downloadUrl:
        `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}` + "." + fileType,
    };
    return res.status(201).json(returnData);
  });
};

const getLatestImage = (req, res) => {
  const { plantId } = req.query

  listPlantImages({ from: '2020-01-01', to: new Date(), plantId })
    .then(images => {
      if (images.length === 0) {
        res.status(200).json({})
        return
      }
      const latest = images.sort((a, b) => a.LastModified < b.LastModified ? -1 : a.LastModified > b.LastModified ? 1 : 0)[images.length - 1]
      const url = latest.url
      if (req.query.redirect) {
        res.redirect(url)
      } else if (req.query.image) {
        fetch(url)
          .then(response => response.buffer())
          .then(buffer => {
            res.set({ 'Content-Type': 'image/png' }).send(buffer)
          })
      } else {
        res.status(200).json({ url: url })
      }
    })
}

const listPlantImages = ({ from, to, plantId }) =>
  new Promise((resolve, resject) => {
    const bucketParams = {
      Bucket: S3_BUCKET,
    };
    if (plantId) {
      bucketParams.Prefix = `plants/${plantId}/`
    }
    let images = []
    const getImages = () => {
      s3.listObjectsV2(bucketParams, (err, data) => {
        if (err) reject(err)

        images.push(...data.Contents
          .filter(({ LastModified: date }) => new Date(date) >= new Date(from) && new Date(date) <= new Date(to))
          .filter(({ Key }) => plantId || !Key.startsWith('plants/'))
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

const getImages = (req, res) => {
  const { from, to, plantId } = req.query

  console.log(from, to, new Date(from), new Date(to))

  listPlantImages({ from, to, plantId })
    .then(images => res.json(images))
}

app.post("/generatePresignedUrl", getPresignedUrl);
app.get('/images', getImages)
app.get('/latest', getLatestImage)

module.exports = app
