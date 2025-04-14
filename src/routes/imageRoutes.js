// src/routes/imageRoutes.js
const express = require('express');
const { body, param } = require('express-validator');
const imageController = require('../controllers/imageController');

const router = express.Router();

// --- Validation Middleware ---
const validateDatasetName = [
    body('displayName', 'Dataset display name is required and must be a non-empty string').notEmpty().isString().trim(),
];

const validateImportData = [
    body('datasetId', 'Dataset ID is required').notEmpty().isString().trim(),
    body('gcsUri', 'Valid GCS URI (gs://...) is required').matches(/^gs:\/\/.+/),
];

const validateTrainModel = [
    body('datasetId', 'Dataset ID is required').notEmpty().isString().trim(),
    body('modelName', 'Model name is required').notEmpty().isString().trim(),
];

const validateOperationId = [
    param('operationId', 'Operation ID is required in the URL').notEmpty().isString().trim(),
];

// --- Routes ---
router.post(
    '/classifier',
    [
        body('name', 'Classifier name is required').notEmpty().isString().trim(),
        body('training_data', 'Training data array is required').isArray(),
    ],
    imageController.createClassifier
);

router.get(
    '/classifier/:operationId',
    validateOperationId,
    imageController.getClassifierStatus
);

// POST /api/image/datasets - Create a new image dataset
router.post(
    '/datasets',
    validateDatasetName,
    imageController.createImageDataset
);

// POST /api/image/import - Import data into an image dataset
router.post(
    '/import',
    validateImportData,
    imageController.importImageData
);

// POST /api/image/train - Train an image model
router.post(
    '/train',
    validateTrainModel,
    imageController.trainImageModel
);

// GET /api/image/operations/:operationId - Get status of a long-running operation
router.get(
    '/operations/:operationId',
    validateOperationId,
    imageController.getOperationStatus
);

module.exports = router;
