const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();

// Check if API key is available
if (!process.env.CLARIFAI_API_KEY) {
    console.error('Error: CLARIFAI_API_KEY environment variable is not set');
    process.exit(1);
}

// Set up authorization with API key
metadata.set('authorization', `Key ${process.env.CLARIFAI_API_KEY}`);

console.log('Using API key:', process.env.CLARIFAI_API_KEY.substring(0, 8) + '...');

async function createAndTestApp() {
    try {
        // First, create a new application
        console.log('Creating new Clarifai application...');
        const createAppResponse = await new Promise((resolve, reject) => {
            stub.PostApps(
                {
                    apps: [{
                        id: 'cognimates-vision-' + Date.now(),
                        name: 'Cognimates Vision Training',
                        description: 'Application for vision model training in Cognimates'
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

        console.log('Create app response:', JSON.stringify(createAppResponse, null, 2));

        if (createAppResponse.status.code === 10000) {
            const appId = createAppResponse.apps[0].id;
            console.log('Application created successfully with ID:', appId);

            // Now test model creation in the new app
            const modelRequest = {
                user_app_id: {
                    app_id: appId
                },
                model: {
                    id: 'test-model-' + Date.now(),
                    name: 'Test Model',
                    model_type_id: 'embedding-classifier',
                    concepts: [
                        { id: 'cat', name: 'cat' },
                        { id: 'dog', name: 'dog' }
                    ],
                    output_info: {
                        data: {
                            concepts: [
                                { id: 'cat', name: 'cat' },
                                { id: 'dog', name: 'dog' }
                            ]
                        },
                        output_config: {
                            concepts_mutually_exclusive: false,
                            closed_environment: false,
                            max_concepts: 2
                        }
                    }
                }
            };

            console.log('Testing model creation in new app...');
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
        }
    } catch (error) {
        console.error('Error:', error);
        if (error.details) {
            console.error('Error details:', error.details);
        }
    }
}

createAndTestApp();
