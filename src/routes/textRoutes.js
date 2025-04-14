// src/routes/textRoutes.js
const express = require('express');
const { body, param } = require('express-validator'); // Import validation functions
const textController = require('../controllers/textController'); // Import the refactored controller

const router = express.Router();

// --- Validation Middleware ---
// Define reusable validation rules

const validateDatasetName = [
    body('displayName', 'Dataset display name is required and must be a non-empty string').notEmpty().isString().trim(),
];

const validateImportData = [
    body('datasetId', 'Dataset ID is required').notEmpty().isString().trim(),
    // Basic GCS URI validation (can be made more specific)
    body('gcsUri', 'Valid GCS URI (gs://...) is required').matches(/^gs:\/\/.+/),
];

const validateTrainModel = [
    body('datasetId', 'Dataset ID is required').notEmpty().isString().trim(),
    body('modelName', 'Model name is required').notEmpty().isString().trim(),
];

const validateOperationId = [
    // Assuming operationId is just the last part of the name
    param('operationId', 'Operation ID is required in the URL').notEmpty().isString().trim(),
];


// --- Routes ---

router.post(
    '/classifier',
    [
        body('name', 'Classifier name is required').notEmpty().isString().trim(),
        body('training_data', 'Training data array is required').isArray(),
    ],
    textController.createClassifier
);

router.get(
    '/classifier/:operationId',
    validateOperationId,
    textController.getClassifierStatus
);

// POST /api/text/datasets - Create a new text dataset
router.post(
    '/datasets',
    validateDatasetName, // Apply validation middleware
    textController.createTextDataset
);

// POST /api/text/import - Import data into a text dataset
router.post(
    '/import',
    validateImportData, // Apply validation middleware
    textController.importTextData
);

// POST /api/text/train - Train a text model
router.post(
    '/train',
    validateTrainModel, // Apply validation middleware
    textController.trainTextModel
);

// GET /api/text/operations/:operationId - Get status of a long-running operation
router.get(
    '/operations/:operationId',
    validateOperationId, // Apply validation middleware
    textController.getOperationStatus
);

// Add other routes as needed (e.g., listing datasets/models)

module.exports = router;
