// ... (rest of the code remains the same)

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
  console.log('[trainClassifier] Function entry.'); // <<< ADDED LOG

  console.log(`[trainClassifier] Received training request for image classifier: ${classifierName}`);

  if (!req.file) {
    console.error('[trainClassifier] Error: Missing req.file.'); // <<< ADDED LOG
    return res.status(400).json({ error: 'Missing "images" field with ZIP file in multipart/form-data request.' });
  }

  if (!classifierName) {
    console.error('[trainClassifier] Error: Missing classifierName.'); // <<< ADDED LOG
    return res.status(400).json({ error: 'Missing classifier_name in URL path.' });
  }

  console.log('[trainClassifier] Received uploaded file:', req.file.originalname, 'Size:', req.file.size);

  let tempZipPath = null;
  let tempExtractDir = null;
  let gcsTrainingData = []; // To store { gcsUri: '...', label: '...' }

  try {
    console.log('[trainClassifier] Entering main try block.'); // <<< ADDED LOG
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
      console.log(`[trainClassifier] Processing entry: ${entry.entryName}`); // <<< ADDED LOG
      if (entry.isDirectory || !entry.entryName.includes('/')) {
        console.log(`[trainClassifier] Skipping entry: ${entry.entryName}`); // <<< ADDED LOG
        continue;
      }

      const parts = entry.entryName.split('/');
      if (parts.length < 2 || !parts[0] || !parts[1]) {
          console.warn(`Skipping invalid entry path: ${entry.entryName}`);
          continue; // Expecting label/filename.ext
      }
      console.log(`[trainClassifier] Identified Label: ${parts[0]}, Original Filename: ${parts[parts.length - 1]}`); // <<< ADDED LOG
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
              console.log(`[trainClassifier] GCS Upload successful for: ${originalFileName}`); // <<< ADDED LOG
          })
      );
    }

    // Wait for all GCS uploads to complete
    await Promise.all(gcsUploadPromises);
    console.log(`Finished uploading ${gcsTrainingData.length} images to GCS.`);
    console.log('[trainClassifier] Step 2 complete: All GCS uploads finished.'); // <<< ADDED LOG

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

    // --- 5. Find or Create Dataset ID --- 
    let datasetId;
    const datasetDisplayName = classifierName; // Use classifier name as dataset name
    console.log(`Looking for existing dataset with display name: ${datasetDisplayName}...`);
    const listDatasetsRequest = {
        parent: datasetServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION),
        filter: `displayName="${datasetDisplayName}"`, // Filter by display name
    };
    const [datasets] = await datasetServiceClient.listDatasets(listDatasetsRequest);

    if (datasets && datasets.length > 0) {
        if (datasets.length > 1) {
            console.warn(`Multiple datasets found with display name '${datasetDisplayName}'. Using the first one: ${datasets[0].name}`);
        }
        datasetId = datasets[0].name; // Full resource name
        console.log(`Found existing dataset: ${datasetId}`);
    } else {
        console.log(`[trainClassifier] Dataset '${datasetDisplayName}' not found. Creating a new one...`);
        // Create the dataset
        const dataset = {
            displayName: datasetDisplayName,
            metadataSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/image_1.0.0.yaml', // Schema for image data
        };

        const request = {
            parent: datasetServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION),
            dataset: dataset,
        };

        // Create the dataset
        console.log('[trainClassifier] Creating Vertex AI Image Dataset...');
        const [operation] = await datasetServiceClient.createDataset(request);
        console.log('Create dataset operation started:', operation.name);
        console.log('[trainClassifier] Awaiting dataset creation...'); // <<< ADDED LOG
        const [createdDataset] = await operation.promise();
        datasetId = createdDataset.name;
        console.log(`[trainClassifier] Dataset created successfully: ${datasetId}`);
    }
    console.log(`[trainClassifier] Using Dataset ID: ${datasetId}`); // <<< ADDED LOG

    // --- 6. Import Data --- 
    console.log(`[trainClassifier] Step 6: Importing data from ${importFileGcsUri} into dataset ${datasetId}...`);
    const importConfigs = [{
        gcsSource: { uris: [importFileGcsUri] }, // Simplified for CSV
        importSchemaUri: 'gs://google-cloud-aiplatform/schema/dataset/ioformat/image_classification_single_label_io_format_1.0.0.yaml',
    }];

    const importRequest = {
        name: datasetId,
        importConfigs: importConfigs,
    };

    const [importOperation] = await datasetServiceClient.importData(importRequest);
    console.log('Import data operation started:', importOperation.name);
    console.log('[trainClassifier] Waiting for data import to complete (this might take a while)...');
    await importOperation.promise(); // Wait for the import LRO to complete.
    console.log('[trainClassifier] Data import completed.');

    // --- 7. Create and Run Training Pipeline --- 
    console.log('[trainClassifier] Step 7: Defining AutoML Image Classification training pipeline...');
    const pipelineDisplayName = `train-${classifierName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}`;
    const modelDisplayName = `${classifierName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-model`; // More stable model name

    // Check if datasetId is the full resource name
    let datasetNumericId;
    if (datasetId.includes('/')) {
        datasetNumericId = datasetId.split('/').pop();
    } else {
         console.warn('[trainClassifier] Dataset ID does not look like a full resource name. Using it directly, but this might fail:', datasetId);
         datasetNumericId = datasetId; // Hope for the best?
    }

    const trainingPipeline = {
        displayName: pipelineDisplayName,
        inputDataConfig: {
            datasetId: datasetNumericId, // Use the extracted numeric ID
            // AutoML handles data splitting by default
        },
        modelToUpload: {
             displayName: modelDisplayName
        },
        trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_image_classification_1.0.0.yaml',
        trainingTaskInputs: {
             budgetMilliNodeHours: 1000, // 1 node hour budget (minimum recommended)
             modelType: 'CLOUD', // For standard accuracy and latency
             disableEarlyStopping: false,
             // multiLabel: false, // Default is single-label
        }
    };

    // Convert trainingTaskInputs struct to Value
    const { struct } = require('pb-util');
    trainingPipeline.trainingTaskInputs = struct.encode(trainingPipeline.trainingTaskInputs);

    const createPipelineRequest = {
        parent: datasetServiceClient.locationPath(GCP_PROJECT_ID, GCP_REGION),
        trainingPipeline: trainingPipeline,
    };

    console.log('[trainClassifier] Submitting training pipeline job...');
    const [createPipelineOperation] = await pipelineServiceClient.createTrainingPipeline(createPipelineRequest);
    // Note: We don't wait for the *training* pipeline here, as it can take hours.
    // We just acknowledge that it has been submitted.
    const pipelineJobName = createPipelineOperation.name; 
    console.log(`Training pipeline job submitted: ${pipelineJobName}`);
    console.log(`You can monitor the pipeline progress in the Google Cloud Console: Vertex AI -> Training -> Training Pipelines`);

    console.log('[trainClassifier] Pipeline submitted. Sending 202 response.'); // <<< ADDED LOG
    // Respond to the client immediately after submitting the job
    res.status(202).json({ 
        message: 'Training pipeline submitted successfully.',
        datasetId: datasetId,
        pipelineJobName: pipelineJobName,
        importFile: importFileGcsUri,
        monitoringInfo: 'Monitor progress in the Google Cloud Console (Vertex AI -> Training -> Training Pipelines).' 
    });

  } catch (error) {
    console.error('[trainClassifier] Error caught in main try/catch block:', error); // <<< ADDED LOG
    // Ensure response is sent even if headers were already sent (less likely here, but good practice)
    if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start training pipeline.', details: error.message });
    } else {
        console.error('[trainClassifier] Headers already sent, cannot send error JSON response.');
    }
  } finally {
    // --- Cleanup Temporary Files/Dirs ---
    console.log('[trainClassifier] Entering finally block for cleanup.'); // <<< ADDED LOG
    try {
      if (tempZipPath) await fs.unlink(tempZipPath);
      if (tempExtractDir) await fs.rm(tempExtractDir, { recursive: true, force: true }); 
      console.log('[trainClassifier] Temporary files cleaned up successfully.');
    } catch (cleanupError) {
      console.error('[trainClassifier] Error cleaning up temporary files:', cleanupError);
      // Don't prevent response due to cleanup error
    }
    console.log('[trainClassifier] Function exit.'); // <<< ADDED LOG
  }
 };

// ... (rest of the code remains the same)
