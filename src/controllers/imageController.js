// src/controllers/imageController.js
// Controller for handling image classification training requests

// Import the GCP service and validation tools
const gcpService = require('../services/gcpAutoML');
const storageService = require('../services/storageService');
const { validationResult } = require('express-validator');
const config = require('../../config');
const fs = require('fs');
const path = require('path');
const os = require('os');

const useMockResponses = !process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.NODE_ENV === 'development';

const partialUploads = new Map();

// --- Controller Methods ---

/**
 * Creates a new image classifier with the given training data.
 * This is the main endpoint that handles the direct upload of image data.
 */
/**
 * Handles chunked uploads for image training data
 * Expects { name, chunkIndex, totalChunks, label, data } in request body
 */
exports.uploadImageChunk = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), error: 'Validation failed' });
        }

        const { name, chunkIndex, totalChunks, label, data, sessionId } = req.body;
        
        if (!name || !sessionId || chunkIndex === undefined || totalChunks === undefined || !label) {
            return res.status(400).json({ error: 'Missing required fields for chunked upload' });
        }

        console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for label "${label}" in session "${sessionId}"`);
        
        if (!partialUploads.has(sessionId)) {
            partialUploads.set(sessionId, {
                name,
                totalChunks,
                receivedChunks: 0,
                labels: new Map(),
                createdAt: new Date()
            });
        }
        
        const sessionData = partialUploads.get(sessionId);
        
        if (!sessionData.labels.has(label)) {
            sessionData.labels.set(label, []);
        }
        
        if (data) {
            sessionData.labels.get(label).push(data);
        }
        
        sessionData.receivedChunks++;
        
        if (sessionData.receivedChunks === totalChunks) {
            console.log(`All ${totalChunks} chunks received for session "${sessionId}". Processing...`);
            
            const training_data = [];
            for (const [label, images] of sessionData.labels.entries()) {
                training_data.push({
                    label,
                    label_items: images
                });
            }
            
            partialUploads.delete(sessionId);
            
            return await processCompleteUpload(res, name, training_data);
        }
        
        return res.status(200).json({
            message: `Chunk ${chunkIndex + 1}/${totalChunks} received successfully`,
            sessionId,
            receivedChunks: sessionData.receivedChunks,
            totalChunks
        });
    } catch (error) {
        console.error('Error processing image chunk:', error);
        res.status(500).json({
            error: `Failed to process image chunk: ${error.message}`
        });
    }
};

/**
 * Process a complete upload after all chunks have been received
 */
async function processCompleteUpload(res, name, training_data) {
    try {
        if (!training_data || !Array.isArray(training_data) || training_data.length < 2) {
            return res.status(400).json({ error: 'At least 2 labels are required' });
        }

        if (!useMockResponses) {
            for (const labelData of training_data) {
                if (!labelData.label_items || !Array.isArray(labelData.label_items) || labelData.label_items.length < 10) {
                    return res.status(400).json({ error: 'Each label requires at least 10 images' });
                }
            }
        } else {
            console.log('[MOCK] Bypassing image count validation in development mode');
        }

        console.log(`Creating new image dataset: ${name}`);
        const dataset = await gcpService.createDataset(name, 'imageClassification');
        const datasetId = dataset.name.split('/').pop();

        console.log(`Uploading training data for: ${name}`);
        const gcsUri = await storageService.uploadImageData(training_data, name);

        console.log(`Importing data from ${gcsUri} into dataset ${datasetId}`);
        const importOperation = await gcpService.importData(datasetId, gcsUri);
        const importOperationId = importOperation.name.split('/').pop();

        console.log(`Starting model training for: ${name}`);
        const trainOperation = await gcpService.trainModel(datasetId, name, 'imageClassification');
        const trainOperationId = trainOperation.name.split('/').pop();

        return res.status(201).json({
            message: 'Classifier creation and training initiated',
            classifier_id: trainOperationId,
            dataset_id: datasetId,
            name: name,
            created: new Date().toISOString(),
            status: 'TRAINING',
            operationIds: {
                import: importOperationId,
                train: trainOperationId
            }
        });
    } catch (error) {
        console.error('Error creating classifier:', error);
        return res.status(500).json({
            error: `Failed to create classifier: ${error.message}`
        });
    }
}

/**
 * Creates a new image classifier with the given training data.
 * This is the main endpoint that handles the direct upload of image data.
 */
exports.createClassifier = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), error: 'Validation failed' });
        }

        const { name, training_data } = req.body;
        
        return await processCompleteUpload(res, name, training_data);
    } catch (error) {
        console.error('Error creating classifier:', error);
        res.status(500).json({
            error: `Failed to create classifier: ${error.message}`
        });
    }
};

/**
 * Gets the status of a classifier.
 */
exports.getClassifierStatus = async (req, res) => {
    try {
        const operationId = req.params.operationId;
        if (!operationId) {
            return res.status(400).json({ error: 'Missing operation ID' });
        }

        const operationName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/operations/${operationId}`;
        const operation = await gcpService.getOperationStatus(operationName);

        res.status(200).json({
            operationName: operation.name,
            done: operation.done,
            // Include error or response based on whether the operation is done
            ...(operation.done && operation.error ? { error: operation.error } : {}),
            ...(operation.done && operation.response ? { response: operation.response } : {}),
            metadata: operation.metadata
        });
    } catch (error) {
        console.error('Error getting classifier status:', error);
        res.status(500).json({
            error: `Failed to get classifier status: ${error.message}`
        });
    }
};

/**
 * Handles request to create a new image dataset.
 * Expects { displayName: string } in request body.
 */
exports.createImageDataset = async (req, res, next) => {
    // Validate input (defined in routes)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { displayName } = req.body;

    try {
        console.log(`Controller: Received request to create image dataset "${displayName}"`);
        // Call the service layer
        const dataset = await gcpService.createDataset(displayName, 'imageClassification');
        console.log(`Controller: Dataset created successfully: ${dataset.name}`);
        // Return the created dataset info
        res.status(201).json({
            message: 'Image dataset created successfully.',
            datasetId: dataset.name.split('/').pop(), // Extract ID from full name
            datasetName: dataset.name,
            displayName: dataset.displayName
        });
    } catch (error) {
        console.error(`Controller Error: Failed to create image dataset "${displayName}".`, error);
        res.status(error.statusCode || 500).json({
             error: 'Failed to create image dataset.',
             details: error.message
        });
    }
};

/**
 * Handles request to import image data into a dataset.
 * Expects { datasetId: string, gcsUri: string } in request body.
 */
exports.importImageData = async (req, res, next) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { datasetId, gcsUri } = req.body;

    try {
        console.log(`Controller: Received request to import data from "${gcsUri}" to dataset "${datasetId}"`);
        // Call the service layer
        const operation = await gcpService.importData(datasetId, gcsUri);
        console.log(`Controller: Data import operation started: ${operation.name}`);
        // Return the operation name for status polling
        res.status(202).json({
            message: 'Data import process initiated.',
            operationName: operation.name
        });
    } catch (error) {
        console.error(`Controller Error: Failed to import data to dataset "${datasetId}".`, error);
        res.status(error.statusCode || 500).json({
            error: 'Failed to start data import.',
            details: error.message
        });
    }
};

/**
 * Handles request to train an image classification model.
 * Expects { datasetId: string, modelName: string } in request body.
 */
exports.trainImageModel = async (req, res, next) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { datasetId, modelName } = req.body;

    try {
        console.log(`Controller: Received request to train model "${modelName}" on dataset "${datasetId}"`);
        // Call the service layer
        const operation = await gcpService.trainModel(datasetId, modelName, 'imageClassification');
        console.log(`Controller: Model training operation started: ${operation.name}`);
        // Return the operation name for status polling
        res.status(202).json({
            message: 'Model training process initiated.',
            operationName: operation.name
        });
    } catch (error) {
        console.error(`Controller Error: Failed to train model "${modelName}".`, error);
        res.status(error.statusCode || 500).json({
            error: 'Failed to start model training.',
            details: error.message
        });
    }
};

/**
 * Handles request to get the status of a long-running operation.
 * Expects :operationId in URL parameters.
 */
exports.getOperationStatus = async (req, res, next) => {
    const operationId = req.params.operationId;
    if (!operationId) {
       return res.status(400).json({ error: 'Missing operation ID in request.' });
    }
    
    const operationName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/operations/${operationId}`;

    try {
        console.log(`Controller: Received request to get status for operation "${operationName}"`);
        // Call the service layer
        const operation = await gcpService.getOperationStatus(operationName);
        console.log(`Controller: Operation status retrieved: ${operation.done}`);
        // Return the full operation status object
        res.status(200).json({
            operationName: operation.name,
            done: operation.done,
            // Include error or response based on whether the operation is done
            ...(operation.done && operation.error ? { error: operation.error } : {}),
            ...(operation.done && operation.response ? { response: operation.response } : {}),
            metadata: operation.metadata // Contains progress info sometimes
        });
    } catch (error) {
        console.error(`Controller Error: Failed to get status for operation "${operationName}".`, error);
        res.status(error.statusCode || 500).json({
            error: 'Failed to get operation status.',
            details: error.message
        });
    }
};

// Add other necessary controller methods (e.g., listDatasets, listModels)
