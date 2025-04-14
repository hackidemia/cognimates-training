// Import Vertex AI library
const { PredictionServiceClient, DatasetServiceClient, ModelServiceClient, PipelineServiceClient } = require('@google-cloud/aiplatform');
// Import GCS library
const { Storage } = require('@google-cloud/storage');

// --- GCP Configuration (Replace with your details, preferably via env vars) ---
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'your-gcp-project-id'; // TODO: Replace with your Project ID
const GCP_REGION = process.env.GCP_REGION || 'us-central1'; // TODO: Replace with your desired region
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'your-gcs-bucket-name'; // TODO: Bucket for training data

if (GCP_PROJECT_ID === 'your-gcp-project-id' || GCS_BUCKET_NAME === 'your-gcs-bucket-name') {
  console.warn('GCP_PROJECT_ID and GCS_BUCKET_NAME environment variables need to be set for Vertex AI integration.');
}

// --- Initialize Vertex AI Clients ---
const clientOptions = {
  apiEndpoint: `${GCP_REGION}-aiplatform.googleapis.com`,
};
const datasetServiceClient = new DatasetServiceClient(clientOptions);
const modelServiceClient = new ModelServiceClient(clientOptions);
const pipelineServiceClient = new PipelineServiceClient(clientOptions);
const predictionServiceClient = new PredictionServiceClient(clientOptions);

// --- Initialize GCS Client ---
const storage = new Storage({
  projectId: GCP_PROJECT_ID,
});
const bucket = storage.bucket(GCS_BUCKET_NAME);

// In-memory store for classifier_name -> endpointName mapping
// WARNING: This will be lost on server restart!
const endpointStore = {};

function health(req, res){
  res.json({message: 'healthy'});
  return;
}

/**
 * User first creates a classifier by choosing a name.
 * For Vertex AI, this translates to creating a new Dataset.
 */
async function createClassifier(req, res) {
  const classifier_name = req.body.classifier_name;
  console.log(`Received request to create Vertex AI Dataset for: ${classifier_name}`);

  if (!classifier_name) {
    return res.status(400).json({ error: 'classifier_name is required' });
  }

  try {
    const locationPath = datasetServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION);

    // Define the dataset resource
    const dataset = {
      displayName: classifier_name, // Use the provided name
      metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/text_1.0.0.yaml', // Schema for text classification
    };

    const request = {
      parent: locationPath,
      dataset: dataset,
    };

    // Create the dataset
    const [operation] = await datasetServiceClient.createDataset(request);
    console.log('Create Dataset operation:', operation.name);

    // Wait for the operation to complete (optional, but good practice)
    // const [response] = await operation.promise();
    // console.log('Dataset created:', response);

    // Respond immediately after starting the operation
    res.json({ message: `Vertex AI Dataset creation initiated for ${classifier_name}`, operationName: operation.name });

    // TODO: Need to store the mapping between classifier_name and the actual Vertex AI Dataset ID/Name
    // e.g., store `response.name` (which is like projects/PROJECT/locations/REGION/datasets/DATASET_ID)

  } catch (err) {
    console.error('Failed to create Vertex AI Dataset:', err);
    res.status(500).json({ error: `Failed to create Vertex AI Dataset: ${err.message}` });
  }
}

/**
 * Classifies a phrase using a deployed Vertex AI text classification endpoint.
 * Assumes an endpoint exists and can be found based on the classifier_id/name. 
 */
async function classify(req, res) {
  const classifier_id = req.body.classifier_id; // User-provided name, used to find endpoint
  const phrase = req.body.phrase;

  console.log(`Received classification request for classifier_id: ${classifier_id}, phrase: "${phrase}"`);

  if (!classifier_id || !phrase) {
    return res.status(400).json({ error: 'classifier_id and phrase are required' });
  }

  if (GCP_PROJECT_ID === 'your-gcp-project-id') {
    return res.status(500).json({ error: 'GCP Project ID not configured.' });
  }

  try {
    // --- Find the Endpoint using the in-memory store --- 
    const endpointName = endpointStore[classifier_id];

    if (!endpointName) {
      console.error(`Endpoint for classifier '${classifier_id}' not found in store.`);
      throw new Error(`Endpoint for classifier '${classifier_id}' not registered. Please train the model and register the endpoint using the /register-endpoint route.`);
    }
    console.log(`Found endpoint in store: ${endpointName} for classifier: ${classifier_id}`);

    // --- Prepare Prediction Request --- 
    const instance = {
      content: phrase
    };
    const instances = [instance];
    const parameters = {}; // Add parameters if needed for specific model types

    const request = {
      endpoint: endpointName,
      instances: instances,
      parameters: parameters,
    };

    // --- Call Prediction Service --- 
    console.log('Sending prediction request...');
    const [response] = await predictionServiceClient.predict(request);
    console.log('Prediction response received.');

    if (!response || !response.predictions || response.predictions.length === 0) {
      throw new Error('Prediction service returned empty or invalid response.');
    }

    // --- Format Results --- 
    // Assuming AutoML Text Classification structure
    const predictions = response.predictions[0];
    const formattedResults = predictions.displayNames.map((displayName, index) => ({
      className: displayName,
      p: predictions.confidences[index]
    }));

    // Sort by probability descending
    formattedResults.sort((a, b) => b.p - a.p);

    console.log('Formatted predictions:', formattedResults);
    res.json(formattedResults);

  } catch (err) {
    console.error(`Error during classification for ${classifier_id}:`, err);
    // More specific error checking could be added here (e.g., endpoint not found vs. prediction error)
    res.status(500).json({ error: `Classification failed: ${err.message}` });
  }
}

/**
 * Manually registers a deployed Vertex AI endpoint name for a given classifier name.
 */
async function registerEndpoint(req, res) {
  const classifierName = req.body.classifier_name;
  const endpointName = req.body.endpoint_name; // Full endpoint resource name (e.g., projects/.../endpoints/...) 

  if (!classifierName || !endpointName) {
    return res.status(400).json({ error: 'classifier_name and endpoint_name are required' });
  }

  console.log(`Registering endpoint for ${classifierName}: ${endpointName}`);
  endpointStore[classifierName] = endpointName;

  res.json({ message: `Endpoint ${endpointName} registered for classifier ${classifierName}` });
}

/**
 * Trains a Vertex AI AutoML Text Classification model.
 * 1. Formats data to JSON Lines.
 * 2. Uploads data to GCS.
 * 3. Finds the Vertex AI Dataset by name.
 * 4. Imports data from GCS to the Dataset.
 * 5. Creates and starts a Training Pipeline.
 */
async function trainAll(req, res) {
  const classifierName = req.params.classifier_name; // <<< CORRECTED: Use params from URL
  const trainingData = req.body.training_data; // Expected format: { 'label1': ['text1', 'text2'], 'label2': ['text3'] }

  console.log(`Received training request for classifier: ${classifierName}`);

  if (!classifierName || !trainingData || Object.keys(trainingData).length === 0) {
    return res.status(400).json({ error: 'classifier_name and non-empty training_data are required' });
  }

  if (GCP_PROJECT_ID === 'your-gcp-project-id' || GCS_BUCKET_NAME === 'your-gcs-bucket-name') {
    return res.status(500).json({ error: 'GCP Project ID or GCS Bucket Name not configured.' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const gcsFileName = `training-data/${classifierName}-${timestamp}.jsonl`;
  const gcsUri = `gs://${GCS_BUCKET_NAME}/${gcsFileName}`;
  const locationPath = pipelineServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION);

  try {
    // 1. Format data to JSON Lines
    console.log('Formatting data to JSON Lines...');
    let jsonlContent = '';
    for (const label in trainingData) {
      if (trainingData.hasOwnProperty(label)) {
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
        throw new Error('No valid training data found after formatting.');
    }

    // 2. Upload data to GCS
    console.log(`[trainAll: ${classifierName}] Step 2: Uploading formatted data to ${gcsUri}...`); 
    const gcsFile = bucket.file(gcsFileName);
    await gcsFile.save(jsonlContent, { contentType: 'application/jsonl' });
    console.log(`[trainAll: ${classifierName}] Step 2: Upload to GCS complete.`); 

    // 3. Find the Vertex AI Dataset by display name
    // WARNING: This list operation can be slow if you have many datasets.
    // A better approach is storing the dataset ID when created.
    console.log(`[trainAll: ${classifierName}] Step 3: Searching for dataset with display name: ${classifierName}...`); 
    const [datasets] = await datasetServiceClient.listDatasets({ parent: locationPath });
    console.log(`[trainAll: ${classifierName}] Step 3: Dataset list operation complete. Found ${datasets.length} datasets.`); 
    const targetDataset = datasets.find(d => d.displayName === classifierName);

    if (!targetDataset || !targetDataset.name) {
        throw new Error(`Dataset with display name '${classifierName}' not found.`);
    }
    const datasetName = targetDataset.name;
    console.log(`Found dataset: ${datasetName}`);

    // 4. Import data from GCS to the Dataset
    console.log(`[trainAll: ${classifierName}] Step 4: Initiating data import from ${gcsUri} into dataset ${datasetName}...`); 
    const importConfigs = [{
      gcsSource: {
        uris: [gcsUri]
      },
      importSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/import/text_classification_single_label_1.0.0.yaml'
    }];
    const [importOperation] = await datasetServiceClient.importData({
      name: datasetName,
      importConfigs: importConfigs,
    });
    console.log(`[trainAll: ${classifierName}] Step 4: Data import initiated (Operation: ${importOperation.name}).`); 

    // 5. Create and start a Training Pipeline (AutoML Text Classification)
    console.log(`[trainAll: ${classifierName}] Step 5: Starting training pipeline for dataset ${datasetName}...`); 
    const modelDisplayName = `${classifierName}-model-${timestamp}`;
    const trainingPipeline = {
      displayName: `train-${classifierName}-${timestamp}`,
      trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_text_classification_1.0.0.yaml',
      trainingTaskInputs: {
        multiLabel: false, // Assuming single-label classification
      },
      inputDataConfig: {
        datasetId: datasetName.split('/').pop(), // Extract dataset ID from full name
        // fractionSplit needed if dataset doesn't have predefined splits
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

    console.log(`[trainAll: ${classifierName}] Step 5: Creating training pipeline request...`); 
    const [pipelineOperation] = await pipelineServiceClient.createTrainingPipeline({
        parent: locationPath,
        trainingPipeline: trainingPipeline,
    });
    console.log(`[trainAll: ${classifierName}] Step 5: Training pipeline operation started: ${pipelineOperation.name}`); 

    console.log(`[trainAll: ${classifierName}] Sending success response...`); 
    res.json({ 
        message: `Vertex AI training pipeline started for classifier '${classifierName}'.`,
        datasetName: datasetName,
        gcsUri: gcsUri,
        modelDisplayName: modelDisplayName,
        pipelineName: pipelineOperation.name, 
        importOperationName: importOperation.name, // Include import operation name
        note: 'Data import and training pipeline initiated. These are long-running operations. Monitor their status in the GCP console.'
        // pipelineJob: pipelineResponse // The full pipeline details after completion
    });

  } catch (err) {
    console.error(`Error during trainAll for ${classifierName}:`, err);
    // Send error response ONLY if headers haven't already been sent (good practice)
    if (!res.headersSent) {
        console.error(`[trainAll: ${classifierName}] Sending error response...`); 
        res.status(500).json({ error: `Training failed: ${err.message}` });
    } else {
        console.error(`[trainAll: ${classifierName}] Headers already sent, cannot send error response for: ${err.message}`);
    }
  }
}

module.exports = {
  health,
  createClassifier,
  classifyText: classify,
  trainTextClassifier: trainAll, // Renaming for clarity
  registerEndpoint // Export the new function
};
