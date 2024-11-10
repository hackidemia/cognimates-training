const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const fs = require('fs');
const path = require('path');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.CLARIFAI_API_KEY;
metadata.set('authorization', `Key ${apiKey}`);

async function testMinimalVersionCreation() {
    const modelId = 'test-model-' + Date.now();
    const categoryCounts = {
        'Cat': 2,  // We're using 2 cat images
        'Dog': 2   // We're using 2 dog images
    };
    const concepts = Object.keys(categoryCounts).map(category => ({
        id: category.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: category
    }));

    try {
        // Step 1: Create a model
        console.log('Creating model...');
        const modelRequest = {
            model: {
                id: modelId,
                name: 'Test Model',
                model_type_id: 'visual-classifier',
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
                }
            }
        };

        console.log('Model request:', JSON.stringify(modelRequest, null, 2));
        const createModelResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                modelRequest,
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });

        console.log('Model created:', JSON.stringify(createModelResponse, null, 2));

        // Wait for model to be ready
        console.log('Waiting for model to be ready...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Add training inputs
        console.log('Adding training inputs...');
        const testImagesDir = path.join(__dirname, 'static', 'test_images');
        const inputs = [];

        // Read cat images
        const catImagesDir = path.join(testImagesDir, 'cats');
        const catFiles = fs.readdirSync(catImagesDir).slice(0, 2); // Use first 2 images for testing
        for (const file of catFiles) {
            const imageBuffer = fs.readFileSync(path.join(catImagesDir, file));
            inputs.push({
                data: {
                    image: {
                        base64: imageBuffer.toString('base64'),
                        allow_duplicate_url: true
                    }
                },
                concepts: [{
                    id: 'cat',
                    name: 'Cat',
                    value: 1
                }]
            });
        }

        // Read dog images
        const dogImagesDir = path.join(testImagesDir, 'dogs');
        const dogFiles = fs.readdirSync(dogImagesDir).slice(0, 2); // Use first 2 images for testing
        for (const file of dogFiles) {
            const imageBuffer = fs.readFileSync(path.join(dogImagesDir, file));
            inputs.push({
                data: {
                    image: {
                        base64: imageBuffer.toString('base64'),
                        allow_duplicate_url: true
                    }
                },
                concepts: [{
                    id: 'dog',
                    name: 'Dog',
                    value: 1
                }]
            });
        }

        console.log(`Adding ${inputs.length} inputs to model...`);
        const addInputsResponse = await new Promise((resolve, reject) => {
            stub.PostInputs(
                { inputs: inputs },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });

        console.log('Inputs added:', JSON.stringify(addInputsResponse, null, 2));

        // Wait for inputs to be processed with status checks
        console.log('Waiting for inputs to be processed...');
        let processingAttempts = 0;
        const MAX_PROCESSING_ATTEMPTS = 6;
        const PROCESSING_DELAY = 5000;

        while (processingAttempts < MAX_PROCESSING_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
            console.log(`Checking input processing status (attempt ${processingAttempts + 1}/${MAX_PROCESSING_ATTEMPTS})...`);

            try {
                const inputsStatus = await new Promise((resolve, reject) => {
                    stub.ListInputs(
                        { page: 1, per_page: 1 },
                        metadata,
                        (err, response) => {
                            if (err) reject(err);
                            else resolve(response);
                        }
                    );
                });

                if (inputsStatus.status.code === 10000) {
                    console.log('Inputs processed successfully');
                    break;
                }
            } catch (error) {
                console.warn(`Input status check failed (attempt ${processingAttempts + 1}):`, error);
            }

            processingAttempts++;
            if (processingAttempts === MAX_PROCESSING_ATTEMPTS) {
                console.warn('Max processing attempts reached, proceeding with training...');
            }
        }

        // Step 3: Create model version with retries
        console.log('Starting model version creation...');
        let trainingAttempts = 0;
        const MAX_TRAINING_ATTEMPTS = 3;
        const TRAINING_RETRY_DELAY = 5000;
        let trainResponse;

        while (trainingAttempts < MAX_TRAINING_ATTEMPTS) {
            try {
                const simpleVersionId = `v${Date.now()}`;
                console.log('Creating model version:', simpleVersionId);

                const versionRequest = {
                    model_id: modelId,
                    version: {
                        id: simpleVersionId,
                        output_info: {
                            data: {
                                concepts: Object.keys(categoryCounts).map(category => ({
                                    id: category.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                    name: category,
                                    value: 1
                                }))
                            },
                            output_config: {
                                concepts_mutually_exclusive: true,
                                closed_environment: true,
                                hyper_parameters: ""
                            }
                        },
                        train_info: {
                            params: {
                                template: "MMClassification_ResNet_50_RSB_A1",
                                epochs: 5,
                                batch_size: 32,
                                learning_rate: 0.001
                            },
                            dataset: {
                                concepts: Object.keys(categoryCounts).map(category => ({
                                    id: category.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                    name: category
                                }))
                            }
                        }
                    }
                };

                // Verify input processing status in detail
                const inputStatusResponse = await new Promise((resolve, reject) => {
                    stub.ListInputs(
                        { page: 1, per_page: 10 },
                        metadata,
                        (err, response) => {
                            if (err) reject(err);
                            else resolve(response);
                        }
                    );
                });

                console.log('Input processing status:', JSON.stringify(inputStatusResponse.inputs.map(input => ({
                    id: input.id,
                    status: input.status
                })), null, 2));

                console.log('Version creation request payload:', JSON.stringify(versionRequest, null, 2));

                trainResponse = await new Promise((resolve, reject) => {
                    stub.PostModelVersions(
                        versionRequest,
                        metadata,
                        (err, response) => {
                            if (err) {
                                console.error('Error creating version:', {
                                    error: err.message,
                                    code: err.code,
                                    details: err.details,
                                    attempt: trainingAttempts + 1
                                });
                                reject(err);
                            } else {
                                console.log('Version creation response:', {
                                    status: response.status,
                                    attempt: trainingAttempts + 1
                                });
                                resolve(response);
                            }
                        }
                    );
                });

                if (trainResponse.status.code === 10000) {
                    console.log('Model version created successfully');
                    break;
                } else {
                    throw new Error(`Version creation failed: ${trainResponse.status.description}`);
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

        if (!trainResponse || trainResponse.status.code !== 10000) {
            throw new Error('Failed to create model version after multiple attempts');
        }

        console.log('Test completed successfully');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

testMinimalVersionCreation();
