/**
 * Cognimates Training Application
 * 
 * Main application entry point
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { create } = require('express-handlebars');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables from .env file
dotenv.config();

// Import routes
const indexRouter = require('./routes/index');
const textClassifierRouter = require('./routes/text');
const imageClassifierRouter = require('./routes/image');

// --- Environment Validation ---
function validateEnvironment() {
  const requiredVars = [
    'GCP_PROJECT_ID',
    'GCS_BUCKET_NAME',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCP_REGION'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missing.join(', ')}`);
    // Check if credentials file exists
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
          console.error(`FATAL ERROR: Google credentials file not found at: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        }
      } catch (err) {
        console.error(`FATAL ERROR: Error checking credentials file path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`, err);
      }
    }
    return false;
  }
  
  // Log configuration information
  console.log('GCP configuration variables found:');
  console.log(`  GCP Project ID: ${process.env.GCP_PROJECT_ID}`);
  console.log(`  GCS Bucket Name: ${process.env.GCS_BUCKET_NAME}`);
  console.log(`  Credentials File: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  console.log(`  GCP Region: ${process.env.GCP_REGION}`);
  
  return true;
}

// Check environment before proceeding
if (!validateEnvironment()) {
  process.exit(1);
}

// --- Application Setup ---
const app = express();

// Configure view engine
const hbs = create({
  defaultLayout: 'main'
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Security-related middleware
app.use(cors()); // Consider configuring CORS with specific origin restrictions in production

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.'
  }
});
app.use('/classify/', apiLimiter);

// Request parsing
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
  extended: false,
  limit: '50mb'
}));

// Static file serving
const staticPath = path.join(__dirname, '..', 'static');
app.use(express.static(staticPath));
console.log(`Serving static files from: ${staticPath}`);

// --- Route Mounting ---
app.use('/', indexRouter);
app.use('/classify/text', textClassifierRouter);
app.use('/classify/image', imageClassifierRouter);

// --- Error Handling ---
// 404 handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  // Set locals for rendering error page (if using views)
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  // Send appropriate error response based on request format
  const statusCode = err.status || 500;
  
  // Always return JSON for API routes that start with /classify/
  const isApiRoute = req.path.startsWith('/classify/');
  
  // API error response format
  return res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    status: statusCode,
    path: req.path
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || process.env.SERVER_PORT || 2634;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

// Start the server with appropriate protocol
function startServer() {
  // Check if we have SSL configuration
  if (SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    try {
      const options = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
      };
      
      const server = https.createServer(options, app);
      server.listen(PORT, () => {
        console.log(`Server running securely at https://localhost:${PORT}`);
      });
      
      // Add error and listening event handlers
      server.on('error', onError);
      server.on('listening', onListening(server));
    } catch (error) {
      console.error('SSL configuration error:', error.message);
      console.log('Falling back to HTTP');
      startHttpServer();
    }
  } else {
    // Start regular HTTP server
    startHttpServer();
  }
}

function startHttpServer() {
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
  
  // Add error and listening event handlers
  server.on('error', onError);
  server.on('listening', onListening(server));
}

/**
 * Normalize a port into a number, string, or false.
 * @param {string} val - Port value to normalize
 * @returns {number|string|boolean} Normalized port
 */
function normalizePort(val) {
  const port = parseInt(val, 10);
  
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
 * @param {Error} error - Error object
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof PORT === 'string'
    ? 'Pipe ' + PORT
    : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
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
 * @param {Object} server - Server instance
 * @returns {Function} Event handler function
 */
function onListening(server) {
  return () => {
    const addr = server.address();
    const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    console.log('Server listening on ' + bind);
  };
}

// Start the server
startServer();

// For testing
module.exports = app;
