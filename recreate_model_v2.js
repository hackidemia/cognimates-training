const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function recreateModel() {
    try {
        const modelId = 'catsdogstest';

        console.log('Deleting existing model if it exists...');

        // First try to delete the existing model
        try {
            await new Promise((resolve, reject) => {
                stub.DeleteModel(
                    { model_id: modelId },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error('Error deleting model:', err);
                            reject(err);
                        } else {
                            console.log('Model deletion response:', JSON.stringify(response, null, 2));
                            resolve(response);
                        }
                    }
                );
            });
            console.log('Existing model deleted successfully');
        } catch (error) {
            console.log('Model deletion failed or model did not exist:', error.message);
        }

        // Wait a bit to ensure deletion is processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Creating new model with proper configuration...');

        // Create new model with proper configuration
        const createResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    models: [{
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
                    }]
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

        // Verify the new model
        const verifyResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error verifying model:', err);
                        reject(err);
                    } else {
                        console.log('New model structure:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (verifyResponse.model.output_info) {
            console.log('Model creation successful - output_info is properly configured');

            // Try creating a model version
            console.log('Attempting to create model version...');
            const versionResponse = await new Promise((resolve, reject) => {
                const versionId = `v${Date.now()}`;
                stub.PostModelVersions(
                    {
                        model_id: modelId,
                        version: {
                            id: versionId,
                            train_info: {
                                params: {
                                    template: 'classification_base',
                                    epochs: 5,
                                    batch_size: 32,
                                    learning_rate: 0.001
                                }
                            }
                        }
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error('Error creating version:', err);
                            reject(err);
                        } else {
                            console.log('Version creation response:', JSON.stringify(response, null, 2));
                            resolve(response);
                        }
                    }
                );
            });
        } else {
            console.log('Model creation failed - output_info is not configured');
        }

        console.log('Model recreation process complete');
    } catch (error) {
        console.error('Recreation failed:', error);
    }
}

recreateModel();
