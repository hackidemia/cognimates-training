/**
 * Text Classification Routes
 * 
 * Defines all routes for text classification operations
 */

const express = require('express');
const router = express.Router();
const textController = require('../controllers/text-controller');
const { body, param } = require('express-validator');

// Middleware for validating request parameters
const validateClassifierName = [
  param('classifier_name')
    .notEmpty()
    .withMessage('classifier_name is required')
    .isString()
    .withMessage('classifier_name must be a string'),
];

const validateClassifyRequest = [
  body('phrase')
    .notEmpty()
    .withMessage('phrase is required')
    .isString()
    .withMessage('phrase must be a string'),
];

const validateEndpointRegistration = [
  body('classifier_name')
    .notEmpty()
    .withMessage('classifier_name is required')
    .isString()
    .withMessage('classifier_name must be a string'),
  body('endpoint_name')
    .notEmpty()
    .withMessage('endpoint_name is required')
    .isString()
    .withMessage('endpoint_name must be a string'),
];

const validateOperationName = [
  param('operation_name')
    .notEmpty()
    .withMessage('operation_name is required')
    .isString()
    .withMessage('operation_name must be a string'),
];

// Health check route
router.get('/health', textController.health);

// Create a new classifier
router.post('/create', textController.createClassifier);

// Train a specific text classifier
router.post('/:classifier_name/train', validateClassifierName, textController.trainTextClassifier);

// Classify text using a specific model
router.post('/:classifier_name', [...validateClassifierName, ...validateClassifyRequest], textController.classifyText);

// Register a deployed endpoint
router.post('/register-endpoint', validateEndpointRegistration, textController.registerEndpoint);

// Get operation status - using wildcard to capture full operation path
router.get('/operations/*', textController.getOperationStatus);

module.exports = router;
