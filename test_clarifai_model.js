const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = (process.env.new_clarifai_key || '').trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set("authorization", `Key ${apiKey}`);

async function testModelCreation() {
    try {
        const modelId = 'test-cats-dogs';
        const concepts = ['cats', 'dogs'];

        // Create model request
        const modelRequest = {
            model: {
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
                        concepts_mutually_exclusive: false,
                        closed_environment: true
                    }
                }
            }
        };

        console.log('Creating model with request:', JSON.stringify(modelRequest, null, 2));

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

        // Create version request
        const versionRequest = {
            model_id: modelId,
            version: {
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept.toLowerCase(),
                            name: concept
                        }))
                    },
                    output_config: {
                        concepts_mutually_exclusive: false,
                        closed_environment: true
                    }
                },
                train: {
                    epochs: 5
                }
            }
        };

        console.log('\nCreating version with request:', JSON.stringify(versionRequest, null, 2));

        // Create version
        const versionResponse = await new Promise((resolve, reject) => {
            stub.PostModelVersions(versionRequest, metadata, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });

        console.log('Version creation response:', JSON.stringify(versionResponse, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testModelCreation();
