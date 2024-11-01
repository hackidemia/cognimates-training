const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const router = require('./router')
const fs = require('fs')
const bb = require('express-busboy')
const https = require('https')
const args = require('minimist')(process.argv.slice(2))
const { create } = require('express-handlebars')

// Set default port if not provided in environment
const PORT = process.env.PORT || process.env.SERVER_PORT || 2634;

// SSL configuration from environment variables
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

const app = express()
app.use(cors())

const hbs = create({
  defaultLayout: 'main'
})

app.engine('handlebars', hbs.engine)
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

// Validate required environment variables
if (!process.env.CLARIFAI_API_KEY) {
  console.warn('CLARIFAI_API_KEY is missing, vision classification will be disabled');
  // Continue without vision classification
}

if (!process.env.UCLASSIFY_READ_API_KEY || !process.env.UCLASSIFY_WRITE_API_KEY) {
  console.error('UCLASSIFY_READ_API_KEY and UCLASSIFY_WRITE_API_KEY environment variables are required');
  process.exit(1);
}

// Start server with appropriate protocol
if (args.http === true || !SSL_KEY_PATH || !SSL_CERT_PATH) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
  })
} else {
  try {
    const options = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    }
    const server = https.createServer(options, app)
    server.listen(PORT, () => {
      console.log(`Server running at https://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('SSL configuration error:', error.message)
    console.log('Falling back to HTTP')
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`)
    })
  }
}
