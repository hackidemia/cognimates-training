const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Validate environment variables
const PAT = process.env.CLARIFAI_PAT;
const USER_ID = process.env.clarifai_user_id;
const APP_ID = 'image-classification';

// Validate required environment variables
if (!PAT) {
    throw new Error('CLARIFAI_PAT environment variable is not set');
}

if (!USER_ID) {
    throw new Error('clarifai_user_id environment variable is not set');
}

if (!USER_ID || USER_ID === 'clarifai') {
    throw new Error('clarifai_user_id is not set correctly. Please set the correct user ID.');
}

console.log('Starting vision training workflow test...');
console.log('Using USER_ID:', USER_ID);
console.log('Using APP_ID:', APP_ID);

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();

// Initialize metadata for authentication
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${PAT}`);

// Test image directories
const CATS_DIR = path.join(__dirname, 'static', 'test_images', 'cats');
const DOGS_DIR = path.join(__dirname, 'static', 'test_images', 'dogs');

// Helper function to read image as base64
function readImageAsBase64(filepath) {
    return fs.readFileSync(filepath).toString('base64');
}

// Helper function to wait for inputs to be processed
async function waitForInputsProcessing(inputIds) {
    console.log('Waiting for inputs to be processed...');
    const maxAttempts = 10;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await new Promise((resolve, reject) => {
                stub.ListInputs(
                    {
                        user_app_id: {
                            user_id: USER_ID,
                            app_id: APP_ID
                        },
                        page: 1,
                        per_page: 100
                    },
                    metadata,
                    (err, response) => {
                        if (err) reject(err);
                        else resolve(response);
                    }
                );
            });

            const relevantInputs = response.inputs.filter(input => inputIds.includes(input.id));
            const allProcessed = relevantInputs.every(input =>
                input.status.code === 30000 || input.status.code === 40000
            );

            if (allProcessed) {
                console.log('All inputs processed successfully');
                return true;
            }

            console.log(`Attempt ${attempt + 1}: Inputs still processing...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (error) {
            console.error('Error checking input status:', error);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw new Error('Timeout waiting for inputs to be processed');
}

async function createModel(modelId, concepts) {
    console.log(`Creating model with USER_ID: ${USER_ID}, APP_ID: ${APP_ID}...`);
    try {
        return new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    models: [
                        {
                            id: modelId,
                            model_type_id: "visual-classifier",
                            output_info: {
                                data: {
                                    concepts: concepts.map(concept => ({
                                        id: concept.toLowerCase(),
                                        name: concept
                                    }))
                                },
                                output_config: {
                                    concepts_mutually_exclusive: true,
                                    closed_environment: true
                                }
                            }
                        }
                    ]
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error creating model:', err);
                        reject(err);
                    } else {
                        console.log('Model created successfully:', response);
                        resolve(response);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error creating model:', error);
        throw error;
    }
}

async function addInputs() {
    console.log(`Adding training inputs for USER_ID: ${USER_ID}, APP_ID: ${APP_ID}...`);
    const inputIds = [];

    // Process cat images
    const catFiles = fs.readdirSync(CATS_DIR);
    for (const file of catFiles) {
        const filepath = path.join(CATS_DIR, file);
        const bytes = fs.readFileSync(filepath);
        const inputId = uuidv4();

        await new Promise((resolve, reject) => {
            stub.PostInputs(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    inputs: [
                        {
                            id: inputId,
                            data: {
                                image: {
                                    base64: bytes
                                },
                                concepts: [{ id: 'cat', value: 1 }]
                            }
                        }
                    ]
                },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });
        inputIds.push(inputId);
    }

    // Process dog images
    const dogFiles = fs.readdirSync(DOGS_DIR);
    for (const file of dogFiles) {
        const filepath = path.join(DOGS_DIR, file);
        const bytes = fs.readFileSync(filepath);
        const inputId = uuidv4();

        await new Promise((resolve, reject) => {
            stub.PostInputs(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    inputs: [
                        {
                            id: inputId,
                            data: {
                                image: {
                                    base64: bytes
                                },
                                concepts: [{ id: 'dog', value: 1 }]
                            }
                        }
                    ]
                },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });
        inputIds.push(inputId);
    }

    console.log('Inputs added successfully');
    return { inputIds };
}

async function createModelVersion(modelId) {
    console.log(`Creating model version for USER_ID: ${USER_ID}, APP_ID: ${APP_ID}...`);
    try {
        const simpleVersionId = `v${Date.now()}`;
        return new Promise((resolve, reject) => {
            stub.PostModelVersions(
                {
                    user_app_id: {
                        user_id: USER_ID,
                        app_id: APP_ID
                    },
                    model_id: modelId,
                    version: {
                        id: simpleVersionId,
                        output_info: {
                            data: {
                                concepts: [
                                    { id: 'cat', name: 'cat', value: 1 },
                                    { id: 'dog', name: 'dog', value: 1 }
                                ]
                            },
                            output_config: {
                                concepts_mutually_exclusive: true,
                                closed_environment: true
                            }
                        },
                        train_info: {
                            params: {
                                template: 'classification_base_workflow',
                                use_embeddings: true,
                                epochs: 5,
                                batch_size: 32,
                                learning_rate: 0.001
                            },
                            dataset: {
                                concepts: [
                                    { id: 'cat', name: 'cat' },
                                    { id: 'dog', name: 'dog' }
                                ]
                            }
                        }
                    }
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error creating model version:', err);
                        reject(err);
                    } else {
                        console.log('Model version created successfully:', response);
                        resolve(response);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error creating model version:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Starting vision training workflow test...');
        console.log('Using USER_ID:', USER_ID);
        console.log('Using APP_ID:', APP_ID);

        // Create a new model
        const modelId = `test-model-${Date.now()}`;
        const concepts = ['cat', 'dog'];
        console.log('Creating model with ID:', modelId);
        await createModel(modelId, concepts);

        // Add training inputs
        console.log('Adding training inputs...');
        const { inputIds } = await addInputs();

        // Wait for inputs to be processed
        console.log('Waiting for input processing...');
        await waitForInputsProcessing(inputIds);

        // Create model version
        console.log('Creating model version...');
        await createModelVersion(modelId);

        console.log('Vision training workflow completed successfully!');
    } catch (error) {
        console.error('Error in vision training workflow:', error);
        process.exit(1);
    }
}

main();
