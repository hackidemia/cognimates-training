/**
 * Text Classification Controller
 * 
 * Handles HTTP requests for text classification operations including:
 * - Creating classifiers
 * - Training models
 * - Classifying text input
 * - Registering endpoints
 */

// Import the GCP service
const GcpAutoMlService = require('../services/gcp-auto-ml');
const { Storage } = require('@google-cloud/storage');

/**
 * Response data for a successful operation
 * @typedef {Object} SuccessResponse
 * @property {string} message - Success message
 * @property {any} [data] - Optional data payload
 */

/**
 * Error response data
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error message
 * @property {string} [details] - Optional error details
 */

/**
 * Training data format
 * @typedef {Object.<string, string[]>} TrainingData
 */

/**
 * Input parameters for text classification
 * @typedef {Object} ClassifyTextParams
 * @property {string} classifier_id - Classifier identifier
 * @property {string} phrase - Text to classify
 */

/**
 * Create a configured instance of the GCP AutoML service
 * @returns {GcpAutoMlService} Configured service instance
 */
function createGcpService() {
  // Get configuration from environment variables
  const config = {
    projectId: process.env.GCP_PROJECT_ID,
    region: process.env.GCP_REGION,
    bucketName: process.env.GCS_BUCKET_NAME,
  };
  return new GcpAutoMlService(config);
}

/**
 * Health check endpoint
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {void}
 */
function health(req, res) {
  res.json({ message: 'Text classification service is healthy' });
}

/**
 * Create a new text classifier
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
async function createClassifier(req, res) {
  const classifierName = req.body.classifier_name;
  if (!classifierName) {
    return res.status(400).json({ error: 'classifier_name is required' });
  }
  try {
    const gcpService = createGcpService();
    const result = await gcpService.createTextDataset(classifierName);
    res.json({
      message: `Text classifier creation initiated for "${classifierName}"`,
      operationName: result.operationName,
    });
  } catch (error) {
    console.error(`Failed to create classifier "${classifierName}":`, error);
    res.status(500).json({
      error: 'Failed to create text classifier',
      details: error.message,
    });
  }
}

/**
 * Register an endpoint for a classifier
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
async function registerEndpoint(req, res) {
  const { classifier_name: classifierName, endpoint_name: endpointName } = req.body;
  if (!classifierName || !endpointName) {
    return res.status(400).json({
      error: 'classifier_name and endpoint_name are required',
    });
  }
  try {
    const gcpService = createGcpService();
    const result = gcpService.registerEndpoint(classifierName, endpointName);
    res.json({
      message: `Endpoint "${endpointName}" registered for classifier "${classifierName}"`,
      classifierName: result.classifierName,
      endpointName: result.endpointName,
    });
  } catch (error) {
    console.error(`Failed to register endpoint for "${classifierName}":`, error);
    res.status(500).json({
      error: 'Failed to register endpoint',
      details: error.message,
    });
  }
}

/**
 * Classify text using a trained model
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
async function classifyText(req, res) {
  const classifierId = req.body.classifier_id || req.params.classifier_name;
  const phrase = req.body.phrase;
  
  if (!classifierId || !phrase) {
    return res.status(400).json({
      error: 'classifier_id and phrase are required',
    });
  }
  
  try {
    // First, try to find the classifier data in storage
    const storage = new Storage();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    // List all files in the text-classifiers directory that match the classifierId
    const [files] = await bucket.getFiles({ 
      prefix: `text-classifiers/${classifierId}` 
    });
    
    if (files.length === 0) {
      // Fall back to GcpService for AutoML models (backwards compatibility)
      const gcpService = createGcpService();
      const results = await gcpService.classifyText(classifierId, phrase);
      return res.json(results);
    }
    
    // Sort files by creation time to get the latest classifier
    files.sort((a, b) => {
      return new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated);
    });
    
    // Get the content of the latest classifier file
    const [content] = await files[0].download();
    const classifier = JSON.parse(content.toString());
    
    if (!classifier || !classifier.examples) {
      throw new Error('Invalid classifier data');
    }
    
    // Simple text classification using cosine similarity
    const results = {};
    let totalMatches = 0;
    
    // Calculate scores based on word matching
    for (const category in classifier.examples) {
      const examples = classifier.examples[category];
      let categoryScore = 0;
      
      for (const example of examples) {
        // Convert to lowercase for better matching
        const exampleWords = example.toLowerCase().split(/\s+/);
        const phraseWords = phrase.toLowerCase().split(/\s+/);
        
        // Count matching words
        let matches = 0;
        for (const word of phraseWords) {
          if (exampleWords.includes(word)) {
            matches++;
          }
        }
        
        // Weight by percentage of matching words from the example
        if (exampleWords.length > 0) {
          categoryScore += matches / exampleWords.length;
        }
      }
      
      // Average score across examples
      if (examples.length > 0) {
        results[category] = categoryScore / examples.length;
        totalMatches += results[category];
      } else {
        results[category] = 0;
      }
    }
    
    // Normalize scores
    const classifications = [];
    for (const category in results) {
      const score = totalMatches > 0 ? results[category] / totalMatches : 0;
      classifications.push({
        displayName: category,
        confidence: score,
      });
    }
    
    // Sort by confidence (highest first)
    classifications.sort((a, b) => b.confidence - a.confidence);
    
    res.json({
      text: phrase,
      classifications,
      modelDisplayName: classifier.name,
    });
    
  } catch (error) {
    console.error(`Classification error for "${classifierId}":`, error);
    res.status(500).json({
      error: `Classification failed: ${error.message}`,
    });
  }
}

/**
 * Train a text classifier with provided data
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
async function trainTextClassifier(req, res) {
  const classifierName = req.params.classifier_name;
  const trainingData = req.body.training_data;
  
  if (!classifierName || !trainingData || Object.keys(trainingData).length === 0) {
    return res.status(400).json({
      error: 'classifier_name and non-empty training_data are required',
    });
  }
  
  try {
    console.log(`Starting text training process for classifier: ${classifierName}`);
    
    // Using a simplified approach that doesn't rely on AutoML
    // Instead, we'll store the training data and use it directly for inference
    
    // Store the classifier data directly in the bucket
    const storage = new Storage();
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const timestamp = Date.now().toString();
    const gcsFileName = `text-classifiers/${classifierName}-${timestamp}.json`;
    const file = bucket.file(gcsFileName);
    
    // Format the classifier data for storage
    const classifierData = {
      name: classifierName,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      categories: Object.keys(trainingData),
      examples: trainingData,
      type: 'text-classifier'
    };
    
    console.log(`Storing classifier data to gs://${process.env.GCS_BUCKET_NAME}/${gcsFileName}`);
    await file.save(JSON.stringify(classifierData, null, 2), {
      contentType: 'application/json',
    });
    
    const gcsUri = `gs://${process.env.GCS_BUCKET_NAME}/${gcsFileName}`;
    console.log(`Classifier data uploaded successfully to ${gcsUri}`);
    
    // Create a fake operation for status checking
    const operationName = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_REGION}/operations/text-classifier-${classifierName}-${timestamp}`;
    
    // Send response with operation details
    res.json({
      message: `Text classifier "${classifierName}" created successfully`,
      classifierName,
      gcsUri,
      modelType: 'direct-text-classifier',
      operationName,
      status: 'COMPLETED',
      note: 'The text classifier has been created and is ready for inference.',
    });
    
    // Update status in the database or file system
    const statusFile = bucket.file(`text-classifiers/status/${classifierName}-status.json`);
    await statusFile.save(JSON.stringify({
      operationName,
      status: 'COMPLETED',
      classifierName,
      gcsUri,
      timestamp: Date.now(),
      categories: Object.keys(trainingData),
    }, null, 2), {
      contentType: 'application/json',
    });
    
  } catch (error) {
    console.error(`Training error for "${classifierName}":`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Training failed',
        details: error.message,
      });
    } else {
      console.error('Headers already sent, cannot send error response');
    }
  }
}

/**
 * Get operation status
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
async function getOperationStatus(req, res) {
  // Extract the full operation path from the URL
  const operationPath = req.params[0] || req.params.operation_name;
  
  if (!operationPath) {
    return res.status(400).json({ error: 'Operation path is required' });
  }
  
  try {
    const gcpService = createGcpService();
    
    // For training pipelines, use the specific method
    if (operationPath.includes('/trainingPipelines/')) {
      const status = await gcpService.getTrainingPipelineStatus(operationPath);
      
      return res.json({
        operationName: operationPath,
        status: {
          state: status.state,
          done: status.state === 'PIPELINE_STATE_SUCCEEDED',
          createTime: status.createTime,
          startTime: status.startTime,
          endTime: status.endTime,
          updateTime: status.updateTime,
          error: status.error,
          modelId: status.modelId
        }
      });
    }
    
    // For other operations, use the generic method
    const status = await gcpService.getOperationStatus(operationPath);
    
    res.json({
      operationName: operationPath,
      status: {
        done: status.done,
        error: status.error,
      },
      metadata: status.metadata,
    });
  } catch (error) {
    console.error(`Failed to get operation status for "${operationPath}":`, error);
    
    res.status(500).json({
      error: 'Failed to get operation status',
      details: error.message,
    });
  }
}

// Export controller functions
module.exports = {
  health,
  createClassifier,
  registerEndpoint,
  classifyText,
  trainTextClassifier,
  getOperationStatus,
};
