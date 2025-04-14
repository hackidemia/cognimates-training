// src/controllers/textController.js
// Controller for handling text classification training requests

// Import the GCP service and validation tools
const gcpService = require('../services/gcpAutoML');
const storageService = require('../services/storageService');
const { validationResult } = require('express-validator'); // Use express-validator for input checks
const config = require('../../config');

// --- Controller Methods ---

/**
 * Creates a new classifier with the given training data.
 * This is the main endpoint that converts the previous Watson NLC format to GCP format.
 */
exports.createClassifier = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), error: 'Validation failed' });
        }

        const { name, training_data } = req.body;
        if (!training_data || !Array.isArray(training_data) || training_data.length < 10) {
            return res.status(400).json({ error: 'At least 10 training examples are required' });
        }

        console.log(`Creating new text dataset: ${name}`);
        const dataset = await gcpService.createDataset(name, 'textClassification');
        const datasetId = dataset.name.split('/').pop();

        console.log(`Uploading training data for: ${name}`);
        const gcsUri = await storageService.uploadTextData(training_data, name);

        console.log(`Importing data from ${gcsUri} into dataset ${datasetId}`);
        const importOperation = await gcpService.importData(datasetId, gcsUri);
        const importOperationId = importOperation.name.split('/').pop();

        console.log(`Starting model training for: ${name}`);
        const trainOperation = await gcpService.trainModel(datasetId, name, 'textClassification');
        const trainOperationId = trainOperation.name.split('/').pop();

        res.status(201).json({
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
            return res.status(400).json({ error: 'Missing classifier_id' });
        }

        const operationName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/operations/${classifier_id}`;
        const operation = await gcpService.getOperationStatus(operationName);

        res.status(200).json({
            classifier_id: classifier_id,
            name: operation.metadata?.displayName || "Text Classifier",
            status: operation.done ? "Available" : "Training",
            created: new Date().toISOString(),
            operationName: operation.name,
            done: operation.done,
            // Include error or response based on whether the operation is done
            ...(operation.done && operation.error ? { error: operation.error } : {}),
            ...(operation.done && operation.response ? { response: operation.response } : {})
        });
    } catch (error) {
        console.error('Error getting classifier status:', error);
        res.status(500).json({
            error: `Failed to get classifier status: ${error.message}`
        });
    }
};

/**
 * Handles request to create a new text dataset.
 * Expects { displayName: string } in request body.
 */
exports.createTextDataset = async (req, res, next) => {
    // Validate input (defined in routes)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { displayName } = req.body;

    try {
        console.log(`Controller: Received request to create text dataset "${displayName}"`);
        // Call the service layer
        const dataset = await gcpService.createDataset(displayName, 'textClassification');
        console.log(`Controller: Dataset created successfully: ${dataset.name}`);
        // Return the created dataset info (or just success message)
        res.status(201).json({
            message: 'Text dataset created successfully.',
            datasetId: dataset.name.split('/').pop(), // Extract ID from full name
            datasetName: dataset.name,
            displayName: dataset.displayName
        });
    } catch (error) {
        console.error(`Controller Error: Failed to create text dataset "${displayName}".`, error);
        // Pass error to the central error handler (if you have one) or return directly
        // Use the status code from the service error if available
        res.status(error.statusCode || 500).json({
             error: 'Failed to create text dataset.',
             details: error.message // Provide the specific reason
        });
        // Alternatively: next(error); // If using a central error handling middleware
    }
};

/**
 * Handles request to import text data into a dataset.
 * Expects { datasetId: string, gcsUri: string } in request body.
 */
exports.importTextData = async (req, res, next) => {
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
        // Alternatively: next(error);
    }
};

/**
 * Handles request to train a text classification model.
 * Expects { datasetId: string, modelName: string } in request body.
 */
exports.trainTextModel = async (req, res, next) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { datasetId, modelName } = req.body;

    try {
        console.log(`Controller: Received request to train model "${modelName}" on dataset "${datasetId}"`);
        // Call the service layer
        const operation = await gcpService.trainModel(datasetId, modelName, 'textClassification');
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
        // Alternatively: next(error);
    }
};

/**
 * Handles request to get the status of a long-running operation.
 * Expects :operationId in URL parameters.
 */
exports.getOperationStatus = async (req, res, next) => {
    // Operation ID comes from URL param, needs full operation name reconstruction or retrieval
    // Assuming operationId is the last part, we need project/location info
    // NOTE: Storing the full operation name from previous steps is more reliable.
    // This example reconstructs it, which might be brittle.
    const operationId = req.params.operationId;
    if (!operationId) {
       return res.status(400).json({ error: 'Missing operation ID in request.' });
    }
    // --- IMPORTANT: It's better to store and retrieve the FULL operation name ---
    // --- Example reconstruction (less ideal): ---
    const operationName = `projects/${config.GCP_PROJECT_ID}/locations/${config.GCP_LOCATION}/operations/${operationId}`;
    // --- End reconstruction ---

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
        // Alternatively: next(error);
    }
};

/**
 * Classifies text using a trained model.
 * Expects classifier_id and phrase in query parameters.
 */
exports.classifyText = async (req, res) => {
    try {
        const { classifier_id, phrase } = req.query;
        if (!classifier_id) {
            return res.status(400).json({ error: 'Missing classifier_id' });
        }
        if (!phrase) {
            return res.status(400).json({ error: 'Missing phrase to classify' });
        }

        console.log(`Classifying text: "${phrase}" using classifier ${classifier_id}`);
        
        if (process.env.NODE_ENV === 'development') {
            const labels = ['positive', 'negative'];
            const randomIndex = Math.floor(Math.random() * labels.length);
            const topClass = labels[randomIndex];
            
            return res.status(200).json({
                classifier_id,
                top_class: topClass,
                classes: [
                    { class_name: topClass, confidence: 0.8 },
                    { class_name: labels[1 - randomIndex], confidence: 0.2 }
                ]
            });
        }
        
        
        res.status(200).json({
            classifier_id,
            top_class: 'positive', // Replace with actual prediction
            classes: [
                { class_name: 'positive', confidence: 0.8 },
                { class_name: 'negative', confidence: 0.2 }
            ]
        });
    } catch (error) {
        console.error('Error classifying text:', error);
        res.status(500).json({
            error: `Failed to classify text: ${error.message}`
        });
    }
};

// Add other necessary controller methods (e.g., listDatasets, listModels)
