const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function setupFreshModel() {
    try {
        const modelId = 'catsdogstest';

        // Step 1: Delete existing model
        console.log('Step 1: Deleting existing model...');
        await new Promise((resolve, reject) => {
            stub.DeleteModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.log('No existing model to delete or deletion failed:', err);
                        resolve(); // Continue even if deletion fails
                    } else {
                        console.log('Model deletion response:', JSON.stringify(response, null, 2));
                        resolve();
                    }
                }
            );
        });

        // Wait for deletion to process
        console.log('Waiting for deletion to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Create new model with complete configuration
        console.log('Step 2: Creating new model...');
        const createResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    models: [{
                        id: modelId,
                        name: 'Cats and Dogs Classifier',
                        model_type_id: 'visual-classifier',
                        notes: 'Binary classifier for cats and dogs',
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
                        },
                        train_info: {
                            params: {
                                template: 'classification_base',
                                use_embeddings: true
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

        // Wait for creation to process
        console.log('Waiting for creation to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Verify model configuration
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
                                    use_embeddings: true
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
            throw new Error('Model creation failed - output_info is not configured');
        }
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setupFreshModel();
