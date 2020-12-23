const serverless = require('serverless-http')
const app = require('./server')

module.exports = {
  app: serverless(app, { binary: ['image/*'] })
}