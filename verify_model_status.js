const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function verifyModelStatus() {
    try {
        const modelId = 'catsdogstest';

        console.log('Checking model status...');

        // First, verify the model exists
        const modelResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error getting model:', err);
                        reject(err);
                    } else {
                        console.log('Model response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (!modelResponse.model) {
            console.log('Model not found. Creating new model...');

            // Create a new model with proper structure
            const createResponse = await new Promise((resolve, reject) => {
                stub.PostModels(
                    {
                        model: {
                            id: modelId,
                            name: 'Cats and Dogs Classifier',
                            output_info: {
                                data: {
                                    concepts: [
                                        { id: 'cats', name: 'cats' },
                                        { id: 'dogs', name: 'dogs' }
                                    ]
                                },
                                output_config: {
                                    concepts_mutually_exclusive: true,
                                    closed_environment: true
                                }
                            }
                        }
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error('Error creating model:', err);
                            reject(err);
                        } else {
                            console.log('Model creation response:', JSON.stringify(response, null, 2));
                            resolve(response);
                        }
                    }
                );
            });

            console.log('Model creation status:', createResponse.status);
        } else {
            console.log('Model exists. Current model structure:', modelResponse.model);
        }

        // List existing versions
        const versionsResponse = await new Promise((resolve, reject) => {
            stub.ListModelVersions(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error listing versions:', err);
                        reject(err);
                    } else {
                        console.log('Versions response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        console.log('Model versions:', versionsResponse.model_versions);

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifyModelStatus();
