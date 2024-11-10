const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function setupFreshModel() {
    try {
        const modelId = 'catsdogstest';

        console.log('Step 1: Deleting existing model if it exists...');
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

        // Wait to ensure deletion is processed
        console.log('Waiting for deletion to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Step 2: Creating new model with proper configuration...');
        const modelResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    models: [{
                        id: modelId,
                        name: 'Cats and Dogs Classifier',
                        model_type_id: 'visual-classifier',
                        output_info: {
                            message: 'Classification model for cats and dogs',
                            type: 'concept',
                            type_ext: 'concept',
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

        // Wait for model creation to process
        console.log('Waiting for model creation to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Step 3: Verifying model configuration...');
        const verifyResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error verifying model:', err);
                        reject(err);
                    } else {
                        console.log('Model structure:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (verifyResponse.model.output_info) {
            console.log('Success: Model created with proper configuration');

            console.log('Step 4: Creating initial model version...');
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

            console.log('Model setup completed successfully');
        } else {
            console.log('Error: Model creation failed - output_info is not configured');
        }
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupFreshModel();
