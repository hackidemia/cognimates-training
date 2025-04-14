const express = require('express');
const router = express.Router();
const imageController = require('../controllers/clarifai'); // Ensure controller path is correct
const multer = require('multer');

// Configure Multer for file uploads
// Using memory storage as the controller handles GCS upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // Limit file size (e.g., 50MB)
}); 

// Route to train a classifier
// Uses multer middleware to handle single file upload with field name 'images' (expecting a zip)
router.post('/:classifier_name/train', upload.single('images'), imageController.trainClassifier);

// TODO: Add routes for deleting classifiers if needed
// router.delete('/:classifier_name', imageController.deleteClassifier);

module.exports = router;
