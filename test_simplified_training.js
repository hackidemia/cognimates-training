const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function testSimplifiedTraining() {
    try {
        const modelId = 'catsdogstest';
        const versionId = `v${Date.now()}`;

        console.log('Creating model version with simplified structure...');

        // Create a new model version with minimal required fields
        const response = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                {
                    model_id: modelId,
                    version: {
                        id: versionId,
                        train_info: {
                            params: {
                                template: 'classification_base'
                            }
                        }
                    }
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error:', err);
                        reject(err);
                    } else {
                        console.log('Response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        console.log('Model version creation response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testSimplifiedTraining();
