const mysql = require('./mysql')

const getUserByEmail = async email => new Promise((resolve, reject) => {
  mysql.query('SELECT * FROM users WHERE email = ?', [email], (error, results, fields) => {
    if (error) {
      reject(error)
      return
    }
    if (results.length > 0) {
      resolve(JSON.parse(JSON.stringify(results[0])))
    } else {
      resolve(null)
    }
  })
})

const getOrCreateUser = async email => {
  const user = await getUserByEmail(email)
  if (user) return user

  return new Promise((resolve, reject) => {
    mysql.query('INSERT INTO users SET ?', { email }, (error, results) => {
      if (error) {
        reject(error)
      } else {
        getUserByEmail(email).then(resolve)
      }
    })
  })
}

module.exports = {
  getOrCreateUser,
}
