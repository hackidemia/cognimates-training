const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const router = require('./router')
const fs = require('fs')
const config = require('./config')
const bb = require('express-busboy')
const https = require('https')
const args = require('minimist')(process.argv.slice(2))
const expressHandlebars  = require('express-handlebars')

const app = express()
app.use(cors())

app.engine(
  'handlebars',
  expressHandlebars({
    defaultLayout: 'main'
  })
)
app.set('view engine', 'handlebars')

app.use(express.static(path.join(__dirname, 'static')))

app.use(bodyParser.json({limit: '337mb'}))
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '50mb'
}))
app.use(express.static('static'))

app.use(router)

bb.extend(app, {
  upload: true
})

if(args.http == true) {
  app.listen(config.SERVER_PORT, () => {
    console.log(`Server running at http://localhost:${config.SERVER_PORT}`)
  })
} else {
  const config = require('./config')
  var options = {
    ca: fs.readFileSync(config.sslCA),
    key: fs.readFileSync(config.sslKeyPath),
    cert: fs.readFileSync(config.sslCertPath)
  }
  var server = https.createServer(options, app)
  server.listen(config.SERVER_PORT, () => {
    console.log(`Server running http://localhost:${config.SERVER_PORT}`)
  })
}

