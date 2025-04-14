const axios = require('axios');
const async = require('async');

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

// --- Old uClassify Configuration (Commented out) ---
/*
const base_url = "https://api.uclassify.com/v1/";
// Validate required environment variables
if (!process.env.UCLASSIFY_READ_API_KEY || !process.env.UCLASSIFY_WRITE_API_KEY) {
  console.error('UCLASSIFY_READ_API_KEY and UCLASSIFY_WRITE_API_KEY environment variables are required');
  process.exit(1);
}
const readToken = process.env.UCLASSIFY_READ_API_KEY;
const writeToken = process.env.UCLASSIFY_WRITE_API_KEY;
*/

function health(req, res){
  res.json({message: 'healthy'});
  return;
}

async function getClassifierInformation(req, res) {
  // TODO: Implement equivalent for Vertex AI (e.g., get Dataset or Model details)
  res.status(501).json({ error: 'Not implemented for Vertex AI yet' });
  /*
    var classifier_id = req.body.classifier_id;
    let username = req.body.username;
    get_classifier_url = base_url + username + "/" + classifier_id;
    token_text = "Token " + readToken;
    axios.get(get_classifier_url, {
        headers: {'Content-Type': 'application/json', 'Authorization': token_text}
    })
    .then(response => {
        res.json(response.data);
    })
    .catch(err => {
        res.json({error: err.message});
    });
  */
}

/**
 * This allows for adding examples + more training for a classifier.
 * This will be called after a classifier has already been created.
 * TODO: Refactor for Vertex AI (likely involves adding data to dataset and triggering retraining pipeline)
 */
async function addExamples(req, res) {
  res.status(501).json({ error: 'Not implemented for Vertex AI yet' });
  /*
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  let training_data = req.body.texts;
  var create_url = base_url + "me/" + classifier_name + "/" + class_name + "/train";
  let token_text = 'Token ' + writeToken;
  axios.post(create_url, {texts: training_data}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response.status);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
  */
}

async function createClass(req, res) {
  // TODO: This might map to adding a label/schema to a Vertex AI Dataset?
  res.status(501).json({ error: 'Not implemented for Vertex AI yet' });
  /*
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  var create_url = base_url + "me/" + classifier_name + "/addClass";
  let token_text = 'Token ' + writeToken;
  axios.post(create_url, {className: class_name}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
  */
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

  /*
  let classifier_name = req.body.classifier_name;
  console.log(classifier_name)
  var create_url = base_url + "me/";
  let token_text = 'Token ' + writeToken;
  axios.post(create_url, {classifierName: classifier_name}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
  */
}

async function delClassifier(req, res) {
  // TODO: Implement equivalent for Vertex AI (e.g., delete Model and/or Dataset)
  res.status(501).json({ error: 'Not implemented for Vertex AI yet' });
  /*
  let classifier_id = req.body.classifier_id;
  var del_url = base_url + "me/" + classifier_id;
  let token_text = 'Token ' + writeToken;
  axios.delete(del_url, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
  */
}

/**
 * Classifies a phrase using a deployed Vertex AI text classification endpoint.
 * Assumes an endpoint exists and can be found based on the classifier_id/name.
 */
async function classify(req, res) {
  const classifier_id = req.body.classifier_id; // User-provided name, used to find endpoint
  const phrase = req.body.phrase;
  // const classify_username = req.body.classify_username; // Not directly used with Vertex AI endpoints

  console.log(`Received classification request for classifier_id: ${classifier_id}, phrase: "${phrase}"`);

  if (!classifier_id || !phrase) {
    return res.status(400).json({ error: 'classifier_id and phrase are required' });
  }

  if (GCP_PROJECT_ID === 'your-gcp-project-id') {
    return res.status(500).json({ error: 'GCP Project ID not configured.' });
  }

  try {
    // --- Find the Endpoint --- 
    // WARNING: This is inefficient. Store the endpoint ID/name mapping instead.
    // Assumes endpoint display name follows a convention like `${classifier_id}-endpoint`
    console.log(`Searching for endpoint matching classifier ID: ${classifier_id}...`);
    const parent = predictionServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION);
    const [endpoints] = await predictionServiceClient.listEndpoints({ parent });
    
    // Attempt to find endpoint based on display name convention
    const targetEndpoint = endpoints.find(ep => ep.displayName === `${classifier_id}-endpoint`);

    if (!targetEndpoint || !targetEndpoint.name) {
      // Fallback: Try finding a model first, then its deployments (more complex)
      // Or simply error out if direct endpoint name match fails
      console.error(`Endpoint for classifier '${classifier_id}' not found using convention '${classifier_id}-endpoint'.`);
      // You might need to list models and check their deployedModels status here as a fallback.
      throw new Error(`Endpoint for classifier '${classifier_id}' not found. Ensure the model is trained and deployed, and the endpoint display name matches '${classifier_id}-endpoint'.`);
    }
    const endpointName = targetEndpoint.name;
    console.log(`Found endpoint: ${endpointName}`);

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

  /*
  // OLD uClassify Logic
  var classifier_id = req.body.classifier_id;
{{ ... }}
  });
  */
}

function errorHandler(err, httpResponse){
  // TODO: Update error handling for Vertex AI calls
  if(httpResponse.status === 413 || httpResponse.status === 200){
    return 'Request entity too large';
  } if(httpResponse.status === 530){
    return 'uClassify Service Unavailable';
  } if(httpResponse.status === 400){
    return 'Bad Request. Check your text again.';
  } if(httpResponse.status === 500){
    return 'uClassify has an internal server error.';
  } else {
   return 'Could not classify the text. uClassify service may be unavailable.';
  }
}

async function removeClass(req, res){
  // TODO: Implement equivalent for Vertex AI (removing label/data from dataset?)
  res.status(501).json({ error: 'Not implemented for Vertex AI yet' });
  /*
  let classifier_id = req.body.classifier_name;
  let class_name = req.body.class_name;
  var del_url = base_url + "me/" + classifier_id + "/" + class_name;
  let token_text = 'Token ' + writeToken;
  axios.delete(del_url, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
  */
}

async function untrain(req, res){
  // TODO: Implement equivalent for Vertex AI (removing data from dataset? Retraining?)
  res.status(501).json({ error: 'Not implemented for Vertex AI yet' });
  /*
  let classifier_name = req.body.classifier_name;
  let class_name = req.body.class_name;
  let training_data = req.body.training_data;
  var untrain_url = base_url + "me/" + classifier_name + "/" + class_name + "/untrain";
  let token_text = 'Token ' + writeToken;
  axios.post(untrain_url, {texts: training_data}, {
    headers: {'Content-Type': 'application/json', 'Authorization': token_text}
  })
  .then(response => {
    console.log(response);
    res.json();
  })
  .catch(err => {
    res.json({error: err.message});
  });
  */
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
  const classifierName = req.body.classifier_name;
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
    console.log(`Uploading formatted data to ${gcsUri}...`);
    const gcsFile = bucket.file(gcsFileName);
    await gcsFile.save(jsonlContent, { contentType: 'application/jsonl' });
    console.log('Upload to GCS complete.');

    // 3. Find the Vertex AI Dataset by display name
    // WARNING: This list operation can be slow if you have many datasets.
    // A better approach is storing the dataset ID when created.
    console.log(`Searching for dataset with display name: ${classifierName}...`);
    const [datasets] = await datasetServiceClient.listDatasets({ parent: locationPath });
    const targetDataset = datasets.find(d => d.displayName === classifierName);

    if (!targetDataset || !targetDataset.name) {
        throw new Error(`Dataset with display name '${classifierName}' not found.`);
    }
    const datasetName = targetDataset.name;
    console.log(`Found dataset: ${datasetName}`);

    // 4. Import data from GCS to the Dataset
    console.log(`Importing data from ${gcsUri} into dataset ${datasetName}...`);
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
    console.log(`Import data operation started: ${importOperation.name}. Waiting for completion...`);
    const [importResponse] = await importOperation.promise(); // Wait for import to finish
    console.log('Data import complete:', importResponse);

    // 5. Create and start a Training Pipeline (AutoML Text Classification)
    console.log(`Starting training pipeline for dataset ${datasetName}...`);
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

    const [pipelineOperation] = await pipelineServiceClient.createTrainingPipeline({
        parent: locationPath,
        trainingPipeline: trainingPipeline,
    });
    console.log(`Training pipeline operation started: ${pipelineOperation.name}`);

    res.json({ 
        message: `Vertex AI training pipeline started for classifier '${classifierName}'.`,
        datasetName: datasetName,
        gcsUri: gcsUri,
        modelDisplayName: modelDisplayName,
        pipelineName: pipelineOperation.name, 
        // pipelineJob: pipelineResponse // The full pipeline details after completion
    });

  } catch (err) {
    console.error(`Error during trainAll for ${classifierName}:`, err);
    res.status(500).json({ error: `Training failed: ${err.message}` });
  }

  /*
  // OLD uClassify Logic
  var classifierName = req.body.classifier_name;
  var training_data = req.body.training_data;
  var functionsToExecute = [];
  functionsToExecute.push(getCreateClassifierFunction(writeToken, classifierName));
  Object.keys(training_data).forEach((key) => {
    functionsToExecute.push(getTrainLabelFunction(writeToken, classifierName, key, training_data[key]));
  });

  async.series(functionsToExecute, (err, results) => {
    if (err) {
      var errorMessages = [];
      results.forEach((result) => {
        if (result != null) {
          errorMessages.push(result.message);
        }
      });
      res.json({ error: err.message, errorDetails: errorMessages });
      return;
    }
    res.json();
  });
  */
}

// --- Helper Functions (Commented out uClassify specific ones) ---
/*
function getCreateClassifierFunction(writeAPIKey, classifierName) {
  return function(callback) {
    var create_url = base_url + 'me/';
    let token_text = 'Token ' + writeAPIKey;
    axios.post(create_url, { classifierName: classifierName }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': token_text }
    })
    .then(response => {
      callback(null, null); // Indicate success with no error and no specific result
    })
    .catch(err => {
      callback(err, null); // Indicate error
    });
  };
}

function getTrainLabelFunction(writeAPIKey, classifierName, label, labelData) {
  return function(callback) {
    var train_url = base_url + 'me/' + classifierName + '/' + label + '/train';
    let token_text = 'Token ' + writeAPIKey;
    axios.post(train_url, { texts: labelData }, {
      headers: { 'Content-Type': 'application/json', 'Authorization': token_text }
    })
    .then(response => {
      callback(null, null); // Indicate success
    })
    .catch(err => {
      callback(err, null); // Indicate error
    });
  };
}
*/

// TODO: Add Vertex AI helper functions as needed (e.g., for uploading to GCS)

module.exports = {
  getClassifierInformation: getClassifierInformation,
  classifyText: classify, // Renamed from classify
  deleteClassifier: delClassifier,
  createClass: createClass,
  removeClass: removeClass,
  addExamples: addExamples,
  untrain: untrain,
  trainAll: trainAll,
  createClassifier: createClassifier,
  health: health
};
