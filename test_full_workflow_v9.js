const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${process.env.CLARIFAI_PAT}`);

// Training configuration
const trainingConfig = {
    template: 'MMClassification_EfficientNet',
    hyperparameters: {
        use_embeddings: true,
        epochs: 5,
        batch_size: 32,
        learning_rate: 0.001
    },
    concepts: [
        { id: 'cat', name: 'cat' },
        { id: 'dog', name: 'dog' }
    ]
};

// Save training config as YAML
fs.writeFileSync('model_config.yaml', yaml.dump(trainingConfig));

// Main workflow functions
async function createApp() {
    return new Promise((resolve, reject) => {
        stub.PostApps(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID
                },
                apps: [{
                    id: "image-classification",
                    default_workflow_id: "Universal",
                    description: "Application for image classification training"
                }]
            },
            metadata,
            (err, response) => {
                if (err) {
                    if (err.details && err.details.includes('already exists')) {
                        console.log('App already exists, continuing...');
                        resolve({ status: { code: 10000 } });
                    } else {
                        console.error('Error creating app:', err);
                        reject(err);
                    }
                } else {
                    console.log('App created successfully');
                    resolve(response);
                }
            }
        );
    });
}

async function createModel() {
    return new Promise((resolve, reject) => {
        stub.PostModels(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID,
                    app_id: 'image-classification'
                },
                models: [{
                    id: "cats-dogs-classifier",
                    model_type_id: "visual-classifier",
                    output_info: {
                        data: {
                            concepts: trainingConfig.concepts
                        },
                        output_config: {
                            concepts_mutually_exclusive: true,
                            closed_environment: true
                        }
                    },
                    train_info: {
                        params: {
                            template: trainingConfig.template,
                            ...trainingConfig.hyperparameters
                        }
                    }
                }]
            },
            metadata,
            (err, response) => {
                if (err) {
                    if (err.details && err.details.includes('already exists')) {
                        console.log('Model already exists, continuing...');
                        resolve({ status: { code: 10000 } });
                    } else {
                        console.error('Error creating model:', err);
                        reject(err);
                    }
                } else {
                    console.log('Model created successfully');
                    resolve(response);
                }
            }
        );
    });
}

async function addInputs() {
    const catImages = fs.readdirSync(path.join(__dirname, 'static/test_images/cats'))
        .filter(file => file.endsWith('.jpg'))
        .map(file => path.join(__dirname, 'static/test_images/cats', file));
    const dogImages = fs.readdirSync(path.join(__dirname, 'static/test_images/dogs'))
        .filter(file => file.endsWith('.jpg'))
        .map(file => path.join(__dirname, 'static/test_images/dogs', file));

    const inputs = [];

    // Process cat images
    for (const imagePath of catImages) {
        inputs.push({
            data: {
                image: {
                    base64: fs.readFileSync(imagePath).toString('base64')
                },
                concepts: [{ id: "cat", value: 1 }]
            }
        });
    }

    // Process dog images
    for (const imagePath of dogImages) {
        inputs.push({
            data: {
                image: {
                    base64: fs.readFileSync(imagePath).toString('base64')
                },
                concepts: [{ id: "dog", value: 1 }]
            }
        });
    }

    return new Promise((resolve, reject) => {
        stub.PostInputs(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID,
                    app_id: 'image-classification'
                },
                inputs: inputs
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error adding inputs:', err);
                    reject(err);
                } else {
                    console.log('Inputs added successfully');
                    resolve(response);
                }
            }
        );
    });
}

async function createModelVersion() {
    const configData = yaml.load(fs.readFileSync('model_config.yaml', 'utf8'));

    return new Promise((resolve, reject) => {
        stub.PostModelVersions(
            {
                user_app_id: {
                    user_id: process.env.CLARIFAI_USER_ID,
                    app_id: 'image-classification'
                },
                model_id: "cats-dogs-classifier",
                model_versions: [{
                    train_info: {
                        params: {
                            template: configData.template,
                            ...configData.hyperparameters
                        },
                        dataset: {
                            concepts: configData.concepts
                        }
                    },
                    output_info: {
                        data: {
                            concepts: configData.concepts
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
                    console.error('Error creating model version:', err);
                    reject(err);
                } else {
                    console.log('Model version created successfully');
                    resolve(response);
                }
            }
        );
    });
}

async function main() {
    try {
        console.log('Starting workflow with updated configuration...');

        // Create app first
        console.log('Creating app...');
        try {
            await createApp();
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                console.log('App already exists, continuing...');
            } else {
                throw error;
            }
        }

        // Create model
        console.log('Creating model...');
        await createModel();

        // Add inputs
        console.log('Adding inputs...');
        await addInputs();

        // Wait for inputs to process (5 seconds)
        console.log('Waiting for inputs to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Create model version
        console.log('Creating model version...');
        await createModelVersion();

        console.log('Workflow completed successfully!');
    } catch (error) {
        console.error('Error in main workflow:', error);
        process.exit(1);
    }
}

main();
