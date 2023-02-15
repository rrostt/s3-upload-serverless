const uuid = require("uuid");
const s3 = require('./s3')

const getStream = async ({ id }) => {
  console.log('getStream', { id })
  const Metadata = await s3.getMetadata({ key: `streams/${id}` })
  return {
    id,
    ...Metadata
  }
}

const addStream = async ({ userId, title, description }) => {
  const id = uuid.v4()
  console.log('addStream', { userId, title, description, id })
  await s3.createFolder({ folderName: `users/${userId}/${id}`})
  await s3.createFolder({ folderName: `streams/${id}`, metadata: { userid: userId, title, description }  })
}

const getStreamsByUserId = async userId => {
  const streamIds = await s3.listObjects({ prefix: `users/${userId}` })
  console.log({ streamIds, userId})
  return Promise.all(streamIds.map(async streamId => {
    const Metadata = await s3.getMetadata({ key: `streams/${streamId}` })
    return {
      id: streamId,
      // userId,
      ...Metadata
    }
  }))
}

const getFeaturedStreams = async () => {
  return []
  // return new Promise((resolve, reject) => {
  //   mysql.query("SELECT * FROM streams", (error, results) => {
  //     if (error) {
  //       reject(error)
  //       return
  //     }
  
  //     resolve(results)
  //   })
  // })
}

const updateStream = async stream => {
  return s3.setMetadata({ key: `streams/${stream.id}`, metadata: { title: stream.title, description: stream.description } })
}

const deleteStream = async ({ stream }) => {
  await s3.deleteFolder({ folderName: `users/${stream.userid}/${stream.id}` })
  return s3.deleteFolder({ folderName: `streams/${stream.id}` })
}

module.exports = {
  getStream,
  addStream,
  getStreamsByUserId,
  getFeaturedStreams,
  updateStream,
  deleteStream,
}
