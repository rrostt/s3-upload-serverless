const MongoClient = require('mongodb').MongoClient

const MONGODB_CONNECTIONSTRING = process.env.MONGODB_CONNECTIONSTRING
const MONGODB_DB = process.env.MONGODB_DB

let savedClient

const open = () => {
  return new Promise((resolve, reject) => {
    const client = new MongoClient(MONGODB_CONNECTIONSTRING, { useNewUrlParser: true, useUnifiedTopology: true })
    client.connect((err) => {
      if (err) {
        reject(err)
        return
      }
      savedClient = client
      resolve(client.db(MONGODB_DB))
    })
  })
}

const close = () => {
  if (savedClient) {
    savedClient.close()
    savedClient = null
  }
}

module.exports = {
  open,
  close,
}