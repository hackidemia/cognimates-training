/**
 * GCP AutoML Service Tests
 * 
 * Unit tests for the GCP AutoML service
 */

// Import the service
const GcpAutoMlService = require('../gcp-auto-ml');

// Mock implementation for GCP clients
jest.mock('@google-cloud/aiplatform', () => {
  return {
    PredictionServiceClient: jest.fn().mockImplementation(() => ({
      predict: jest.fn().mockResolvedValue([{
        predictions: [{
          displayNames: ['positive', 'negative'],
          confidences: [0.8, 0.2]
        }]
      }])
    })),
    DatasetServiceClient: jest.fn().mockImplementation(() => ({
      locationPath: jest.fn().mockReturnValue('projects/test-project/locations/us-central1'),
      createDataset: jest.fn().mockResolvedValue([{
        name: 'operation-123'
      }]),
      listDatasets: jest.fn().mockResolvedValue([[{
        name: 'projects/test-project/locations/us-central1/datasets/123',
        displayName: 'test-dataset'
      }]]),
      importData: jest.fn().mockResolvedValue([{
        name: 'operation-456'
      }])
    })),
    ModelServiceClient: jest.fn().mockImplementation(() => ({})),
    PipelineServiceClient: jest.fn().mockImplementation(() => ({
      locationPath: jest.fn().mockReturnValue('projects/test-project/locations/us-central1'),
      createTrainingPipeline: jest.fn().mockResolvedValue([{
        name: 'operation-789'
      }]),
      getOperation: jest.fn().mockResolvedValue([{
        done: true,
        name: 'operation-789',
        metadata: {},
        error: null
      }])
    }))
  };
});

// Mock implementation for Cloud Storage
jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue(),
          upload: jest.fn().mockResolvedValue()
        })
      })
    }))
  };
});

// Mock pb-util
jest.mock('pb-util', () => {
  return {
    struct: {
      encode: jest.fn().mockReturnValue({})
    }
  };
});

describe('GcpAutoMlService', () => {
  // Configuration for testing
  const testConfig = {
    projectId: 'test-project',
    region: 'us-central1',
    bucketName: 'test-bucket'
  };

  let service;

  beforeEach(() => {
    // Create a fresh instance of the service before each test
    service = new GcpAutoMlService(testConfig);
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should throw error if config is missing required parameters', () => {
      expect(() => new GcpAutoMlService({})).toThrow('Missing required configuration parameters');
      expect(() => new GcpAutoMlService({ projectId: 'test' })).toThrow('Missing required configuration parameters');
    });

    test('should create instance with valid config', () => {
      expect(service.projectId).toBe('test-project');
      expect(service.region).toBe('us-central1');
      expect(service.bucketName).toBe('test-bucket');
      expect(service.endpointStore).toEqual({});
    });
  });

  describe('registerEndpoint', () => {
    test('should throw error if parameters are missing', () => {
      expect(() => service.registerEndpoint()).toThrow('classifierName and endpointName are required');
      expect(() => service.registerEndpoint('classifier')).toThrow('classifierName and endpointName are required');
    });

    test('should register endpoint and return result', () => {
      const result = service.registerEndpoint('my-classifier', 'endpoint-123');
      expect(result).toEqual({
        classifierName: 'my-classifier',
        endpointName: 'endpoint-123'
      });
      expect(service.endpointStore['my-classifier']).toBe('endpoint-123');
    });
  });

  describe('getEndpoint', () => {
    test('should return null if endpoint not found', () => {
      expect(service.getEndpoint('non-existent')).toBeNull();
    });

    test('should return endpoint name if found', () => {
      service.endpointStore['my-classifier'] = 'endpoint-123';
      expect(service.getEndpoint('my-classifier')).toBe('endpoint-123');
    });
  });

  describe('createTextDataset', () => {
    test('should throw error if displayName is missing', async () => {
      await expect(service.createTextDataset()).rejects.toThrow('displayName is required');
    });

    test('should create dataset and return operation details', async () => {
      const result = await service.createTextDataset('test-dataset');
      expect(result).toEqual({
        operationName: 'operation-123',
        displayName: 'test-dataset'
      });
      expect(service.datasetServiceClient.createDataset).toHaveBeenCalledWith({
        parent: 'projects/test-project/locations/us-central1',
        dataset: {
          displayName: 'test-dataset',
          metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/text_1.0.0.yaml'
        }
      });
    });
  });

  describe('findDatasetByDisplayName', () => {
    test('should return dataset if found', async () => {
      service.datasetServiceClient.listDatasets.mockResolvedValueOnce([[{
        name: 'projects/test-project/locations/us-central1/datasets/123',
        displayName: 'test-dataset'
      }]]);
      
      const result = await service.findDatasetByDisplayName('test-dataset');
      expect(result).toBe('projects/test-project/locations/us-central1/datasets/123');
      expect(service.datasetServiceClient.listDatasets).toHaveBeenCalledWith({
        parent: 'projects/test-project/locations/us-central1',
        filter: 'displayName="test-dataset"'
      });
    });

    test('should return null if dataset not found', async () => {
      service.datasetServiceClient.listDatasets.mockResolvedValueOnce([[]]);
      
      const result = await service.findDatasetByDisplayName('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('uploadTextTrainingData', () => {
    test('should throw error if parameters are missing', async () => {
      await expect(service.uploadTextTrainingData()).rejects.toThrow('classifierName and non-empty trainingData are required');
      await expect(service.uploadTextTrainingData('classifier')).rejects.toThrow('classifierName and non-empty trainingData are required');
      await expect(service.uploadTextTrainingData('classifier', {})).rejects.toThrow('classifierName and non-empty trainingData are required');
    });

    test('should format and upload training data', async () => {
      const trainingData = {
        positive: ['Great product', 'Excellent service'],
        negative: ['Poor quality']
      };
      
      const result = await service.uploadTextTrainingData('test-classifier', trainingData);
      expect(result).toContain('gs://test-bucket/training-data/test-classifier-');
      expect(service.bucket.file).toHaveBeenCalled();
    });
  });

  describe('classifyText', () => {
    test('should throw error if parameters are missing', async () => {
      await expect(service.classifyText()).rejects.toThrow('classifierName and text are required');
      await expect(service.classifyText('classifier')).rejects.toThrow('classifierName and text are required');
    });

    test('should throw error if endpoint is not registered', async () => {
      await expect(service.classifyText('non-existent', 'text')).rejects.toThrow('Endpoint for classifier');
    });

    test('should classify text and return formatted results', async () => {
      service.endpointStore['test-classifier'] = 'endpoint-123';
      
      const result = await service.classifyText('test-classifier', 'Sample text');
      expect(result).toEqual([
        { className: 'positive', p: 0.8 },
        { className: 'negative', p: 0.2 }
      ]);
      expect(service.predictionServiceClient.predict).toHaveBeenCalledWith({
        endpoint: 'endpoint-123',
        instances: [{ content: 'Sample text' }],
        parameters: {}
      });
    });
  });
});
