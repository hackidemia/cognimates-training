const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
require('dotenv').config();

// Check if API keys are available
if (!process.env.CLARIFAI_API_KEY) {
    console.error('Error: CLARIFAI_API_KEY environment variable is not set');
    process.exit(1);
}

// Use the clarifai_api directly as the PAT
const pat = process.env.CLARIFAI_API_KEY;

// Set up authorization with the PAT
metadata.set('authorization', `Key ${pat}`);

console.log('Using API key:', pat.substring(0, 8) + '...');

async function testClarifaiAuth() {
    try {
        // First, try to list apps to get our user_id and app_id
        console.log('Listing apps to get user and app information...');
        const appsResponse = await new Promise((resolve, reject) => {
            stub.ListApps(
                {
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

        console.log('Apps response:', JSON.stringify(appsResponse, null, 2));

        if (!appsResponse.apps || appsResponse.apps.length === 0) {
            throw new Error('No apps found in the account');
        }

        const app = appsResponse.apps[0];
        const retrievedUserId = app.user_id;
        const retrievedAppId = app.id;

        console.log(`Retrieved user_id: ${retrievedUserId}, app_id: ${retrievedAppId}`);

        // Now test model creation with proper structure
        const modelRequest = {
            user_app_id: {
                user_id: retrievedUserId,
                app_id: retrievedAppId
            },
            model: {
                id: 'test-model-' + Date.now(),
                name: 'Test Model',
                model_type_id: 'visual-classifier',
                output_info: {
                    data: {
                        concepts: [
                            { id: 'cat', name: 'cat' },
                            { id: 'dog', name: 'dog' }
                        ]
                    },
                    output_config: {
                        concepts_mutually_exclusive: true,
                        closed_environment: true
                    }
                }
            }
        };

        console.log('Testing model creation...');
        console.log('Model request:', JSON.stringify(modelRequest, null, 2));

        const createResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    user_app_id: modelRequest.user_app_id,
                    models: [modelRequest.model]
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

        console.log('Model creation response:', JSON.stringify(createResponse, null, 2));

        // If successful, update the .env file with the user_id and app_id
        if (createResponse.status?.code === 10000) {
            const fs = require('fs');
            const envContent = `
CLARIFAI_API_KEY=${process.env.CLARIFAI_API_KEY}
CLARIFAI_USER_ID=${retrievedUserId}
CLARIFAI_APP_ID=${retrievedAppId}
`;
            fs.writeFileSync('.env', envContent.trim());
            console.log('\nEnvironment variables updated successfully!');
        }
    } catch (error) {
        console.error('Error testing Clarifai authentication:', error);
    }
}

testClarifaiAuth();
