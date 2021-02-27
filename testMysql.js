require('dotenv').config()

const users = require('./adapters/usersMySql')

const run = async () => {
  try {
    const user = await users.getOrCreateUser('rrostt@gmail.com')

    console.log(user)
  } catch (e) {
    console.error(e)
  }
}

run()
