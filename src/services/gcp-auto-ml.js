/**
 * GCP AutoML Service
 * 
 * Provides a centralized interface for interacting with Google Cloud Platform's AutoML services.
 * Handles all API interactions, error handling, and resource management.
 */

// Import required libraries
const { PredictionServiceClient, DatasetServiceClient, ModelServiceClient, PipelineServiceClient } = require('@google-cloud/aiplatform');
const { Storage } = require('@google-cloud/storage');
const { struct } = require('pb-util');

/**
 * Configuration options for the GCP AutoML service
 * @typedef {Object} GcpServiceConfig
 * @property {string} projectId - The GCP project ID
 * @property {string} region - The GCP region (e.g., 'us-central1')
 * @property {string} bucketName - The GCS bucket name for storing training data
 */

/**
 * Service class for GCP AutoML operations
 */
class GcpAutoMlService {
  /**
   * Create a GcpAutoMlService instance
   * @param {GcpServiceConfig} config - Configuration options
   */
  constructor(config) {
    if (!config.projectId || !config.region || !config.bucketName) {
      throw new Error('Missing required configuration parameters: projectId, region, and bucketName are required');
    }

    this.projectId = config.projectId;
    this.region = config.region;
    this.bucketName = config.bucketName;
    this.endpointStore = {}; // In-memory store for classifier -> endpoint mapping

    // Initialize clients with proper endpoint
    const clientOptions = {
      apiEndpoint: `${this.region}-aiplatform.googleapis.com`,
    };

    this.datasetServiceClient = new DatasetServiceClient(clientOptions);
    this.modelServiceClient = new ModelServiceClient(clientOptions);
    this.pipelineServiceClient = new PipelineServiceClient(clientOptions);
    this.predictionServiceClient = new PredictionServiceClient(clientOptions);
    
    // Initialize storage client
    this.storage = new Storage({ projectId: this.projectId });
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Get the location path string for GCP resources
   * @returns {string} The location path string
   */
  getLocationPath() {
    return this.datasetServiceClient.locationPath(this.projectId, this.region);
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
    
    this.endpointStore[classifierName] = endpointName;
    return { classifierName, endpointName };
  }

  /**
   * Get the endpoint for a classifier
   * @param {string} classifierName - The name of the classifier
   * @returns {string|null} The endpoint name or null if not found
   */
  getEndpoint(classifierName) {
    return this.endpointStore[classifierName] || null;
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

    const locationPath = this.getLocationPath();
    
    // Define the dataset resource
    const dataset = {
      displayName,
      metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/text_1.0.0.yaml',
    };

    const request = {
      parent: locationPath,
      dataset,
    };

    try {
      // Create the dataset
      const [operation] = await this.datasetServiceClient.createDataset(request);
      console.log('Create Text Dataset operation:', operation.name);
      
      return {
        operationName: operation.name,
        displayName
      };
    } catch (error) {
      console.error('Error creating text dataset:', error);
      throw new Error(`Failed to create text dataset: ${error.message}`);
    }
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

    const locationPath = this.getLocationPath();
    
    // Define the dataset resource
    const dataset = {
      displayName,
      metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/image_1.0.0.yaml',
    };

    const request = {
      parent: locationPath,
      dataset,
    };

    try {
      // Create the dataset
      const [operation] = await this.datasetServiceClient.createDataset(request);
      console.log('Create Image Dataset operation:', operation.name);
      
      return {
        operationName: operation.name,
        displayName
      };
    } catch (error) {
      console.error('Error creating image dataset:', error);
      throw new Error(`Failed to create image dataset: ${error.message}`);
    }
  }

  /**
   * Find a dataset by display name
   * @param {string} displayName - The display name to search for
   * @returns {Promise<string|null>} The dataset resource name or null if not found
   */
  async findDatasetByDisplayName(displayName) {
    const locationPath = this.getLocationPath();
    const request = {
      parent: locationPath,
      filter: `displayName="${displayName}"`,
    };

    try {
      const [datasets] = await this.datasetServiceClient.listDatasets(request);
      
      if (datasets && datasets.length > 0) {
        if (datasets.length > 1) {
          console.warn(`Multiple datasets found with name '${displayName}'. Using the first one.`);
        }
        return datasets[0].name;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding dataset:', error);
      throw new Error(`Failed to find dataset: ${error.message}`);
    }
  }

  /**
   * Find or create a dataset by display name
   * @param {string} displayName - The display name to search for or create
   * @param {boolean} isTextDataset - Whether this is a text or image dataset
   * @returns {Promise<string>} The dataset resource name
   */
  async findOrCreateDataset(displayName, isTextDataset = true) {
    try {
      // Try to find the dataset first
      const existingDataset = await this.findDatasetByDisplayName(displayName);
      if (existingDataset) {
        console.log(`Found existing dataset: ${existingDataset}`);
        return existingDataset;
      }
      
      console.log(`Creating new ${isTextDataset ? 'text' : 'image'} dataset: ${displayName}`);
      
      // Create a new dataset
      const result = isTextDataset 
        ? await this.createTextDataset(displayName)
        : await this.createImageDataset(displayName);
      
      // Wait for the operation to complete
      const operationName = result.operationName;
      let datasetName = null;
      
      // Poll for dataset creation completion
      for (let i = 0; i < 5; i++) {
        // Try to find the dataset after a short delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        datasetName = await this.findDatasetByDisplayName(displayName);
        if (datasetName) {
          console.log(`Dataset created: ${datasetName}`);
          break;
        }
      }
      
      if (!datasetName) {
        throw new Error('Dataset creation operation completed but dataset not found');
      }
      
      return datasetName;
    } catch (error) {
      console.error('Error in findOrCreateDataset:', error);
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

    try {
      // Format data to JSON Lines
      let jsonlContent = '';
      for (const label in trainingData) {
        if (Object.prototype.hasOwnProperty.call(trainingData, label)) {
          trainingData[label].forEach(text => {
            const jsonObj = {
              textContent: text,
              classificationAnnotation: { displayName: label }
            };
            jsonlContent += JSON.stringify(jsonObj) + '\n';
          });
        }
      }

      if (!jsonlContent) {
        throw new Error('No valid training data found after formatting');
      }

      // Upload to GCS
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const gcsFileName = `training-data/${classifierName}-${timestamp}.jsonl`;
      const gcsFile = this.bucket.file(gcsFileName);
      
      await gcsFile.save(jsonlContent, { contentType: 'application/jsonl' });
      
      const gcsUri = `gs://${this.bucketName}/${gcsFileName}`;
      return gcsUri;
    } catch (error) {
      console.error('Error uploading text training data:', error);
      throw new Error(`Failed to upload text training data: ${error.message}`);
    }
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

    try {
      // Use the correct schema URIs for Vertex AI
      const schemaUri = isTextDataset
        ? 'gs://google-cloud-aiplatform/schema/dataset/ioformat/text_classification_single_label_io_format_1.0.0.yaml'
        : 'gs://google-cloud-aiplatform/schema/dataset/ioformat/image_classification_single_label_io_format_1.0.0.yaml';
      
      const importConfigs = [{
        gcsSource: {
          uris: [gcsUri]
        },
        importSchemaUri: schemaUri
      }];

      console.log(`Importing data from ${gcsUri} to dataset ${datasetName}`);
      const [operation] = await this.datasetServiceClient.importData({
        name: datasetName,
        importConfigs,
      });

      console.log(`Data import operation started: ${operation.name}`);
      
      // Wait for the operation to complete
      const [response] = await operation.promise();
      console.log('Data import completed successfully');
      
      return {
        operationName: operation.name,
        completed: true,
      };
    } catch (error) {
      console.error('Error importing data to dataset:', error);
      throw new Error(`Failed to import data to dataset: ${error.message}`);
    }
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

    try {
      const locationPath = this.getLocationPath();
      const datasetId = this.getNumericIdFromResourceName(datasetName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Using tabular classification for text (more reliable in Vertex AI)
      const trainingPipeline = {
        displayName: `train-${modelDisplayName}-${timestamp}`,
        trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_tabular_1.0.0.yaml',
        trainingTaskInputs: struct.encode({
          targetColumn: 'classificationAnnotation.displayName',
          transformationColumns: [
            { text: { columnName: 'textContent' } }
          ],
          trainBudgetMilliNodeHours: 8000,
          disableEarlyStopping: false,
          predictionType: 'classification',
          optimization_objective: 'minimize-log-loss',
          exportEvaluatedDataItems: true,
          datasetFieldName: {
            text: ['textContent'],
            category: ['classificationAnnotation.displayName']
          }
        }),
        inputDataConfig: {
          datasetId,
          fractionSplit: {
            trainingFraction: 0.8,
            validationFraction: 0.1,
            testFraction: 0.1,
          },
        },
        modelToUpload: {
          displayName: modelDisplayName,
        },
      };

      console.log(`Starting tabular classification for text dataset ${datasetName}`);
      console.log('Training pipeline config:', JSON.stringify(trainingPipeline, null, 2));
      
      const [operation] = await this.pipelineServiceClient.createTrainingPipeline({
        parent: locationPath,
        trainingPipeline,
      });

      console.log(`Training pipeline operation started: ${operation.name}`);
      
      return {
        operationName: operation.name,
        pipelineDisplayName: trainingPipeline.displayName,
        modelDisplayName,
      };
    } catch (error) {
      console.error('Error starting text model training:', error);
      throw new Error(`Failed to start text model training: ${error.message}`);
    }
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

    try {
      const datasetId = this.getNumericIdFromResourceName(datasetResourceName);
      if (!datasetId) {
        throw new Error(`Invalid dataset resource name: ${datasetResourceName}`);
      }
      
      const timestamp = Date.now().toString();
      const pipelineDisplayName = `image-train-${modelDisplayName}-${timestamp}`;
      
      console.log(`Starting image model training for dataset ${datasetResourceName} (ID: ${datasetId})`);
      
      const trainingPipeline = {
        displayName: pipelineDisplayName,
        inputDataConfig: {
          datasetId,
          fractionSplit: {
            trainingFraction: 0.8,
            validationFraction: 0.1,
            testFraction: 0.1,
          }
        },
        trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_image_classification_1.0.0.yaml',
        trainingTaskInputs: struct.encode({
          modelType: 'CLOUD',
          budgetMilliNodeHours: 8000,
          disableEarlyStopping: false,
          multiLabel: false,
        }),
        modelToUpload: {
          displayName: modelDisplayName,
        },
      };

      const request = {
        parent: this.getLocationPath(),
        trainingPipeline,
      };

      console.log('Sending request to create training pipeline');
      const [response] = await this.pipelineServiceClient.createTrainingPipeline(request);
      console.log(`Training pipeline created: ${response.name}`);
      
      return {
        operationName: response.name,
        pipelineDisplayName,
        modelDisplayName,
      };
    } catch (error) {
      console.error('Error starting image model training:', error);
      throw new Error(`Failed to start image model training: ${error.message}`);
    }
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

    try {
      // Find the endpoint using the in-memory store
      const endpointName = this.getEndpoint(classifierName);
      if (!endpointName) {
        throw new Error(`Endpoint for classifier '${classifierName}' not registered. Please train the model and register the endpoint.`);
      }

      // Prepare prediction request
      const instance = {
        content: text
      };
      const instances = [instance];
      const parameters = {};

      const request = {
        endpoint: endpointName,
        instances,
        parameters,
      };

      // Call prediction service
      const [response] = await this.predictionServiceClient.predict(request);

      if (!response || !response.predictions || response.predictions.length === 0) {
        throw new Error('Prediction service returned empty or invalid response');
      }

      // Format results
      const predictions = response.predictions[0];
      const formattedResults = predictions.displayNames.map((displayName, index) => ({
        className: displayName,
        p: predictions.confidences[index]
      }));

      // Sort by probability descending
      return formattedResults.sort((a, b) => b.p - a.p);
    } catch (error) {
      console.error(`Error classifying text for ${classifierName}:`, error);
      throw new Error(`Classification failed: ${error.message}`);
    }
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

    try {
      const [pipeline] = await this.pipelineServiceClient.getTrainingPipeline({
        name: pipelineName
      });
      
      return {
        name: pipeline.name,
        displayName: pipeline.displayName,
        state: pipeline.state,
        createTime: pipeline.createTime,
        startTime: pipeline.startTime,
        endTime: pipeline.endTime,
        updateTime: pipeline.updateTime,
        error: pipeline.error,
        modelId: pipeline.modelId,
      };
    } catch (error) {
      console.error('Error getting training pipeline status:', error);
      throw new Error(`Failed to get training pipeline status: ${error.message}`);
    }
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

    try {
      // For training pipelines, use the specific method
      if (operationName.includes('/trainingPipelines/')) {
        return await this.getTrainingPipelineStatus(operationName);
      }
      
      // For general long-running operations
      const [operation] = await this.pipelineServiceClient.getOperation({
        name: operationName
      });
      
      return {
        done: operation.done,
        name: operation.name,
        metadata: operation.metadata,
        error: operation.error
      };
    } catch (error) {
      console.error('Error getting operation status:', error);
      throw new Error(`Failed to get operation status: ${error.message}`);
    }
  }
}

module.exports = GcpAutoMlService;
