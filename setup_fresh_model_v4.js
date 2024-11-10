const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.CLARIFAI_API_KEY.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function setupFreshModel() {
    try {
        const modelId = 'catsdogstest';

        // Step 1: Delete existing model if it exists
        console.log('Step 1: Deleting existing model...');
        try {
            await new Promise((resolve, reject) => {
                stub.DeleteModel(
                    { model_id: modelId },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.log('No existing model to delete:', err);
                            resolve();
                        } else {
                            console.log('Model deletion response:', JSON.stringify(response, null, 2));
                            resolve();
                        }
                    }
                );
            });
        } catch (error) {
            console.log('Deletion error (continuing):', error);
        }

        // Wait for deletion to process
        console.log('Waiting for deletion to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Create new model with recommended template
        console.log('Step 2: Creating new model...');
        const createResponse = await new Promise((resolve, reject) => {
            const modelRequest = {
                models: [{
                    id: modelId,
                    name: 'Cats and Dogs Classifier',
                    model_type_id: 'visual-classifier',
                    notes: 'Binary classifier for cats and dogs using MMClassification_ResNet_50_RSB_A1 template',
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
                        },
                        params: {
                            template: 'MMClassification_ResNet_50_RSB_A1',
                            pretrained_weights: 'ImageNet-1k',
                            image_size: 224,
                            batch_size: 32,
                            num_epochs: 10,
                            flip_probability: 0.5,
                            flip_direction: 'horizontal'
                        }
                    },
                    train_info: {
                        params: {
                            template: 'MMClassification_ResNet_50_RSB_A1',
                            pretrained_weights: 'ImageNet-1k',
                            image_size: 224,
                            batch_size: 32,
                            num_epochs: 10,
                            flip_probability: 0.5,
                            flip_direction: 'horizontal',
                            concepts_mutually_exclusive: true
                        }
                    }
                }]
            };

            console.log('Model request:', JSON.stringify(modelRequest, null, 2));

            stub.PostModels(
                modelRequest,
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
                                },
                                params: {
                                    template: 'MMClassification_ResNet_50_RSB_A1',
                                    pretrained_weights: 'ImageNet-1k',
                                    image_size: 224,
                                    batch_size: 32,
                                    num_epochs: 10,
                                    flip_probability: 0.5,
                                    flip_direction: 'horizontal'
                                }
                            },
                            train_info: {
                                params: {
                                    template: 'MMClassification_ResNet_50_RSB_A1',
                                    pretrained_weights: 'ImageNet-1k',
                                    image_size: 224,
                                    batch_size: 32,
                                    num_epochs: 10,
                                    flip_probability: 0.5,
                                    flip_direction: 'horizontal',
                                    concepts_mutually_exclusive: true
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
            throw new Error('Model creation failed - output_info is not configured');
        }
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setupFreshModel();
