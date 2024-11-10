const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.CLARIFAI_API_KEY.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function setupFreshModel() {
    try {
        const modelId = 'catsdogstest';

        // Step 1: Delete existing model
        await deleteExistingModel(modelId);

        // Step 2: Create new model with full configuration
        await createBasicModel(modelId);

        // Step 3: Create initial version with training configuration
        await createInitialVersion(modelId);

        console.log('Model setup completed successfully');
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

async function deleteExistingModel(modelId) {
    try {
        console.log('Step 1: Deleting existing model...');
        const response = await new Promise((resolve, reject) => {
            stub.DeleteModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        // If model doesn't exist, that's fine - continue
                        if (err.details === 'Model does not exist') {
                            console.log('Model does not exist, proceeding with creation');
                            resolve({ status: { code: 10000 } });
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log('Model deletion response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (response.status.code !== 10000) {
            throw new Error(`Model deletion failed with status ${response.status.code}`);
        }

        console.log('Waiting for deletion to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error('Error during model deletion:', error);
        throw error;
    }
}

async function createBasicModel(modelId) {
    try {
        console.log('Step 2: Creating new model...');
        const modelRequest = {
            model: {
                id: modelId,
                name: modelId,
                model_type_id: "visual-classifier",
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
        };

        // Add detailed logging
        console.log('Model request structure:', JSON.stringify(modelRequest, null, 2));

        const response = await new Promise((resolve, reject) => {
            stub.PostModels(
                modelRequest,
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error creating model:', err);
                        reject(err);
                    } else {
                        console.log('Model created successfully:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (response.status.code !== 10000) {
            throw new Error('Model creation failed: ' + response.status.description);
        }

        // Wait for model to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        return response.model;
    } catch (error) {
        console.error('Error during model creation:', error);
        throw error;
    }
}

async function createInitialVersion(modelId) {
    try {
        console.log('Step 3: Creating initial version...');

        // Define concepts
        const concepts = [
            { id: 'cats', name: 'cats' },
            { id: 'dogs', name: 'dogs' }
        ];

        // Construct version request exactly matching the working structure from clarifai.js
        const versionRequest = {
            model_id: modelId,
            version: {
                id: `v${Date.now()}`,
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept.id,
                            name: concept.name,
                            value: 1
                        }))
                    },
                    output_config: {
                        concepts_mutually_exclusive: true,
                        closed_environment: true
                    }
                },
                train_info: {
                    params: {
                        template: 'MMClassification_ResNet_50_RSB_A1',
                        epochs: 5,
                        batch_size: 32,
                        learning_rate: 0.001
                    },
                    dataset: {
                        concepts: concepts
                    }
                }
            }
        };

        // Add detailed logging
        console.log('Version request structure:', JSON.stringify(versionRequest, null, 2));
        console.log('train_info structure:', JSON.stringify(versionRequest.version.train_info, null, 2));
        console.log('template value:', versionRequest.version.train_info.params.template);

        // Add validation check
        if (!versionRequest.version.train_info.params.template) {
            throw new Error('Template parameter is missing from the request');
        }

        // Implement retry mechanism for version creation
        let trainingAttempts = 0;
        const MAX_TRAINING_ATTEMPTS = 3;
        const TRAINING_RETRY_DELAY = 5000;
        let response;

        while (trainingAttempts < MAX_TRAINING_ATTEMPTS) {
            try {
                console.log(`Training attempt ${trainingAttempts + 1}/${MAX_TRAINING_ATTEMPTS}`);
                response = await new Promise((resolve, reject) => {
                    stub.PostModelVersions(
                        versionRequest,
                        metadata,
                        (err, response) => {
                            if (err) {
                                console.error('Error creating version:', {
                                    error: err.message,
                                    code: err.code,
                                    details: err.details,
                                    modelId: modelId,
                                    attempt: trainingAttempts + 1
                                });
                                reject(err);
                            } else {
                                console.log('Version creation response:', {
                                    status: response.status,
                                    modelId: modelId,
                                    attempt: trainingAttempts + 1
                                });
                                resolve(response);
                            }
                        }
                    );
                });

                if (response.status.code === 10000) {
                    console.log('Version created successfully');
                    break;
                }
            } catch (error) {
                console.error(`Version creation attempt ${trainingAttempts + 1} failed:`, error);
                if (trainingAttempts < MAX_TRAINING_ATTEMPTS - 1) {
                    console.log(`Retrying in ${TRAINING_RETRY_DELAY/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, TRAINING_RETRY_DELAY));
                }
            }
            trainingAttempts++;
        }

        if (!response || response.status.code !== 10000) {
            throw new Error('Failed to create version after multiple attempts');
        }

        return response;
    } catch (error) {
        console.error('Error in createInitialVersion:', error);
        throw error;
    }
}

setupFreshModel();
