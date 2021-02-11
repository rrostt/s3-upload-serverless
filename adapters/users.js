const mongodb = require('./mongodb')

const getCollection = () => 
  mongodb.open()
    .then(client => client.collection('users'))

const getOrCreateUser = async email => {
  const collection = await getCollection()
  const user = await collection.findOne({ email })
  if (user) {
    return user
  } else {
    await collection.insertOne({ email })
    return await collection.findOne({ email })
  }
}

module.exports = {
  getOrCreateUser,
}
