
const {Storage} = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const {v4: uuidv4} = require('uuid');

const projectId = process.env.GCP_PROJECT_ID;
const bucketName = process.env.GCS_BUCKET_NAME;

const useMockResponses = !process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.NODE_ENV === 'development';

let storage;
let bucket;

try {
    storage = new Storage();
    bucket = storage.bucket(bucketName);
} catch (error) {
    console.warn('Failed to initialize Storage client:', error.message);
    console.log('Using mock responses for development');
}

/**
 * Uploads text data to Google Cloud Storage.
 * @param {Array} textData - Array of {phrase, label} objects for training.
 * @param {string} classifierName - Name for the classifier (used in file naming).
 * @returns {Promise<string>} - The GCS URI of the uploaded CSV file.
 */
exports.uploadTextData = async (textData, classifierName) => {
    if (!textData || !Array.isArray(textData) || textData.length === 0) {
        throw new Error('Invalid text data provided.');
    }

    if (useMockResponses) {
        console.log(`[MOCK] Uploading text data for classifier: ${classifierName}`);
        const mockFilename = `text_data_${classifierName.replace(/\s+/g, '_')}_${Date.now()}.csv`;
        const mockGcsUri = `gs://${bucketName || 'mock-bucket'}/text_training/${mockFilename}`;
        
        console.log(`[MOCK] Uploaded ${textData.length} text examples with labels: ${[...new Set(textData.map(item => item.label))].join(', ')}`);
        
        return mockGcsUri;
    }

    try {
        const filename = `text_data_${classifierName.replace(/\s+/g, '_')}_${Date.now()}.csv`;
        const tempFilePath = path.join(os.tmpdir(), filename);

        let csvContent = 'text,label\n';
        textData.forEach(item => {
            const escapedText = item.phrase.replace(/"/g, '""');
            csvContent += `"${escapedText}",${item.label}\n`;
        });

        fs.writeFileSync(tempFilePath, csvContent);

        const gcsFilePath = `text_training/${filename}`;
        await bucket.upload(tempFilePath, {
            destination: gcsFilePath,
            metadata: {
                contentType: 'text/csv',
            },
        });

        fs.unlinkSync(tempFilePath);

        return `gs://${bucketName}/${gcsFilePath}`;
    } catch (error) {
        console.error('Error uploading text data to GCS:', error);
        throw new Error(`Failed to upload text data: ${error.message}`);
    }
};

/**
 * Uploads image data to Google Cloud Storage.
 * @param {Array} imageData - Array of {label, label_items} objects, where label_items contains base64 encoded images.
 * @param {string} classifierName - Name for the classifier (used in file naming).
 * @returns {Promise<string>} - The GCS URI of the uploaded directory.
 */
exports.uploadImageData = async (imageData, classifierName) => {
    if (!imageData || !Array.isArray(imageData) || imageData.length === 0) {
        throw new Error('Invalid image data provided.');
    }

    if (useMockResponses) {
        console.log(`[MOCK] Uploading image data for classifier: ${classifierName}`);
        const mockDirName = `image_data_${classifierName.replace(/\s+/g, '_')}_${Date.now()}`;
        const mockGcsUri = `gs://${bucketName || 'mock-bucket'}/image_training/${mockDirName}.zip`;
        
        const labels = imageData.map(item => item.label);
        const totalImages = imageData.reduce((sum, item) => sum + (item.label_items ? item.label_items.length : 0), 0);
        console.log(`[MOCK] Uploaded ${totalImages} images across ${labels.length} labels: ${labels.join(', ')}`);
        
        return mockGcsUri;
    }

    try {
        const dirName = `image_data_${classifierName.replace(/\s+/g, '_')}_${Date.now()}`;
        const tempDirPath = path.join(os.tmpdir(), dirName);
        
        if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, { recursive: true });
        }

        for (const labelData of imageData) {
            const { label, label_items } = labelData;
            const labelDirPath = path.join(tempDirPath, label);
            
            if (!fs.existsSync(labelDirPath)) {
                fs.mkdirSync(labelDirPath, { recursive: true });
            }
            
            for (let i = 0; i < label_items.length; i++) {
                const base64Data = label_items[i];
                if (!base64Data) continue;
                
                let data = base64Data;
                if (data.includes(',')) {
                    data = data.split(',')[1];
                }
                
                let fileExt = 'jpg'; // Default to jpg
                if (base64Data.includes('data:image/png')) {
                    fileExt = 'png';
                } else if (base64Data.includes('data:image/gif')) {
                    fileExt = 'gif';
                }
                
                const imagePath = path.join(labelDirPath, `image_${i + 1}.${fileExt}`);
                fs.writeFileSync(imagePath, Buffer.from(data, 'base64'));
            }
        }
        
        const zipFilePath = path.join(os.tmpdir(), `${dirName}.zip`);
        const zip = new AdmZip();
        zip.addLocalFolder(tempDirPath);
        zip.writeZip(zipFilePath);
        
        const gcsFilePath = `image_training/${dirName}.zip`;
        await bucket.upload(zipFilePath, {
            destination: gcsFilePath,
            metadata: {
                contentType: 'application/zip',
            },
        });
        
        fs.unlinkSync(zipFilePath);
        fs.rmSync(tempDirPath, { recursive: true, force: true });
        
        return `gs://${bucketName}/${gcsFilePath}`;
    } catch (error) {
        console.error('Error uploading image data to GCS:', error);
        throw new Error(`Failed to upload image data: ${error.message}`);
    }
};
