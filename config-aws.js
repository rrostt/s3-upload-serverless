require('dotenv').config()

module.exports.accessKeyId = process.env.ACCESS_KEY;
module.exports.secretAccessKey = process.env.SECRET;
module.exports.bucketName = process.env.BUCKET_NAME;
module.exports.region = process.env.REGION;
