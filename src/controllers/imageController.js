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
        
        if (!data && !useMockResponses) {
            return res.status(400).json({ error: 'Image data is required' });
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
        const classifier_id = req.query.classifier_id;
        if (!classifier_id) {
            return res.status(400).json({ error: 'Missing classifier_id parameter' });
        }

        console.log(`Getting status for classifier: ${classifier_id}`);
        
        if (useMockResponses) {
            console.log('[MOCK] Returning mock classifier status');
            return res.status(200).json({
                classifier_id: classifier_id,
                name: "Mock Classifier",
                created: new Date().toISOString(),
                status: "READY",
                classes: ["class1", "class2", "class3"]
            });
        }

        const operationName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/operations/${classifier_id}`;
        const operation = await gcpService.getOperationStatus(operationName);

        res.status(200).json({
            classifier_id: classifier_id,
            name: "GCP AutoML Classifier",
            created: new Date().toISOString(),
            status: operation.done ? "READY" : "TRAINING",
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

/**
 * Lists all classifiers for the user.
 */
exports.listClassifiers = async (req, res) => {
    try {
        console.log('Listing all classifiers');
        
        if (useMockResponses) {
            console.log('[MOCK] Returning mock classifiers list');
            return res.status(200).json({
                classifiers: [
                    {
                        classifier_id: 'mock-train-operation-' + Date.now(),
                        name: 'Mock Classifier_vision',
                        created: new Date().toISOString(),
                        status: 'READY'
                    },
                    {
                        classifier_id: 'mock-train-operation-' + (Date.now() - 86400000),
                        name: 'Sample Classifier_vision',
                        created: new Date(Date.now() - 86400000).toISOString(),
                        status: 'READY'
                    }
                ]
            });
        }

        const models = await gcpService.listModels();
        
        res.status(200).json({
            classifiers: models.map(model => ({
                classifier_id: model.name.split('/').pop(),
                name: model.displayName,
                created: model.createTime,
                status: model.deploymentState || 'READY'
            }))
        });
    } catch (error) {
        console.error('Error listing classifiers:', error);
        res.status(500).json({
            error: `Failed to list classifiers: ${error.message}`
        });
    }
};

/**
 * Deletes a classifier.
 */
exports.deleteClassifier = async (req, res) => {
    try {
        const classifier_id = req.body.classifier_id;
        if (!classifier_id) {
            return res.status(400).json({ error: 'Missing classifier_id parameter' });
        }

        console.log(`Deleting classifier: ${classifier_id}`);
        
        if (useMockResponses) {
            console.log('[MOCK] Mocking successful classifier deletion');
            return res.status(200).json({
                message: `Classifier ${classifier_id} deleted successfully`
            });
        }

        const modelName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/models/${classifier_id}`;
        await gcpService.deleteModel(modelName);
        
        res.status(200).json({
            message: `Classifier ${classifier_id} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting classifier:', error);
        res.status(500).json({
            error: `Failed to delete classifier: ${error.message}`
        });
    }
};

/**
 * Classifies an image using the specified classifier.
 */
exports.classifyImage = async (req, res) => {
    try {
        const { classifier_id, image_data } = req.body;
        if (!classifier_id) {
            return res.status(400).json({ error: 'Missing classifier_id parameter' });
        }
        if (!image_data) {
            return res.status(400).json({ error: 'Missing image_data parameter' });
        }

        console.log(`Classifying image with classifier: ${classifier_id}`);
        
        if (useMockResponses) {
            console.log('[MOCK] Returning mock classification results');
            return res.status(200).json([
                {
                    class: 'class1',
                    score: 0.85
                },
                {
                    class: 'class2',
                    score: 0.15
                }
            ]);
        }

        const base64Data = image_data.split(',')[1];
        const modelName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/models/${classifier_id}`;
        const results = await gcpService.predictImage(modelName, base64Data);
        
        const formattedResults = results.map(result => ({
            class: result.displayName,
            score: result.classification.score
        }));
        
        res.status(200).json(formattedResults);
    } catch (error) {
        console.error('Error classifying image:', error);
        res.status(500).json({
            error: `Failed to classify image: ${error.message}`
        });
    }
};

// Add other necessary controller methods (e.g., listDatasets, listModels)
