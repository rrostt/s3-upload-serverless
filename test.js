const streams = require('./adapters/streamsS3')

const main = async () => {
  await streams.addStream({ userId: 'rrostt@gmail.com', title: 'test', description: 'test' })
  const streamsByUser = await streams.getStreamsByUserId('rrostt@gmail.com')
  console.log({ streamsByUser })
}

main()

