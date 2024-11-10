const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

const modelId = 'catsdogstest';
const versionId = `v${Date.now()}`;

// Test version creation with simplified structure
const createVersion = async () => {
    try {
        console.log('Creating version with ID:', versionId);

        const response = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                {
                    model_id: modelId,
                    version: {
                        id: versionId,
                        train_info: {
                            params: {
                                template: 'classification_base',
                                epochs: 5
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

        console.log('Version creation response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Error creating version:', error);
    }
};

// Run the test
createVersion();
