/**
 * Image Classification Controller
 * 
 * Handles HTTP requests for image classification operations including:
 * - Training models with image datasets
 * - Managing image classifiers
 */

// Import required libraries and services
const GcpAutoMlService = require('../services/gcp-auto-ml');
const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const tmp = require('tmp');
const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');

/**
 * Image data entry for GCS upload
 * @typedef {Object} ImageGcsEntry
 * @property {string} gcsUri - GCS URI of the uploaded image
 * @property {string} label - Classification label for the image
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
 * Train an image classifier with images in a ZIP file
 * @param {import('express').Request} req - Express request object with file from multer
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
async function trainImageClassifier(req, res) {
  const classifierName = req.params.classifier_name;
  
  console.log(`[trainImageClassifier] Received request for classifier: ${classifierName}`);
  
  if (!req.file) {
    return res.status(400).json({ 
      error: 'Missing "images" field with ZIP file in multipart/form-data request' 
    });
  }

  if (!classifierName) {
    return res.status(400).json({ 
      error: 'Missing classifier_name in URL path' 
    });
  }

  console.log(`[trainImageClassifier] Received file: ${req.file.originalname}, Size: ${req.file.size}`);

  let tempZipPath = null;
  let tempExtractDir = null;
  let gcsTrainingData = []; // To store { gcsUri: '...', label: '...' }
  const gcpService = createGcpService();
  const storage = new Storage();
  const bucket = storage.bucket(gcpService.bucketName);

  try {
    // --- 1. Save and Extract ZIP ---
    console.log('[trainImageClassifier] Step 1: Processing ZIP file...');
    // Create a temporary file for the zip
    const tempZipObject = tmp.fileSync({ postfix: '.zip' });
    tempZipPath = tempZipObject.name;
    await fs.writeFile(tempZipPath, req.file.buffer);
    
    // Create a temporary directory for extraction
    const tempDirObject = tmp.dirSync({ unsafeCleanup: true });
    tempExtractDir = tempDirObject.name;
    
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(tempExtractDir, true);
    console.log('[trainImageClassifier] ZIP extraction complete');

    // --- 2. Process Extracted Files and Upload to GCS ---
    const zipEntries = zip.getEntries();
    const gcsUploadPromises = [];
    const gcsBasePrefix = `training-images/${classifierName}/`;

    console.log('[trainImageClassifier] Step 2: Uploading images to GCS...');
    for (const entry of zipEntries) {
      if (entry.isDirectory) {
        continue;
      }
      
      // Skip hidden files or files without a path separator
      if (!entry.entryName.includes('/') || entry.entryName.startsWith('.')) {
        continue;
      }
      
      const pathParts = entry.entryName.split('/');
      
      // Handle the structure: data_training/label/image.jpg
      // Skip if there are not enough parts for a valid structure
      if (pathParts.length < 3) {
        console.warn(`Skipping invalid entry path: ${entry.entryName}`);
        continue;
      }
      
      // Handle the case with 'data_training' folder
      // Get the actual label folder (e.g., 'narwhal', 'unicorn')
      const label = pathParts[pathParts.length - 2];
      
      // Get the filename
      const originalFileName = pathParts[pathParts.length - 1];
      
      // Skip hidden files
      if (originalFileName.startsWith('.')) {
        continue;
      }
      
      // Skip files that aren't images
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
      const hasValidExtension = imageExtensions.some(ext => 
        originalFileName.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        console.warn(`Skipping non-image file: ${entry.entryName}`);
        continue;
      }
      
      console.log(`Processing image: ${entry.entryName} (Label: ${label})`);
      const localFilePath = path.join(tempExtractDir, entry.entryName);

      // Create a unique GCS path to avoid collisions
      const gcsFileName = `${gcsBasePrefix}${label}/${uuidv4()}-${originalFileName}`;
      const gcsUri = `gs://${gcpService.bucketName}/${gcsFileName}`;

      // Add upload promise
      gcsUploadPromises.push(
        bucket.upload(localFilePath, {
          destination: gcsFileName,
        }).then(() => {
          console.log(`Uploaded ${originalFileName} for label '${label}' to ${gcsUri}`);
          gcsTrainingData.push({ gcsUri, label });
        })
      );
    }

    // Wait for all GCS uploads to complete
    await Promise.all(gcsUploadPromises);
    console.log(`Finished uploading ${gcsTrainingData.length} images to GCS`);

    if (gcsTrainingData.length === 0) {
      throw new Error('No valid image files found in the ZIP structure (expected label/image.ext)');
    }

    // --- 3 & 4: Prepare and Upload Import File (CSV format) ---
    const importFileContent = gcsTrainingData.map(item => `${item.gcsUri},${item.label}`).join('\n');
    const importFileName = `import-files/image-${classifierName}-${Date.now()}.csv`;
    
    // Fix: Use appropriate method to create and upload file content
    const importFile = bucket.file(importFileName);
    await importFile.save(importFileContent, {
      contentType: 'text/csv',
    });
    
    const importFileGcsUri = `gs://${gcpService.bucketName}/${importFileName}`;
    console.log(`Import file uploaded: ${importFileGcsUri}`);

    // --- 5. Find or Create Dataset ---
    const datasetResourceName = await gcpService.findOrCreateDataset(classifierName, false);

    // --- 6. Import Data into Dataset ---
    const importResult = await gcpService.importDataToDataset(datasetResourceName, importFileGcsUri, false);
    // Wait for data import to complete before starting training
    await gcpService.getOperationStatus(importResult.operationName);
    console.log('[trainImageClassifier] Data import completed');

    // --- 7. Create and Run Training Pipeline ---
    const modelDisplayName = `${classifierName}-model-${Date.now()}`;
    const trainingResult = await gcpService.startImageModelTraining(datasetResourceName, modelDisplayName);

    // Respond to the client
    res.status(202).json({
      message: `Image training pipeline initiated for classifier '${classifierName}'`,
      datasetResourceName,
      trainingPipelineOperationName: trainingResult.operationName,
      modelDisplayName: trainingResult.modelDisplayName,
      gcsImportFile: importFileGcsUri,
      imageCount: gcsTrainingData.length,
      note: 'Training takes time. Monitor the pipeline in the GCP console.'
    });

  } catch (error) {
    console.error('[trainImageClassifier] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to start training pipeline', 
        details: error.message 
      });
    }
  } finally {
    // Cleanup temporary files/directories
    try {
      if (tempZipPath) await fs.unlink(tempZipPath);
      if (tempExtractDir) await fs.rm(tempExtractDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('[trainImageClassifier] Error cleaning up temporary files:', cleanupError);
    }
  }
}

/**
 * Health check endpoint for image classification service
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
function health(req, res) {
  res.json({ message: 'Image classification service is healthy' });
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
  trainImageClassifier,
  getOperationStatus,
};
