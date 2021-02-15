const mongodb = require('./mongodb')
const { ObjectId } = require('mongodb')

const getCollection = () => 
  mongodb.open()
    .then(client => client.collection('streams'))

const getStream = async id => {
  console.log({id})
  const collection = await getCollection()
  const stream = await collection.findOne({_id: new ObjectId(id)})
  console.log({stream})
  return {
    ...stream,
    id: stream._id,
  }
}

const addStream = async ({ userId, title, description }) => {
  const collection = await getCollection()
  const result = await collection.insertOne({ userId, title, description })
  return getStream(result.insertedId)
}

const getStreamsByUserId = async userId => {
  const collection = await getCollection()
  return collection.find({ userId: userId })
    .toArray()
    .then(streams => streams
      .map(stream => ({
        ...stream,
        id: stream._id
      }))
    )
}

const getFeaturedStreams = async () => {
  const collection = await getCollection()
  return collection.find()
    .toArray()
    .then(streams => streams
      .map(stream => ({
        ...stream,
        id: stream._id
      }))
    )
}

const updateStream = async stream => {
  const collection = await getCollection()
  return collection.updateOne(
    {_id: new ObjectId(stream.id)},
    {
      '$set': stream
    }
  )
}

module.exports = {
  getStream,
  addStream,
  getStreamsByUserId,
  getFeaturedStreams,
  updateStream,
}
