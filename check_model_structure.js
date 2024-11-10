const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
require('dotenv').config();

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = (process.env.CLARIFAI_API_KEY || '').trim();
metadata.set('authorization', `Key ${apiKey}`);

const MODEL_ID = 'test-model-1730775145297'; // Updated to match the model we just created

async function checkModelStructure() {
    try {
        // Get model details
        const modelRequest = {
            model_id: MODEL_ID
        };

        console.log('Fetching model structure...');

        const modelResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                modelRequest,
                metadata,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        console.log('Model structure:', JSON.stringify(modelResponse, null, 2));

        // Get model versions
        const versionsRequest = {
            model_id: MODEL_ID
        };

        console.log('\nFetching model versions...');

        const versionsResponse = await new Promise((resolve, reject) => {
            stub.ListModelVersions(
                versionsRequest,
                metadata,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        console.log('Model versions:', JSON.stringify(versionsResponse, null, 2));
    } catch (error) {
        console.error('Error checking model structure:', error);
    }
}

checkModelStructure();
