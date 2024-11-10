const fs = require('fs');
const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Read API key directly from .env file
let apiKey;
try {
    const envContents = fs.readFileSync('.env', 'utf8');
    const matches = envContents.match(/CLARIFAI_API_KEY=([^\s]+)/);
    if (matches && matches[1]) {
        apiKey = matches[1].trim();
    } else {
        console.error('ERROR: Could not find CLARIFAI_API_KEY in .env file');
        process.exit(1);
    }
} catch (error) {
    console.error('ERROR: Could not read .env file:', error);
    process.exit(1);
}

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${apiKey}`);

async function checkModelStatus() {
    try {
        const modelId = 'catsdogstest';

        console.log('Checking model status...');
        const response = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error getting model:', err);
                        if (err.details) {
                            console.error('Error details:', err.details);
                        }
                        reject(err);
                    } else {
                        console.log('Model status:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        // Also list all models to verify our access
        console.log('\nListing all models...');
        const listResponse = await new Promise((resolve, reject) => {
            stub.ListModels(
                {
                    page: 1,
                    per_page: 5
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error listing models:', err);
                        if (err.details) {
                            console.error('Error details:', err.details);
                        }
                        reject(err);
                    } else {
                        console.log('Models list:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        console.log('\nAPI access verification completed');
    } catch (error) {
        console.error('Status check failed:', error);
        if (error.details) {
            console.error('Error details:', error.details);
        }
        process.exit(1);
    }
}

checkModelStatus();
