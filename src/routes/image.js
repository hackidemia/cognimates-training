/**
 * Image Classification Routes
 * 
 * Defines all routes for image classification operations
 */

const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image-controller');
const multer = require('multer');
const { param } = require('express-validator');

// Configure Multer for memory storage (for file uploads)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Middleware for validating request parameters
const validateClassifierName = [
  param('classifier_name')
    .notEmpty()
    .withMessage('classifier_name is required')
    .isString()
    .withMessage('classifier_name must be a string'),
];

const validateOperationName = [
  param('operation_name')
    .notEmpty()
    .withMessage('operation_name is required')
    .isString()
    .withMessage('operation_name must be a string'),
];

// Health check route
router.get('/health', imageController.health);

// Train a classifier with images
router.post(
  '/:classifier_name/train',
  validateClassifierName,
  upload.single('images'),
  imageController.trainImageClassifier
);

// Get operation status - using wildcard to capture full operation path
router.get('/operations/*', imageController.getOperationStatus);

module.exports = router;
