const mongoose = require('mongoose')
const { MONGODB_URI, MONGODB_URI_TEST, NODE_ENV } = process.env

const connectionString = NODE_ENV === 'testing' ? MONGODB_URI_TEST+'&w=majority' : MONGODB_URI+'&w=majority'
// primera coneccion a mongodb

mongoose.connect(connectionString, {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('\x1b[36m%s\x1b[0m','database connected en modo ' + NODE_ENV + ' a la base de datos ')
  }).catch(e => {
    console.error(e)
  })
