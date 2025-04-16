/**
 * Main Application Routes
 * 
 * Handles primary application routes including home page and documentation
 */

const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * Home page route
 */
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Cognimates Training Platform',
    description: 'Train custom ML models for text and image classification'
  });
});

/**
 * Text classification home page
 */
router.get('/text_home', (req, res) => {
  res.render('models/text-home', {
    title: 'Text Classification',
    description: 'Train and test text classification models'
  });
});

/**
 * Vision classification home page
 */
router.get('/vision_home', (req, res) => {
  res.render('models/vision-home', {
    title: 'Vision Classification',
    description: 'Train and test image classification models'
  });
});

/**
 * New text classifier page
 */
router.get('/classify/text/new', (req, res) => {
  res.render('models/text/new-classifier', {
    title: 'Create Text Classifier',
    description: 'Create and train a new text classifier'
  });
});

/**
 * New vision classifier page
 */
router.get('/classify/vision/new', (req, res) => {
  res.render('models/vision/new-classifier', {
    title: 'Create Vision Classifier',
    description: 'Create and train a new image classifier'
  });
});

/**
 * API documentation route
 */
router.get('/api-docs', (req, res) => {
  res.render('api-docs', {
    title: 'API Documentation',
    endpoints: [
      {
        path: '/classify/text/:classifier_name/train',
        method: 'POST',
        description: 'Train a text classifier with labeled examples',
        params: 'classifier_name (in URL), training_data (in body)'
      },
      {
        path: '/classify/text/:classifier_name',
        method: 'POST',
        description: 'Classify text using a trained model',
        params: 'classifier_name (in URL), phrase (in body)'
      },
      {
        path: '/classify/image/:classifier_name/train',
        method: 'POST',
        description: 'Train an image classifier with labeled examples',
        params: 'classifier_name (in URL), images (ZIP file with folders named by label)'
      }
    ]
  });
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Application is running' });
});

module.exports = router;
