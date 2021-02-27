const uuid = require("uuid");
const mysql = require('./mysql')

const getStream = async id => new Promise((resolve, reject) => {
  mysql.query("SELECT * FROM streams WHERE id = ?", [id], (error, results) => {
    if (error) {
      reject(error)
      return
    }

    if (results.length > 0) {
      resolve(results[0])
    } else {
      resolve(null)
    }
  })
})

const addStream = async ({ userId, title, description }) => {
  const id = uuid.v4()
  return new Promise((resolve, reject) => {
    mysql.query('INSERT INTO streams SET ? ', {id, userId, title, description }, (error, result) => {
      if (error) {
        reject(error)
        return
      }
  
      getStream(id).then(resolve)
    })
  })
}

const getStreamsByUserId = async userId => {
  return new Promise((resolve, reject) => {
    mysql.query("SELECT * FROM streams WHERE userId = ?", [userId], (error, results) => {
      if (error) {
        reject(error)
        return
      }
  
      resolve(results)
    })
  })
}

const getFeaturedStreams = async () => {
  return new Promise((resolve, reject) => {
    mysql.query("SELECT * FROM streams", (error, results) => {
      if (error) {
        reject(error)
        return
      }
  
      resolve(results)
    })
  })
}

const updateStream = async stream => {
  return new Promise((resolve, reject) => {
    mysql.query("UPDATE streams SET title = ?, description = ? WHERE id = ?", [stream.title, stream.description, stream.id], (error, result) => {
      if (error) {
        reject(error)
        return
      }
  
      resolve()
    })
  })
}

const deleteStream = async ({ streamId }) => {
  return new Promise((resolve, reject) => {
    mysql.query("DELETE FROM streams WHERE id = ?", [streamId], (error, result) => {
      if (error) {
        reject(error)
        return
      }
  
      resolve()
    })
  })
}

module.exports = {
  getStream,
  addStream,
  getStreamsByUserId,
  getFeaturedStreams,
  updateStream,
  deleteStream,
}
