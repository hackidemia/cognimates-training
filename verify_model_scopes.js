const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const PAT = process.env.CLARIFAI_PAT;
const USER_ID = 'christiankett';
const APP_ID = 'ck-face-detection-app';

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${PAT}`);

const requiredScopes = {
    operations: [
        'Models:Add',
        'Models:Train',
        'Inputs:Add',
        'Models:Get'
    ],
    endpoints: [
        '/clarifai.api.V2/PostModels',
        '/clarifai.api.V2/PostModelVersions',
        '/clarifai.api.V2/PostInputs',
        '/clarifai.api.V2/GetModel'
    ]
};

async function checkScopes() {
    try {
        // First, verify we can list apps (basic authentication test)
        console.log('Testing basic authentication...');
        const listAppsResponse = await new Promise((resolve, reject) => {
            stub.ListApps(
                { user_app_id: { user_id: USER_ID, app_id: APP_ID } },
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

        console.log('Basic authentication successful');
        console.log('\nTesting required operations and endpoints...');

        // Try to create a test model to verify PostModels permission
        const modelId = `test-model-${Date.now()}`;
        try {
            const modelResponse = await new Promise((resolve, reject) => {
                stub.PostModels(
                    {
                        user_app_id: { user_id: USER_ID, app_id: APP_ID },
                        models: [{
                            id: modelId,
                            name: "Test Model",
                            model_type_id: "visual-classifier"
                        }]
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
            console.log('✓ PostModels permission verified');
        } catch (err) {
            console.log('✗ PostModels permission missing:', err.details);
        }

        // Try to add a test input
        try {
            const inputResponse = await new Promise((resolve, reject) => {
                stub.PostInputs(
                    {
                        user_app_id: { user_id: USER_ID, app_id: APP_ID },
                        inputs: [{
                            data: {
                                image: {
                                    url: "https://samples.clarifai.com/dog2.jpeg"
                                }
                            }
                        }]
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
            console.log('✓ PostInputs permission verified');
        } catch (err) {
            console.log('✗ PostInputs permission missing:', err.details);
        }

        // Try to create a model version
        try {
            const versionResponse = await new Promise((resolve, reject) => {
                stub.PostModelVersions(
                    {
                        user_app_id: { user_id: USER_ID, app_id: APP_ID },
                        model_id: modelId,
                        model_versions: [{
                            train_info: {
                                params: {
                                    template: "classification_base_workflow"
                                }
                            }
                        }]
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
            console.log('✓ PostModelVersions permission verified');
        } catch (err) {
            console.log('✗ PostModelVersions permission missing:', err.details);
        }

        console.log('\nScope verification complete');

    } catch (error) {
        console.error('Error during scope verification:', error);
    }
}

checkScopes().catch(console.error);
