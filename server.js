const express = require("express");
const fetch = require('node-fetch')
const AWS = require("aws-sdk");
const awsConfig = require("./config-aws");
const uuid = require("uuid");
const app = express();
var bodyParser = require("body-parser");

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

  let fileType = req.body.fileType;
  if (fileType != ".jpg" && fileType != ".png" && fileType != ".jpeg") {
    return res
      .status(403)
      .json({ success: false, message: "Image format invalid" });
  }

  fileType = fileType.substring(1, fileType.length);

  const fileName = uuid.v4();
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName + "." + fileType,
    Expires: 60 * 60,
    ContentType: "image/" + fileType,
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
  const bucketParams = {
    Bucket: S3_BUCKET,
  };
  s3.listObjects(bucketParams, (err, data) => {
    const files = data.Contents.sort((a, b) => a.LastModified < b.LastModified ? -1 : a.LastModified > b.LastModified ? 1 : 0)
    console.log(files[files.length - 1])
    const latest = files[files.length - 1]
    const url = `https://${S3_BUCKET}.s3.amazonaws.com/${latest.Key}`
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

const getImages = (req, res) => {
  const { from, to } = req.query

  console.log(from, to, new Date(from), new Date(to))

  const bucketParams = {
    Bucket: S3_BUCKET,
  };
  s3.listObjects(bucketParams, (err, data) => {
    const images = data.Contents
      .filter(({ LastModified: date }) => new Date(date) >= new Date(from) && new Date(date) <= new Date(to))
      .sort((a, b) => a.LastModified < b.LastModified ? -1 : a.LastModified > b.LastModified ? 1 : 0)
      .map(({ Key, LastModified }) => ({
        time: LastModified,
        url: `https://${S3_BUCKET}.s3.amazonaws.com/${Key}`
      }))
    res.json(images)
  })
}

app.post("/generatePresignedUrl", getPresignedUrl);
app.get('/images', getImages)
app.get('/latest', getLatestImage)

module.exports = app
