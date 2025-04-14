// src/services/gcpAutoML.js
// Service layer to handle interactions with Google Cloud AutoML API

// Import the Google Cloud AutoML library
const { AutoMlClient, PredictionServiceClient } = require('@google-cloud/automl').v1;
const { v4: uuidv4 } = require('uuid'); // For generating unique names if needed
const path = require('path');

// --- Configuration ---
// Load configuration from environment variables
const projectId = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'us-central1'; // Default location

// --- Input Validation ---
// Ensure necessary environment variables are set
if (!projectId) {
    console.warn('Warning: Missing required environment variable: GCP_PROJECT_ID');
    if (process.env.NODE_ENV !== 'production') {
        console.log('Running in development mode with mock GCP responses');
    } else {
        throw new Error('Missing required environment variable: GCP_PROJECT_ID');
    }
}
// Check for credentials (AutoMlClient typically finds GOOGLE_APPLICATION_CREDENTIALS automatically)
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable not explicitly set. Relying on default discovery.');
} else if (!path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
     console.warn('Warning: GOOGLE_APPLICATION_CREDENTIALS should be an absolute path for reliability.');
}


// --- Initialize GCP Clients ---
const useMockResponses = !process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.NODE_ENV === 'development';

let autoMlClient;
try {
    autoMlClient = new AutoMlClient();
} catch (error) {
    console.warn('Failed to initialize AutoMlClient:', error.message);
    console.log('Using mock responses for development');
}
// PredictionServiceClient might be needed later for using the trained models
// const predictionServiceClient = new PredictionServiceClient();


// --- Helper Function for Error Handling ---
/**
 * Wraps GCP API calls with error handling and logging.
 * @param {Promise} promise - The GCP API call promise.
 * @param {string} operationDescription - Description of the operation for logging.
 * @returns {Promise<any>} - The result of the API call.
 * @throws {Error} - Throws a custom error with status code if the API call fails.
 */
const handleGcpError = async (promise, operationDescription) => {
    try {
        console.log(`Initiating GCP operation: ${operationDescription}`);
        const result = await promise;
        console.log(`Successfully completed GCP operation: ${operationDescription}`);
        // GCP operations often return an array [response, request, operation] or just [response]
        return result[0] || result;
    } catch (error) {
        console.error(`GCP Error during "${operationDescription}":`, error);
        const errorMessage = error.details || error.message || 'Unknown GCP API error occurred.';
        const customError = new Error(`Failed to ${operationDescription}. Reason: ${errorMessage}`);
        // Attempt to map common GCP error codes to HTTP status codes
        customError.statusCode = mapGcpErrorCode(error.code);
        customError.originalError = error; // Attach original error for deeper inspection if needed
        throw customError;
    }
};

/**
 * Maps Google gRPC error codes to approximate HTTP status codes.
 * @param {number | undefined} grpcCode - The gRPC error code.
 * @returns {number} - An approximate HTTP status code.
 */
const mapGcpErrorCode = (grpcCode) => {
    switch (grpcCode) {
        case 3: // INVALID_ARGUMENT
            return 400; // Bad Request
        case 5: // NOT_FOUND
            return 404; // Not Found
        case 6: // ALREADY_EXISTS
            return 409; // Conflict
        case 7: // PERMISSION_DENIED
            return 403; // Forbidden
        case 16: // UNAUTHENTICATED
            return 401; // Unauthorized
        case 8: // RESOURCE_EXHAUSTED (e.g., Quota)
            return 429; // Too Many Requests
        case 14: // UNAVAILABLE (Often transient)
            return 503; // Service Unavailable
        default:
            return 500; // Internal Server Error
    }
};


// --- Service Methods ---

/**
 * Creates a new dataset in AutoML.
 * @param {string} displayName - The name for the new dataset.
 * @param {'textClassification' | 'imageClassification'} type - The type of dataset.
 * @returns {Promise<object>} - The created dataset object.
 */
const createDataset = async (displayName, type) => {
    if (useMockResponses) {
        console.log(`[MOCK] Creating ${type} dataset: ${displayName}`);
        const mockDatasetId = `mock-dataset-${Date.now()}`;
        const mockDatasetName = `projects/${projectId || 'mock-project'}/locations/${location}/datasets/${mockDatasetId}`;
        
        return {
            name: mockDatasetName,
            displayName: displayName,
            createTime: new Date().toISOString(),
            ...(type === 'textClassification' 
                ? { textClassificationDatasetMetadata: { classificationType: 'MULTICLASS' } }
                : { imageClassificationDatasetMetadata: { classificationType: 'MULTICLASS' } })
        };
    }
    
    const parent = autoMlClient.locationPath(projectId, location);
    let datasetMetadata;

    // Define metadata based on the dataset type
    if (type === 'textClassification') {
        datasetMetadata = { textClassificationDatasetMetadata: { classificationType: 'MULTICLASS' } }; // Or 'MULTILABEL'
    } else if (type === 'imageClassification') {
        datasetMetadata = { imageClassificationDatasetMetadata: { classificationType: 'MULTICLASS' } }; // Or 'MULTILABEL'
    } else {
        throw new Error('Invalid dataset type specified.');
    }

    const request = {
        parent: parent,
        dataset: {
            displayName: displayName,
            ...datasetMetadata,
        },
    };

    return handleGcpError(
        autoMlClient.createDataset(request),
        `create ${type} dataset "${displayName}"`
    );
};

/**
 * Imports data into an existing AutoML dataset from Google Cloud Storage.
 * @param {string} datasetId - The ID of the dataset.
 * @param {string} gcsUri - The GCS URI of the import file (e.g., 'gs://bucket-name/data.csv').
 * @returns {Promise<object>} - The long-running operation object for data import.
 */
const importData = async (datasetId, gcsUri) => {
    if (useMockResponses) {
        console.log(`[MOCK] Importing data from ${gcsUri} into dataset ${datasetId}`);
        const mockOperationId = `mock-import-operation-${Date.now()}`;
        const mockOperationName = `projects/${projectId || 'mock-project'}/locations/${location}/operations/${mockOperationId}`;
        
        return {
            name: mockOperationName,
            metadata: {
                '@type': 'type.googleapis.com/google.cloud.automl.v1.ImportDataOperationMetadata',
                datasetId: datasetId,
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            },
            done: false
        };
    }
    
    const name = autoMlClient.datasetPath(projectId, location, datasetId);
    const inputConfig = {
        gcsSource: {
            inputUris: [gcsUri],
        },
    };

    const request = {
        name: name,
        inputConfig: inputConfig,
    };

    return handleGcpError(
        autoMlClient.importData(request),
        `import data from "${gcsUri}" into dataset "${datasetId}"`
    );
};

/**
 * Starts training a model for a given dataset.
 * @param {string} datasetId - The ID of the dataset to train on.
 * @param {string} modelDisplayName - The desired name for the trained model.
 * @param {'textClassification' | 'imageClassification'} type - The type of model to train.
 * @returns {Promise<object>} - The long-running operation object for model training.
 */
const trainModel = async (datasetId, modelDisplayName, type) => {
    if (useMockResponses) {
        console.log(`[MOCK] Training ${type} model: ${modelDisplayName} on dataset ${datasetId}`);
        const mockOperationId = `mock-train-operation-${Date.now()}`;
        const mockOperationName = `projects/${projectId || 'mock-project'}/locations/${location}/operations/${mockOperationId}`;
        
        return {
            name: mockOperationName,
            metadata: {
                '@type': 'type.googleapis.com/google.cloud.automl.v1.CreateModelOperationMetadata',
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            },
            done: false
        };
    }
    
    const parent = autoMlClient.locationPath(projectId, location);
    let modelMetadata;

    // Define metadata based on the model type
    if (type === 'textClassification') {
        modelMetadata = { textClassificationModelMetadata: {} }; // Add specific config if needed
    } else if (type === 'imageClassification') {
        modelMetadata = { imageClassificationModelMetadata: {} }; // Add specific config like trainBudgetMilliNodeHours if needed
    } else {
        throw new Error('Invalid model type specified.');
    }

    const request = {
        parent: parent,
        model: {
            displayName: modelDisplayName,
            datasetId: datasetId,
            ...modelMetadata,
        },
    };

    return handleGcpError(
        autoMlClient.createModel(request),
        `train ${type} model "${modelDisplayName}" for dataset "${datasetId}"`
    );
};

/**
 * Gets the status of a long-running operation.
 * @param {string} operationName - The full name of the operation (e.g., projects/.../locations/.../operations/...).
 * @returns {Promise<object>} - The operation object containing status information.
 */
const getOperationStatus = async (operationName) => {
    // Validate the operation name format (basic check)
    if (!operationName || !operationName.includes('/operations/')) {
         const error = new Error(`Invalid operation name format: ${operationName}`);
         error.statusCode = 400;
         throw error;
    }
    
    if (useMockResponses) {
        console.log(`[MOCK] Getting status for operation: ${operationName}`);
        
        const operationId = operationName.split('/').pop();
        
        const isImportOperation = operationId.includes('import');
        const isTrainOperation = operationId.includes('train');
        
        const timestampStr = operationId.split('-').pop();
        const timestamp = parseInt(timestampStr, 10);
        const currentTime = Date.now();
        const elapsedTime = currentTime - timestamp;
        
        const isDone = elapsedTime > 10000;
        
        return {
            name: operationName,
            metadata: {
                '@type': isImportOperation 
                    ? 'type.googleapis.com/google.cloud.automl.v1.ImportDataOperationMetadata'
                    : 'type.googleapis.com/google.cloud.automl.v1.CreateModelOperationMetadata',
                createTime: new Date(timestamp).toISOString(),
                updateTime: new Date().toISOString()
            },
            done: isDone,
            ...(isDone && {
                response: {
                    '@type': isTrainOperation 
                        ? 'type.googleapis.com/google.cloud.automl.v1.Model'
                        : 'type.googleapis.com/google.protobuf.Empty',
                    name: isTrainOperation ? `projects/${projectId || 'mock-project'}/locations/${location}/models/mock-model-${timestamp}` : undefined
                }
            })
        };
    }

    const request = {
        name: operationName,
    };

    return handleGcpError(
        autoMlClient.operationsClient.getOperation(request),
        `get status for operation "${operationName}"`
    );
};


// --- Export Service Methods ---
module.exports = {
    createDataset,
    importData,
    trainModel,
    getOperationStatus,
    // Add other necessary methods: listDatasets, listModels, deleteDataset, deleteModel etc.
};
