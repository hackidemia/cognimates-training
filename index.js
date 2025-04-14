// Load environment variables from .env file
require('dotenv').config();

const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const bb = require('express-busboy')
const https = require('https')
const args = require('minimist')(process.argv.slice(2))
const { create } = require('express-handlebars')

// --- Import Routers ---
const indexRouter = require('./routes/index'); 
const textClassifierRouter = require('./routes/text');
const imageClassifierRouter = require('./routes/clarifai');

// Check for required environment variables for GCP
if (!process.env.GCP_PROJECT_ID || !process.env.GCS_BUCKET_NAME || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('FATAL ERROR: GCP_PROJECT_ID, GCS_BUCKET_NAME, and GOOGLE_APPLICATION_CREDENTIALS environment variables are required in .env file.');
  // Optionally check if the credential file exists
  try {
    if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.error(`FATAL ERROR: Google credentials file not found at: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }
  } catch (err) {
      console.error(`FATAL ERROR: Error checking credentials file path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`, err);
  }
  process.exit(1); // Exit if essential config is missing
} else {
  console.log('GCP configuration variables found.');
  console.log(`  GCP Project ID: ${process.env.GCP_PROJECT_ID}`);
  console.log(`  GCS Bucket Name: ${process.env.GCS_BUCKET_NAME}`);
  console.log(`  Credentials File: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
}

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

app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '50mb'
}))

// --- Mount Routers ---
app.use('/', indexRouter); 
app.use('/classify/text', textClassifierRouter); 
app.use('/classify/image', imageClassifierRouter); 

// Keep express-busboy for now, though multer is used in clarifai route
// Consider standardizing later if causing issues.
bb.extend(app, {
  upload: true
})

// --- Server Start Logic --- 
const port = process.env.SERVER_PORT || 2634; 

// Start server with appropriate protocol
if (args.http === true || !SSL_KEY_PATH || !SSL_CERT_PATH) {
  // Start HTTP Server
  const server = https.createServer(app); 
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  });
} else {
  try {
    const options = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    }
    const server = https.createServer(options, app)
    server.listen(port, () => {
      console.log(`Server running at https://localhost:${port}`)
    })
  } catch (error) {
    console.error('SSL configuration error:', error.message)
    console.log('Falling back to HTTP')
    const server = https.createServer(app); 
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`)
    });
  }
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening(server) { 
  return () => { 
      var addr = server.address();
      var bind = typeof addr === 'string'
          ? 'pipe ' + addr
          : 'port ' + addr.port;
      console.log('Server listening on ' + bind);
  }
}

// Optional: Add 404 and general error handlers (like in initial structure)
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error'); 
});

module.exports = app;
