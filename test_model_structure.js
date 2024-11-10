const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the Clarifai proto file
const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, 'proto/clarifai/api/service.proto'),
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [path.join(__dirname, 'proto')]
    }
);

const service = grpc.loadPackageDefinition(packageDefinition).clarifai.api.V2;
const stub = new service.V2('api.clarifai.com:443', grpc.credentials.createSsl());

// Clean and set API key
const apiKey = (process.env.new_clarifai_key || '').trim().replace(/[^a-zA-Z0-9]/g, '');
const metadata = new grpc.Metadata();
metadata.set('authorization', `Key ${apiKey}`);

async function testModelStructure() {
    try {
        // First, create a model with basic structure
        const modelId = 'test-model-structure';
        const concepts = ['cats', 'dogs'];

        console.log('Creating test model...');
        const modelRequest = {
            model: {
                id: modelId,
                name: modelId,
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept,
                            name: concept
                        }))
                    },
                    output_config: {
                        concepts_mutually_exclusive: false,
                        closed_environment: false
                    }
                }
            }
        };

        // Create model
        const modelResponse = await new Promise((resolve, reject) => {
            stub.PostModels(modelRequest, metadata, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });

        console.log('Model creation response:', JSON.stringify(modelResponse, null, 2));

        if (modelResponse.status.code !== 10000 && modelResponse.status.code !== 21202) {
            throw new Error(`Model creation failed: ${modelResponse.status.description}`);
        }

        // Get model details to understand structure
        console.log('\nFetching model details...');
        const getModelResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
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

        console.log('Model details:', JSON.stringify(getModelResponse, null, 2));

        // Try to create a version with the same structure
        console.log('\nCreating model version...');
        const versionRequest = {
            model_id: modelId,
            version: {
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept,
                            name: concept
                        }))
                    },
                    output_config: {
                        concepts_mutually_exclusive: false,
                        closed_environment: false
                    }
                }
            }
        };

        const versionResponse = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                versionRequest,
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

        console.log('Version creation response:', JSON.stringify(versionResponse, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testModelStructure();
