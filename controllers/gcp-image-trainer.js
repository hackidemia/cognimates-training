require('dotenv').config(); // Ensure env vars are loaded
const { Storage } = require('@google-cloud/storage');
const { PredictionServiceClient, DatasetServiceClient, ModelServiceClient, PipelineServiceClient } = require('@google-cloud/aiplatform');
const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip'); 
const tmp = require('tmp');
const { v4: uuidv4 } = require('uuid');
const { struct } = require('pb-util');

// --- GCP Configuration --- 
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCP_REGION = process.env.GCP_REGION || 'us-central1'; 

// Input validation (ensure these are set in .env)
if (!GCP_PROJECT_ID || !GCS_BUCKET_NAME || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('FATAL ERROR: Missing required GCP environment variables (GCP_PROJECT_ID, GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS).');
  process.exit(1);
}

// --- Vertex AI Clients --- 
const datasetServiceClient = new DatasetServiceClient({ apiEndpoint: `${GCP_REGION}-aiplatform.googleapis.com` });
const pipelineServiceClient = new PipelineServiceClient({ apiEndpoint: `${GCP_REGION}-aiplatform.googleapis.com` });
const modelServiceClient = new ModelServiceClient({ apiEndpoint: `${GCP_REGION}-aiplatform.googleapis.com` });

// GCS Client
const storage = new Storage({ projectId: GCP_PROJECT_ID });
const bucket = storage.bucket(GCS_BUCKET_NAME);

// --- Utility Functions (Keep if needed, otherwise remove) ---
// (Example: function to extract numeric ID - adjust as needed)
function getNumericIdFromResourceName(resourceName) {
    if (!resourceName) return null;
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
}

// --- Helper function to find or create dataset (Refactored for clarity) ---
async function findOrCreateDataset(datasetDisplayName) {
    console.log(`[findOrCreateDataset] Looking for dataset: ${datasetDisplayName}`);
    const locationPath = datasetServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION);
    const listRequest = {
        parent: locationPath,
        filter: `displayName="${datasetDisplayName}"`,
    };
    const [datasets] = await datasetServiceClient.listDatasets(listRequest);

    if (datasets && datasets.length > 0) {
        if (datasets.length > 1) {
            console.warn(`[findOrCreateDataset] Multiple datasets found with name '${datasetDisplayName}'. Using the first one: ${datasets[0].name}`);
        }
        console.log(`[findOrCreateDataset] Found existing dataset: ${datasets[0].name}`);
        return datasets[0].name; // Return full resource name
    } else {
        console.log(`[findOrCreateDataset] Dataset '${datasetDisplayName}' not found. Creating...`);
        const datasetToCreate = {
            displayName: datasetDisplayName,
            metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/image_1.0.0.yaml',
        };
        const createRequest = {
            parent: locationPath,
            dataset: datasetToCreate,
        };
        const [operation] = await datasetServiceClient.createDataset(createRequest);
        console.log('[findOrCreateDataset] Create Dataset operation started:', operation.name);
        // Wait for the operation to complete to get the dataset resource name
        const [response] = await operation.promise();
        console.log('[findOrCreateDataset] Dataset created:', response.name);
        return response.name; // Return full resource name
    }
}

// --- Helper function to start training pipeline --- 
async function startTrainingPipeline(datasetResourceName, pipelineDisplayName, modelDisplayName) {
    console.log(`[startTrainingPipeline] Starting pipeline '${pipelineDisplayName}' for dataset ${datasetResourceName}`);
    const datasetNumericId = getNumericIdFromResourceName(datasetResourceName);
    if (!datasetNumericId) {
        throw new Error('Could not extract numeric ID from dataset resource name.');
    }

    const trainingPipeline = {
        displayName: pipelineDisplayName,
        inputDataConfig: {
            datasetId: datasetNumericId, 
            // AutoML handles data splitting by default
        },
        trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_image_classification_1.0.0.yaml',
        trainingTaskInputs: struct.encode({
            modelType: 'CLOUD', // Use 'CLOUD' for AutoML model training
            multiLabel: false, // Change to true if needed
            budgetMilliNodeHours: 1000, // Minimum budget (1 node hour)
            disableEarlyStopping: false,
        }),
        modelToUpload: {
            displayName: modelDisplayName, 
        },
    };

    const trainingRequest = {
        parent: pipelineServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION),
        trainingPipeline: trainingPipeline,
    };

    console.log('[startTrainingPipeline] Sending request to create training pipeline...');
    const [operation] = await pipelineServiceClient.createTrainingPipeline(trainingRequest);
    console.log('[startTrainingPipeline] Create Training Pipeline operation started:', operation.name);
    // Don't wait for completion here, just return the operation name
    return operation.name;
}

/**
 * Trains a Vertex AI AutoML Image Classification model.
 * Expects a multipart/form-data request with a single 'images' field containing a ZIP file.
 * The ZIP file should contain folders named after the labels, with images inside.
 * Example ZIP structure:
 *   training_images.zip
 *   ├── label1/
 *   │   ├── image1.jpg
 *   │   └── image2.png
 *   └── label2/
 *       ├── image3.jpeg
 */
exports.trainClassifier = async (req, res) => {
  const classifierName = req.params.classifier_name; // Get name from URL param
  console.log('[trainClassifier] Function entry.'); 

  console.log(`[trainClassifier] Received training request for image classifier: ${classifierName}`);

  if (!req.file) {
    console.error('[trainClassifier] Error: Missing req.file.'); 
    return res.status(400).json({ error: 'Missing "images" field with ZIP file in multipart/form-data request.' });
  }

  if (!classifierName) {
    console.error('[trainClassifier] Error: Missing classifierName.'); 
    return res.status(400).json({ error: 'Missing classifier_name in URL path.' });
  }

  console.log('[trainClassifier] Received uploaded file:', req.file.originalname, 'Size:', req.file.size);

  let tempZipPath = null;
  let tempExtractDir = null;
  let gcsTrainingData = []; // To store { gcsUri: '...', label: '...' }

  try {
    console.log('[trainClassifier] Entering main try block.'); 
    // --- 1. Save and Extract ZIP --- 
    console.log('[trainClassifier] Step 1: Saving uploaded ZIP file temporarily...');
    // Create a temporary file for the zip
    const tempZipObject = tmp.fileSync({ postfix: '.zip' });
    tempZipPath = tempZipObject.name;
    await fs.writeFile(tempZipPath, req.file.buffer);
    console.log(`[trainClassifier] Temporary ZIP saved to: ${tempZipPath}`);

    // Create a temporary directory for extraction
    console.log('[trainClassifier] Creating temporary directory for extraction...');
    const tempDirObject = tmp.dirSync({ unsafeCleanup: true });
    tempExtractDir = tempDirObject.name;
    console.log(`[trainClassifier] Extracting ZIP to temporary directory: ${tempExtractDir}`);

    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(tempExtractDir, /*overwrite*/ true);
    console.log('[trainClassifier] ZIP extraction complete.');

    // --- 2. Process Extracted Files and Upload to GCS ---
    const zipEntries = zip.getEntries(); // Get list of files/folders in zip
    const gcsUploadPromises = [];
    const gcsBasePrefix = `training-images/${classifierName}/`; // GCS path prefix

    console.log('[trainClassifier] Step 2: Processing extracted files and uploading to GCS...');
    for (const entry of zipEntries) {
      console.log(`[trainClassifier] Processing entry: ${entry.entryName}`); 
      if (entry.isDirectory || !entry.entryName.includes('/')) {
        console.log(`[trainClassifier] Skipping entry: ${entry.entryName}`); 
        continue;
      }

      const parts = entry.entryName.split('/');
      if (parts.length < 2 || !parts[0] || !parts[1]) {
          console.warn(`Skipping invalid entry path: ${entry.entryName}`);
          continue; // Expecting label/filename.ext
      }
      console.log(`[trainClassifier] Identified Label: ${parts[0]}, Original Filename: ${parts[parts.length - 1]}`); 
      const label = parts[0];
      const originalFileName = parts[parts.length - 1]; // Get the actual filename
      const localFilePath = path.join(tempExtractDir, entry.entryName);

      // Create a unique GCS path to avoid collisions
      const gcsFileName = `${gcsBasePrefix}${label}/${uuidv4()}-${originalFileName}`;
      const gcsFile = bucket.file(gcsFileName);
      const gcsUri = `gs://${GCS_BUCKET_NAME}/${gcsFileName}`;

      // Add upload promise
      gcsUploadPromises.push(
          gcsFile.upload(localFilePath, {
              destination: gcsFileName,
              // Optional: Set metadata, e.g., contentType
              // metadata: { contentType: 'image/jpeg' }, // Adjust based on file type if needed
          }).then(() => {
              console.log(`Uploaded ${originalFileName} for label '${label}' to ${gcsUri}`);
              gcsTrainingData.push({ gcsUri, label });
              console.log(`[trainClassifier] GCS Upload successful for: ${originalFileName}`); 
          })
      );
    }

    // Wait for all GCS uploads to complete
    await Promise.all(gcsUploadPromises);
    console.log(`Finished uploading ${gcsTrainingData.length} images to GCS.`);
    console.log('[trainClassifier] Step 2 complete: All GCS uploads finished.'); 

    if (gcsTrainingData.length === 0) {
        throw new Error('No valid image files found in the ZIP structure (expected label/image.ext).');
    }

    // --- 3 & 4: Prepare and Upload Import File (CSV format) ---
    console.log('[trainClassifier] Step 3/4: Generating CSV import file content...');
    const importFileContent = gcsTrainingData.map(item => `${item.gcsUri},${item.label}`).join('\n');
    const importFileName = `import-files/image-${classifierName}-${Date.now()}.csv`;
    const gcsImportFile = bucket.file(importFileName);

    console.log(`[trainClassifier] Uploading import file to GCS as ${importFileName}...`);
    await gcsImportFile.save(importFileContent, {
        contentType: 'text/csv',
        // Optional: Make it public for easier debugging if needed, but generally not recommended
        // public: true, 
    });
    const importFileGcsUri = `gs://${GCS_BUCKET_NAME}/${importFileName}`;
    console.log(`[trainClassifier] Import file uploaded: ${importFileGcsUri}`);

    // --- 5. Find or Create Dataset --- 
    const datasetResourceName = await findOrCreateDataset(classifierName);

    // --- 6. Import Data into Dataset --- 
    console.log(`[trainClassifier] Step 6: Importing data from ${importFileGcsUri} into dataset ${datasetResourceName}...`);
    const importDataConfig = [{
        gcsSource: {
            uris: [importFileGcsUri],
        },
        importSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/ioformat/image_classification_single_label_io_format_1.0.0.yaml',
    }];

    const importRequest = {
        name: datasetResourceName,
        importConfigs: importDataConfig,
    };

    const [importOperation] = await datasetServiceClient.importData(importRequest);
    console.log('[trainClassifier] Import Data operation started:', importOperation.name);
    // Wait for data import to complete before starting training
    await importOperation.promise(); 
    console.log('[trainClassifier] Data import completed.');

    // --- 7. Create and Run Training Pipeline --- 
    const pipelineDisplayName = `image-train-${classifierName}-${Date.now()}`;
    const modelDisplayName = `${classifierName}-model`; // Display name for the trained model
    console.log(`[trainClassifier] Step 7: Starting training pipeline '${pipelineDisplayName}' for dataset ${datasetResourceName}`);
    const trainingOperationName = await startTrainingPipeline(datasetResourceName, pipelineDisplayName, modelDisplayName);

    console.log(`[trainClassifier] Training pipeline started. Operation: ${trainingOperationName}`);
    // Respond to the client immediately after starting the pipeline
    res.status(202).json({
        message: `Image training pipeline initiated for classifier '${classifierName}'.`,
        datasetResourceName: datasetResourceName,
        trainingPipelineOperationName: trainingOperationName,
        gcsImportFile: importFileGcsUri,
        note: 'Training takes time. Monitor the pipeline in the GCP console.'
    });

  } catch (error) {
    console.error('[trainClassifier] Error caught in main try/catch block:', error); 
    // Ensure response is sent even if headers were already sent (less likely here, but good practice)
    if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start training pipeline.', details: error.message });
    } else {
        console.error('[trainClassifier] Headers already sent, cannot send error JSON response.');
    }
  } finally {
    // --- Cleanup Temporary Files/Dirs ---
    console.log('[trainClassifier] Entering finally block for cleanup.'); 
    try {
      if (tempZipPath) await fs.unlink(tempZipPath);
      if (tempExtractDir) await fs.rm(tempExtractDir, { recursive: true, force: true }); 
      console.log('[trainClassifier] Temporary files cleaned up successfully.');
    } catch (cleanupError) {
      console.error('[trainClassifier] Error cleaning up temporary files:', cleanupError);
      // Don't prevent response due to cleanup error
    }
    console.log('[trainClassifier] Function exit.'); 
  }
 };
