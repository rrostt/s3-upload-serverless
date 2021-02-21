require('dotenv').config()

const express = require("express");
const fetch = require('node-fetch')
const cors = require('cors')
const app = express();
const google = require('./adapters/google')
const users = require('./adapters/users')
const streamsAdapter = require('./adapters/streams')
const s3Adapter = require('./adapters/s3')
const jwt = require('jsonwebtoken')
var bodyParser = require("body-parser");
const { json } = require("body-parser");

const JWT_SECRET = process.env.JWT_SECRET

app.use(cors())
app.options("*", cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// const getPresignedUrl = async (req, res) => {
//   try {
//     const urlInfo = await s3Adapter.getPresignedUrl({ streamId: req.body.plantId, fileType: req.body.fileType })
//     return res.status(201).json(urlInfo);
//   } catch (e) {
//     return res
//       .status(403)
//       .json({ success: false, message: e.message });
//   }
// }

// const getLatestImage = (req, res) => {
//   const { plantId } = req.query

//   listPlantImages({ from: '2020-01-01', to: new Date(), plantId })
//     .then(images => {
//       if (images.length === 0) {
//         res.status(200).json({})
//         return
//       }
//       const latest = images.sort((a, b) => a.LastModified < b.LastModified ? -1 : a.LastModified > b.LastModified ? 1 : 0)[images.length - 1]
//       const url = latest.url
//       if (req.query.redirect) {
//         res.redirect(url)
//       } else if (req.query.image) {
//         fetch(url)
//           .then(response => response.buffer())
//           .then(buffer => {
//             res.set({ 'Content-Type': 'image/png' }).send(buffer)
//           })
//       } else {
//         res.status(200).json(latest)
//       }
//     })
// }

// const listPlantImages = ({ from, to, plantId }) =>
//   new Promise((resolve, reject) => {
//     const bucketParams = {
//       Bucket: S3_BUCKET,
//     };
//     if (plantId) {
//       bucketParams.Prefix = `plants/${plantId}/`
//     }
//     let images = []
//     const getImages = () => {
//       s3.listObjectsV2(bucketParams, (err, data) => {
//         if (err) reject(err)

//         images.push(...data.Contents
//           .filter(({ LastModified: date }) => new Date(date) >= new Date(from) && new Date(date) <= new Date(to))
//           .filter(({ Key }) => plantId || !Key.startsWith('plants/'))
//           .filter(({ Key }) => Key.endsWith('.png'))
//           .map(({ Key, LastModified }) => ({
//             time: LastModified,
//             url: `https://${S3_BUCKET}.s3.amazonaws.com/${Key}`
//           })))
//         if (data.NextContinuationToken) {
//           bucketParams.ContinuationToken = data.NextContinuationToken
//           getImages()
//         } else {
//           resolve(images.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
//         }
//       })
//     }
//     getImages()
//   })

// const getImages = (req, res) => {
//   const { from, to, plantId } = req.query

//   console.log(from, to, new Date(from), new Date(to))

//   listPlantImages({ from, to, plantId })
//     .then(images => res.json(images))
// }

const auth = async (req, res, next) => {
  const auth = req.headers['authorization']
  const token = auth && auth.split(' ')[1]

  try {
    if (token) {
      req.user = jwt.verify(token, JWT_SECRET)
      console.log('authed', req.user)
    } else {
      // res.status(500).send('unauthed')
    }
  } catch (_) {
    //
  }

  next()
}

const getStreams = async (req, res) => {
  if (!req.user) {
    res.status(401).end()
    return
  }

  const streams = await streamsAdapter.getStreamsByUserId(req.user.id)
  const streamsWithLatest = await Promise.all(streams.map(async stream => ({
    ...stream,
    latest: await s3Adapter.getLatest(stream.id),
  })))
  console.log('returns', streamsWithLatest)
  res.json(streamsWithLatest)
}

const addStream = async (req, res) => {
  const { title, description } = req.body
  if (!req.user) {
    res.status(401).end()
    return
  }
  await streamsAdapter.addStream({ userId: req.user.id, title, description })
  res.end()
}

const getPresignedStreamUrl = async (req, res) => {
  const stream = await streamsAdapter.getStream(req.body.streamId)
  if (stream.userId != req.user.id) {
    res.status(401).end()
    return
  }

  try {
    const urlInfo = await s3Adapter.getPresignedUrl({
      prefix: 'streams',
      streamId: req.body.streamId,
      fileType: req.body.fileType
    })
    return res.status(201).json(urlInfo);
  } catch (e) {
    return res
      .status(403)
      .json({ success: false, message: e.message });
  }
}

const getStream = async (req, res) => {
  console.log('getting strean', req.params.id)
  const stream = await streamsAdapter.getStream(req.params.id)
  stream.latest = await s3Adapter.getLatest(stream.id)
  stream.owner = req.user && stream.userId == req.user.id
  res.json(stream)
}

const getStreamImages = async (req, res) => {
  const { from, to } = req.query
  const { id } = req.params
  console.log('get stream images', from, to, id)
  const images = await s3Adapter.listStreamImages({ streamId: id, from, to })
  res.json(images)
}

const updateStream = async (req, res) => {
  console.log('updating stream')
  const inputStream = req.body
  const stream = await streamsAdapter.getStream(inputStream.id)
  if (stream.userId == req.user.id) {
    await streamsAdapter.updateStream(inputStream)
    res.end()
  } else {
    res.status(401).end()
  }
}

const getToken = async (req, res) => {
  const googleTokenId = req.body.tokenId
  const googleAccessToken = req.body.accessToken

  if (googleTokenId) {
    try {
      const data = await google.verifyAndParseToken(googleTokenId)
      const user = await users.getOrCreateUser(data.email)
      user.id = user._id
      const token = jwt.sign(user, JWT_SECRET)
      res.json({token})
    } catch (e) {
      console.log(e)
      res.json({ error: -1, message: 'unauthorized' })
    }
  } else if (googleAccessToken) {
    const email = await google.getEmailFromAccessToken(googleAccessToken)
    console.log({email, googleAccessToken})
    if (email) {
      const user = await users.getOrCreateUser(email)
      user.id = user._id
      const token = jwt.sign(user, JWT_SECRET)
      res.json({token})
    } else {
      res.json({ error: -1, message: 'unauthorized' })
    }
  }
}

const getFeatured = async (req, res) => {
  const streams = (await streamsAdapter.getFeaturedStreams())
    .filter(({ id }) => ['6022c4058fabfe14be1aa838', '602a2f467a610700086b38d9'].includes(`${id}`))
  const streamsWithLatest = await Promise.all(streams.map(async stream => ({
    ...stream,
    latest: await s3Adapter.getLatest(stream.id),
  })))
  res.json(streamsWithLatest)

}

const deleteStream = async (req, res) => {
  const stream = await streamsAdapter.getStream(req.params.id)
  if (!req.user || stream.userId != req.user.id) {
    res.status(401).end()
  }
  await streamsAdapter.deleteStream({ streamId: req.params.id })
  res.end()
}

// app.post("/generatePresignedUrl", getPresignedUrl)
// app.get('/images', getImages)
// app.get('/latest', getLatestImage)

app.post('/token', getToken)
app.post('/uploadUrl', auth, getPresignedStreamUrl)

app.post('/streams', auth, addStream)  // register a new stream
app.put('/streams', auth, updateStream) // update stream
app.get('/streams', auth, getStreams) // get streams belonging to user
app.get('/streams/:id', auth, getStream) // get a stream by id if public or granted access
app.get('/streams/:id/images', auth, getStreamImages)
app.delete('/streams/:id', auth, deleteStream)

app.get('/featured', getFeatured) // get list of featured streams (basically all streams sorted by number of views/likes)
// app.get('/users/:id', getUser)  // get user info and list of streams

module.exports = app
