const fetch = require('node-fetch')
const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const verifyAndParseToken = async token => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const data = ticket.getPayload()
  return data
}

const getEmailFromAccessToken = async accessToken => {
  const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`)
  const data = response.json()
  return data.email
}

module.exports = {
  verifyAndParseToken,
  getEmailFromAccessToken,
}
