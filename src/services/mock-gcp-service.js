/**
 * Mock GCP Service Implementation
 * 
 * Provides mock responses for GCP operations when credentials are missing.
 * Used in development mode to allow testing without real GCP credentials.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Creates mock responses for GCP operations
 */
class MockGcpService {
  constructor(config) {
    this.projectId = config.projectId || 'mock-project';
    this.region = config.region || 'us-central1';
    this.bucketName = config.bucketName || 'mock-bucket';
    this.mockStorage = {}; // In-memory storage for mock data
    this.mockOperations = {}; // Track operations
    this.mockDatasets = {}; // Track datasets
    this.mockModels = {}; // Track models
    
    console.log(`[MockGcpService] Initialized with project: ${this.projectId}, region: ${this.region}, bucket: ${this.bucketName}`);
  }

  /**
   * Get the location path string for GCP resources
   * @returns {string} The location path string
   */
  getLocationPath() {
    return `projects/${this.projectId}/locations/${this.region}`;
  }

  /**
   * Extracts the numeric ID from a resource name
   * @param {string} resourceName - The full resource name
   * @returns {string|null} The extracted ID or null if not found
   */
  getNumericIdFromResourceName(resourceName) {
    if (!resourceName) return null;
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Register an endpoint for a classifier
   * @param {string} classifierName - The name of the classifier
   * @param {string} endpointName - The full endpoint resource name
   */
  registerEndpoint(classifierName, endpointName) {
    if (!classifierName || !endpointName) {
      throw new Error('classifierName and endpointName are required');
    }
    
    this.mockStorage[classifierName] = endpointName;
    return { classifierName, endpointName };
  }

  /**
   * Get the endpoint for a classifier
   * @param {string} classifierName - The name of the classifier
   * @returns {string|null} The endpoint name or null if not found
   */
  getEndpoint(classifierName) {
    return this.mockStorage[classifierName] || null;
  }

  /**
   * Create a new text classification dataset
   * @param {string} displayName - The display name for the dataset
   * @returns {Promise<Object>} The operation details
   */
  async createTextDataset(displayName) {
    if (!displayName) {
      throw new Error('displayName is required');
    }

    console.log(`[MockGcpService] Creating text dataset: ${displayName}`);
    const datasetId = `mock-text-dataset-${Date.now()}`;
    const datasetName = `projects/${this.projectId}/locations/${this.region}/datasets/${datasetId}`;
    
    this.mockDatasets[displayName] = {
      name: datasetName,
      displayName,
      createTime: new Date().toISOString(),
      textClassificationDatasetMetadata: { classificationType: 'MULTICLASS' }
    };
    
    const operationId = `mock-create-text-dataset-operation-${Date.now()}`;
    const operationName = `projects/${this.projectId}/locations/${this.region}/operations/${operationId}`;
    
    this.mockOperations[operationName] = {
      name: operationName,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.CreateDatasetOperationMetadata',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      done: true,
      response: {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.Dataset',
        name: datasetName
      }
    };
    
    return {
      operationName,
      displayName
    };
  }

  /**
   * Create a new image classification dataset
   * @param {string} displayName - The display name for the dataset
   * @returns {Promise<Object>} The operation details
   */
  async createImageDataset(displayName) {
    if (!displayName) {
      throw new Error('displayName is required');
    }

    console.log(`[MockGcpService] Creating image dataset: ${displayName}`);
    const datasetId = `mock-image-dataset-${Date.now()}`;
    const datasetName = `projects/${this.projectId}/locations/${this.region}/datasets/${datasetId}`;
    
    this.mockDatasets[displayName] = {
      name: datasetName,
      displayName,
      createTime: new Date().toISOString(),
      imageClassificationDatasetMetadata: { classificationType: 'MULTICLASS' }
    };
    
    const operationId = `mock-create-image-dataset-operation-${Date.now()}`;
    const operationName = `projects/${this.projectId}/locations/${this.region}/operations/${operationId}`;
    
    this.mockOperations[operationName] = {
      name: operationName,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.CreateDatasetOperationMetadata',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      done: true,
      response: {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.Dataset',
        name: datasetName
      }
    };
    
    return {
      operationName,
      displayName
    };
  }

  /**
   * Find a dataset by display name
   * @param {string} displayName - The display name to search for
   * @returns {Promise<string|null>} The dataset resource name or null if not found
   */
  async findDatasetByDisplayName(displayName) {
    console.log(`[MockGcpService] Finding dataset by name: ${displayName}`);
    const dataset = this.mockDatasets[displayName];
    return dataset ? dataset.name : null;
  }

  /**
   * Find or create a dataset by display name
   * @param {string} displayName - The display name to search for or create
   * @param {boolean} isTextDataset - Whether this is a text or image dataset
   * @returns {Promise<string>} The dataset resource name
   */
  async findOrCreateDataset(displayName, isTextDataset = true) {
    try {
      const existingDataset = await this.findDatasetByDisplayName(displayName);
      if (existingDataset) {
        console.log(`[MockGcpService] Found existing dataset: ${existingDataset}`);
        return existingDataset;
      }
      
      console.log(`[MockGcpService] Creating new ${isTextDataset ? 'text' : 'image'} dataset: ${displayName}`);
      
      const result = isTextDataset 
        ? await this.createTextDataset(displayName)
        : await this.createImageDataset(displayName);
      
      return this.mockDatasets[displayName].name;
    } catch (error) {
      console.error('[MockGcpService] Error in findOrCreateDataset:', error);
      throw new Error(`Failed to find or create dataset: ${error.message}`);
    }
  }

  /**
   * Upload text training data to GCS
   * @param {string} classifierName - The name of the classifier
   * @param {Object} trainingData - The training data object with labels as keys and arrays of text as values
   * @returns {Promise<string>} The GCS URI of the uploaded file
   */
  async uploadTextTrainingData(classifierName, trainingData) {
    if (!classifierName || !trainingData || Object.keys(trainingData).length === 0) {
      throw new Error('classifierName and non-empty trainingData are required');
    }

    console.log(`[MockGcpService] Mocking upload of text training data for classifier: ${classifierName}`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const gcsFileName = `training-data/${classifierName}-${timestamp}.jsonl`;
    const gcsUri = `gs://${this.bucketName}/${gcsFileName}`;
    
    this.mockStorage[gcsUri] = trainingData;
    
    return gcsUri;
  }

  /**
   * Import data into a dataset
   * @param {string} datasetName - The dataset resource name
   * @param {string} gcsUri - The GCS URI of the data to import
   * @param {boolean} isTextDataset - Whether this is a text or image dataset
   * @returns {Promise<Object>} The operation details
   */
  async importDataToDataset(datasetName, gcsUri, isTextDataset = true) {
    if (!datasetName || !gcsUri) {
      throw new Error('datasetName and gcsUri are required');
    }

    console.log(`[MockGcpService] Mocking import of data from ${gcsUri} to dataset ${datasetName}`);
    
    const operationId = `mock-import-operation-${Date.now()}`;
    const operationName = `projects/${this.projectId}/locations/${this.region}/operations/${operationId}`;
    
    this.mockOperations[operationName] = {
      name: operationName,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.ImportDataOperationMetadata',
        datasetId: this.getNumericIdFromResourceName(datasetName),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      done: true
    };
    
    return {
      operationName,
      completed: true
    };
  }

  /**
   * Start a text model training pipeline
   * @param {string} datasetName - The dataset resource name
   * @param {string} modelDisplayName - The display name for the model
   * @returns {Promise<Object>} The operation details
   */
  async startTextModelTraining(datasetName, modelDisplayName) {
    if (!datasetName || !modelDisplayName) {
      throw new Error('datasetName and modelDisplayName are required');
    }

    console.log(`[MockGcpService] Mocking text model training for dataset ${datasetName} with model name ${modelDisplayName}`);
    
    const operationId = `mock-train-operation-${Date.now()}`;
    const operationName = `projects/${this.projectId}/locations/${this.region}/operations/${operationId}`;
    const modelId = `mock-model-${Date.now()}`;
    const modelName = `projects/${this.projectId}/locations/${this.region}/models/${modelId}`;
    
    this.mockModels[modelDisplayName] = {
      name: modelName,
      displayName: modelDisplayName,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      deploymentState: 'DEPLOYED'
    };
    
    this.mockOperations[operationName] = {
      name: operationName,
      metadata: {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.CreateTrainingPipelineOperationMetadata',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      done: false
    };
    
    setTimeout(() => {
      this.mockOperations[operationName].done = true;
      this.mockOperations[operationName].response = {
        '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.Model',
        name: modelName
      };
    }, 5000);
    
    return {
      operationName,
      pipelineDisplayName: `train-${modelDisplayName}`,
      modelDisplayName
    };
  }

  /**
   * Start an image model training pipeline
   * @param {string} datasetResourceName - The dataset resource name
   * @param {string} modelDisplayName - The display name for the model
   * @returns {Promise<Object>} The operation details
   */
  async startImageModelTraining(datasetResourceName, modelDisplayName) {
    if (!datasetResourceName || !modelDisplayName) {
      throw new Error('datasetResourceName and modelDisplayName are required');
    }

    console.log(`[MockGcpService] Mocking image model training for dataset ${datasetResourceName} with model name ${modelDisplayName}`);
    
    const operationId = `mock-train-operation-${Date.now()}`;
    const operationName = `projects/${this.projectId}/locations/${this.region}/trainingPipelines/${operationId}`;
    const modelId = `mock-model-${Date.now()}`;
    const modelName = `projects/${this.projectId}/locations/${this.region}/models/${modelId}`;
    
    this.mockModels[modelDisplayName] = {
      name: modelName,
      displayName: modelDisplayName,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      deploymentState: 'DEPLOYED'
    };
    
    this.mockOperations[operationName] = {
      name: operationName,
      state: 'PIPELINE_STATE_RUNNING',
      createTime: new Date().toISOString(),
      startTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      modelId: null
    };
    
    setTimeout(() => {
      this.mockOperations[operationName].state = 'PIPELINE_STATE_SUCCEEDED';
      this.mockOperations[operationName].endTime = new Date().toISOString();
      this.mockOperations[operationName].updateTime = new Date().toISOString();
      this.mockOperations[operationName].modelId = modelId;
    }, 5000);
    
    return {
      operationName,
      pipelineDisplayName: `image-train-${modelDisplayName}`,
      modelDisplayName
    };
  }

  /**
   * Classify text using a deployed endpoint
   * @param {string} classifierName - The name of the classifier
   * @param {string} text - The text to classify
   * @returns {Promise<Array>} The classification results
   */
  async classifyText(classifierName, text) {
    if (!classifierName || !text) {
      throw new Error('classifierName and text are required');
    }

    console.log(`[MockGcpService] Mocking text classification for classifier ${classifierName} with text: ${text}`);
    
    return [
      { className: 'positive', p: 0.75 },
      { className: 'negative', p: 0.25 }
    ];
  }

  /**
   * Get the status of a training pipeline
   * @param {string} pipelineName - The training pipeline resource name
   * @returns {Promise<Object>} The pipeline status
   */
  async getTrainingPipelineStatus(pipelineName) {
    if (!pipelineName) {
      throw new Error('pipelineName is required');
    }

    console.log(`[MockGcpService] Getting mock training pipeline status for: ${pipelineName}`);
    
    const pipeline = this.mockOperations[pipelineName];
    if (!pipeline) {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      return {
        name: pipelineName,
        displayName: `mock-pipeline-${Date.now()}`,
        state: 'PIPELINE_STATE_SUCCEEDED',
        createTime: fiveMinutesAgo.toISOString(),
        startTime: fiveMinutesAgo.toISOString(),
        endTime: now.toISOString(),
        updateTime: now.toISOString(),
        error: null,
        modelId: `mock-model-${Date.now()}`
      };
    }
    
    return pipeline;
  }

  /**
   * Get operation status
   * @param {string} operationName - The operation name or full resource path
   * @returns {Promise<{done: boolean, name: string, metadata: Object, error: Object|null}>} The operation status
   */
  async getOperationStatus(operationName) {
    if (!operationName) {
      throw new Error('operationName is required');
    }

    console.log(`[MockGcpService] Getting mock operation status for: ${operationName}`);
    
    if (operationName.includes('/trainingPipelines/')) {
      return await this.getTrainingPipelineStatus(operationName);
    }
    
    const operation = this.mockOperations[operationName];
    if (!operation) {
      return {
        done: true,
        name: operationName,
        metadata: {
          '@type': 'type.googleapis.com/google.cloud.aiplatform.v1.GenericOperationMetadata',
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        },
        error: null
      };
    }
    
    return operation;
  }
}

module.exports = MockGcpService;
