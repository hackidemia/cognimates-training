const express = require('express');
const router = express.Router();
const clarifai = require('./controllers/clarifai');
const text = require('./controllers/text');
const health = require('./controllers/health');
const testImages = require('./controllers/test-images');

// Home route
router.get('/', (req, res) => {
  console.log('Rendering home page');
  res.render('home', {
    title: 'Cognimates Training Platform',
    layout: 'main'
  });
});

// Text classification routes
router.get('/text_home', (req, res) => {
  res.render('models/text/text_classifiers', {
    title: 'Text Classification',
    layout: 'main'
  });
});

router.post('/api/text/classify', text.classify);
router.post('/api/text/train', text.trainAll);

// Vision classification routes
router.get('/vision_home', (req, res) => {
  res.render('models/vision/vision_classifiers', {
    title: 'Vision Classification',
    layout: 'main'
  });
});

router.get('/vision/classifiers', clarifai.getClassifiers);
router.post('/api/vision/classify', clarifai.classify);
router.post('/api/vision/classifyURLImage', clarifai.classifyURLImage);
router.post('/vision/classifier', clarifai.createClassifier);
router.post('/api/vision/train', clarifai.trainClassifier);

// File upload route for vision training
router.post('/file/post', clarifai.uploadFile);

// Test images routes
router.use('/test-images', testImages);

// Health check route
router.get('/health', health.check);

module.exports = router;
