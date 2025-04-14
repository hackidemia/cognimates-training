const express = require('express');
const router = express.Router();
const textController = require('../controllers/text'); // Import the text controller

// --- Text Classification Routes ---

// GET /classify/text - Health check or list classifiers (Adjust as needed)
router.get('/', (req, res) => {
  res.status(200).send('Text classification routes are active.');
});

// POST /classify/text/:classifier_name - Classify text using a specific model
router.post('/:classifier_name', textController.classifyText);

// POST /classify/text/:classifier_name/train - Train a specific text classifier
// Note: The trainAll function in controller currently handles multiple, 
// so this route might need adjustment based on how you want to trigger training.
// We might need a dedicated `trainTextClassifier` function in the controller.
// For now, let's point to a placeholder or the existing trainAll.
router.post('/:classifier_name/train', textController.trainAll); // Placeholder - Review this logic

// You might add more routes here if needed, e.g., for deleting classifiers

module.exports = router;
