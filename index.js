require('dotenv').config();
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const path = require('path');
const router = require('./router');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 2634;
const host = process.env.HOST || '0.0.0.0';

// Configure body-parser first
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS
app.use(cors());

// Check and log environment variables
console.log('Environment Variables Check:');
console.log('UCLASSIFY_READ_API_KEY:', process.env.UCLASSIFY_READ_API_KEY ? 'Present' : 'Missing');
console.log('UCLASSIFY_WRITE_API_KEY:', process.env.UCLASSIFY_WRITE_API_KEY ? 'Present' : 'Missing');
console.log('CLARIFAI_API_KEY:', process.env.CLARIFAI_API_KEY ? 'Present' : 'Missing');

// Configure handlebars
const hbs = exphbs.create({
  defaultLayout: 'main',
  extname: '.handlebars',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials')
});

// Set up view engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Serve static files with proper content types and logging
app.use('/static', express.static(path.join(__dirname, 'static'), {
  setHeaders: (res, filepath) => {
    // Set appropriate content types for different file extensions
    if (filepath.endsWith('.jpg') || filepath.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filepath.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filepath.endsWith('.svg')) {
      res.set('Content-Type', 'image/svg+xml');
    } else if (filepath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filepath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }

    // Log detailed information about the served file
    const relativePath = filepath.replace(__dirname, '');
    console.log(`Serving static file: ${relativePath} (${res.get('Content-Type')})`);
  },
  fallthrough: false, // Return 404 if file not found
  index: false // Disable directory indexing
}));

// Routes
app.use('/', router);

app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
});
