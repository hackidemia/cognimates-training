// src/index.js - Main application entry point

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors'); // Enable CORS for frontend interaction

// Import refactored routes
const textRoutes = require('./routes/textRoutes');
const imageRoutes = require('./routes/imageRoutes');
// Import other routes (e.g., indexRoutes) when refactored
// const indexRoutes = require('./routes/indexRoutes');

// --- Basic App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable All CORS Requests (adjust origins in production)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (HTML, CSS, JS for frontend)
// Assuming your static files remain in a 'static' folder at the project root
const staticPath = path.join(__dirname, '..', 'static'); // Go up one level from src/
console.log(`Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// --- API Routes ---
// Mount the refactored routes under a base path (e.g., /api)
app.use('/api/text', textRoutes);
app.use('/api/image', imageRoutes);

app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/home', (req, res) => {
  res.render('home');
});

app.get('/nlc_home', (req, res) => {
  res.render('nlc_home');
});

app.get('/nlc', (req, res) => {
  res.render('nlc');
});

app.get('/nlc_train', (req, res) => {
  res.render('nlc_train');
});

app.get('/train', (req, res) => {
  res.render('nlc_train');
});

app.get('/vision_home', (req, res) => {
  res.render('vision_home');
});

app.get('/vision', (req, res) => {
  res.render('vision');
});

app.get('/vision_train', (req, res) => {
  res.render('vision_train');
});

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Cognimates Training API!' });
});

// --- Central Error Handling Middleware (Example - Recommended) ---
// Place this after all routes
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err); // Log the full error stack

  // Use error status code if available, otherwise default to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    error: 'Server Error',
    details: message,
    // Optionally include stack trace in development only
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Verify essential environment variables on startup
  if (!process.env.GCP_PROJECT_ID) {
      console.error('FATAL ERROR: GCP_PROJECT_ID environment variable is not set.');
      // process.exit(1); // Optionally exit if critical config is missing
  }
   if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable not set. Ensure ADC is configured.');
  }
});
