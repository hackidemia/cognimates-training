const fs = require('fs');
const path = require('path');
const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const dotenv = require('dotenv');
dotenv.config();

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const pat = (process.env.CLARIFAI_PAT || '').trim();
metadata.set('authorization', `Key ${pat}`);

// Test concepts
const concepts = ['cat', 'dog'];
let modelId;

// Function to read image files and convert to base64
function readImageAsBase64(filepath) {
    return fs.readFileSync(filepath).toString('base64');
}

// Function to create a new app if needed
async function createAppIfNeeded() {
    console.log('Checking for existing app or creating new one...');
    return new Promise((resolve, reject) => {
        const appId = 'cognimates-training';
        stub.PostApps(
            {
                apps: [{
                    id: appId,
                    name: 'Cognimates Training',
                    default_language: 'en',
                    description: 'Application for training vision models'
                }]
            },
            metadata,
            (err, response) => {
                if (err) {
                    if (err.details && err.details.includes('already exists')) {
                        console.log('App already exists, proceeding...');
                        resolve(appId);
                    } else {
                        console.error('Error creating app:', err);
                        reject(err);
                    }
                } else {
                    console.log('App created successfully');
                    resolve(appId);
                }
            }
        );
    });
}

async function createModel(appId) {
    console.log('Creating model...');
    return new Promise((resolve, reject) => {
        const modelRequest = {
            user_app_id: {
                user_id: process.env.CLARIFAI_USER_ID,
                app_id: appId
            },
            model: {
                id: `test-model-${Date.now()}`,
                name: `Test Model ${Date.now()}`,
                model_type_id: "visual-classifier",
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                            name: concept,
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

        console.log('Model request structure:', JSON.stringify(modelRequest, null, 2));

        stub.PostModels(
            modelRequest,
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error creating model:', err);
                    reject(err);
                } else {
                    console.log('Model created successfully:', response);
                    modelId = modelRequest.model.id;
                    resolve(response);
                }
            }
        );
    });
}

async function addInputs(appId) {
    console.log('Adding inputs...');
    const inputs = [];

    // Process cat images
    for (let i = 1; i <= 10; i++) {
        const imagePath = path.join(__dirname, `static/test_images/cats/cat${i}.jpg`);
        try {
            const base64Data = readImageAsBase64(imagePath);
            inputs.push({
                data: {
                    image: {
                        base64: base64Data,
                        allow_duplicate_url: true
                    }
                },
                concepts: [{
                    id: 'cat',
                    name: 'cat',
                    value: 1
                }]
            });
            console.log(`Successfully added input for cat${i}.jpg`);
        } catch (error) {
            console.error(`Error processing cat${i}.jpg:`, error);
            throw error;
        }
    }

    // Process dog images
    for (let i = 1; i <= 10; i++) {
        const imagePath = path.join(__dirname, `static/test_images/dogs/dog${i}.jpg`);
        try {
            const base64Data = readImageAsBase64(imagePath);
            inputs.push({
                data: {
                    image: {
                        base64: base64Data,
                        allow_duplicate_url: true
                    }
                },
                concepts: [{
                    id: 'dog',
                    name: 'dog',
                    value: 1
                }]
            });
            console.log(`Successfully added input for dog${i}.jpg`);
        } catch (error) {
            console.error(`Error processing dog${i}.jpg:`, error);
            throw error;
        }
    }

    return new Promise((resolve, reject) => {
        stub.PostInputs(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID,
                    app_id: appId
                },
                inputs: inputs
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error adding inputs:', err);
                    reject(err);
                } else {
                    console.log('All inputs added successfully');
                    resolve(response);
                }
            }
        );
    });
}

async function waitForInputProcessing(appId) {
    console.log('Waiting for inputs to be processed...');
    const MAX_ATTEMPTS = 6;
    const DELAY = 5000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await new Promise(resolve => setTimeout(resolve, DELAY));
        console.log(`Checking input processing status (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`);

        try {
            const response = await new Promise((resolve, reject) => {
                stub.ListInputs(
                    {
                        user_app_id: {
                            user_id: process.env.CLARIFAI_USER_ID,
                            app_id: appId
                        },
                        page: 1,
                        per_page: 1
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (response.status.code === 10000) {
                console.log('Inputs processed successfully');
                return true;
            }
        } catch (error) {
            console.warn(`Input status check failed (attempt ${attempt + 1}):`, error);
        }
    }

    console.warn('Max processing attempts reached, proceeding with training...');
    return false;
}

async function createModelVersion(appId) {
    console.log('Creating model version...');
    const simpleVersionId = `v${Date.now()}`;
    console.log('Creating model version:', simpleVersionId);

    return new Promise((resolve, reject) => {
        stub.PostModelVersions(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID,
                    app_id: appId
                },
                model_id: modelId,
                version: {
                    id: simpleVersionId,
                    output_info: {
                        data: {
                            concepts: concepts.map(concept => ({
                                id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                name: concept,
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
                            template: "classification_base_workflow",
                            use_embeddings: true
                        },
                        dataset: concepts.map(concept => ({
                            id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                            name: concept
                        }))
                    }
                }
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error creating model version:', {
                        error: err.message,
                        code: err.code,
                        details: err.details,
                        modelId: modelId,
                        versionId: simpleVersionId
                    });
                    reject(err);
                } else {
                    console.log('Training initiated:', {
                        status: response.status,
                        modelId: modelId,
                        versionId: simpleVersionId
                    });
                    resolve(response);
                }
            }
        );
    });
}

async function main() {
    try {
        const appId = await createAppIfNeeded();
        await createModel(appId);
        await addInputs(appId);
        await waitForInputProcessing(appId);
        await createModelVersion(appId);
        console.log('Full workflow completed successfully');
    } catch (error) {
        console.error('Error in workflow:', error);
        process.exit(1);
    }
}

main();
