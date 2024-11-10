const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Use environment variables for authentication
const PAT = process.env.CLARIFAI_PAT;
const USER_ID = process.env.clarifai_user_id;
const APP_ID = 'cognimates-training';  // Using a specific app ID for our project

// Initialize the gRPC client with proper authentication
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${PAT}`);

// Generate a unique session token
const sessionToken = uuidv4();
metadata.set('x-clarifai-session-token', sessionToken);

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
                stub.GetInputs(
                    {
                        user_app_id: { user_id: USER_ID, app_id: APP_ID },
                        ids: inputIds
                    },
                    metadata,
                    (err, response) => {
                        if (err) reject(err);
                        else resolve(response);
                    }
                );
            });

            const allProcessed = response.inputs.every(input =>
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
    console.log('Creating model...');
    try {
        const response = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    user_app_id: { user_id: USER_ID, app_id: APP_ID },
                    models: [{
                        id: modelId,
                        name: `Test Model ${Date.now()}`,
                        output_info: {
                            data: {
                                concepts: concepts.map(concept => ({
                                    id: concept.toLowerCase(),
                                    name: concept,
                                    value: 1
                                }))
                            },
                            output_config: {
                                concepts_mutually_exclusive: true,
                                closed_environment: true
                            }
                        },
                        model_type_id: "visual-classifier"
                    }]
                },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });

        console.log('Model created successfully:', response);
        return response;
    } catch (error) {
        console.error('Error creating model:', error);
        throw error;
    }
}

async function addInputs(modelId) {
    console.log('Adding training inputs...');
    const inputs = [];
    const inputIds = [];

    // Process cat images
    const catFiles = fs.readdirSync(CATS_DIR);
    for (const file of catFiles) {
        const filepath = path.join(CATS_DIR, file);
        const base64 = readImageAsBase64(filepath);
        inputs.push({
            data: {
                image: { base64 },
                concepts: [{ id: 'cat', value: 1 }]
            }
        });
        inputIds.push(uuidv4());
    }

    // Process dog images
    const dogFiles = fs.readdirSync(DOGS_DIR);
    for (const file of dogFiles) {
        const filepath = path.join(DOGS_DIR, file);
        const base64 = readImageAsBase64(filepath);
        inputs.push({
            data: {
                image: { base64 },
                concepts: [{ id: 'dog', value: 1 }]
            }
        });
        inputIds.push(uuidv4());
    }

    try {
        const response = await new Promise((resolve, reject) => {
            stub.PostInputs(
                {
                    user_app_id: { user_id: USER_ID, app_id: APP_ID },
                    inputs: inputs.map((input, index) => ({
                        id: inputIds[index],
                        ...input
                    }))
                },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });

        console.log('Inputs added successfully');
        return { response, inputIds };
    } catch (error) {
        console.error('Error adding inputs:', error);
        throw error;
    }
}

async function createModelVersion(modelId) {
    console.log('Creating model version...');
    try {
        const response = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                {
                    user_app_id: { user_id: USER_ID, app_id: APP_ID },
                    model_id: modelId,
                    model_versions: [{
                        train_info: {
                            params: {
                                template: "classification_base_workflow",
                                model_type: "visual-classifier"
                            }
                        }
                    }]
                },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });

        console.log('Model version created successfully:', response);
        return response;
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
        await createModel(modelId, concepts);

        // Add training inputs
        const { inputIds } = await addInputs(modelId);

        // Wait for inputs to be processed
        await waitForInputsProcessing(inputIds);

        // Create model version
        await createModelVersion(modelId);

        console.log('Vision training workflow completed successfully!');
    } catch (error) {
        console.error('Error in vision training workflow:', error);
        process.exit(1);
    }
}

main().catch(console.error);
