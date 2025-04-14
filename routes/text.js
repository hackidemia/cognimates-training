const express = require('express');
const router = express.Router();
const textController = require('../controllers/gcp-text-trainer'); // Import the text controller

// --- Text Classification Routes ---

// GET /classify/text - Health check or list classifiers (Adjust as needed)
router.get('/', (req, res) => {
  res.status(200).send('Text classification routes are active.');
});

// POST /classify/text/:classifier_name - Classify text using a specific model
router.post('/:classifier_name', textController.classifyText);

// POST /classify/text/:classifier_name/train - Train a specific text classifier
router.post('/:classifier_name/train', textController.trainTextClassifier); // Use renamed function

// POST /classify/text/register-endpoint - Manually register a deployed endpoint
router.post('/register-endpoint', textController.registerEndpoint);

// You might add more routes here if needed, e.g., for deleting classifiers

module.exports = router;
