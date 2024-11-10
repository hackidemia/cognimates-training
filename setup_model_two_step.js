const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function setupModelTwoStep() {
    try {
        const modelId = 'catsdogstest';

        // Step 1: Create basic model
        console.log('Step 1: Creating basic model...');
        const createResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    models: [{
                        id: modelId,
                        name: 'Cats and Dogs Classifier',
                        model_type_id: 'visual-classifier'
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
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Update model with output_info
        console.log('Step 2: Updating model with output_info...');
        const patchResponse = await new Promise((resolve, reject) => {
            stub.PatchModels(
                {
                    action: 'merge',
                    models: [{
                        id: modelId,
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
                        console.error('Error updating model:', err);
                        reject(err);
                    } else {
                        console.log('Model update response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        // Wait for update to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Verify final configuration
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
                        console.log('Final model structure:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (verifyResponse.model.output_info) {
            console.log('Success: Model configured properly');

            // Step 4: Create initial version
            console.log('Step 4: Creating initial version...');
            const versionResponse = await new Promise((resolve, reject) => {
                stub.PostModelVersions(
                    {
                        model_id: modelId,
                        version: {
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
            console.log('Error: Model configuration failed');
        }
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupModelTwoStep();
