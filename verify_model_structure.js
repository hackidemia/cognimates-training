const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function verifyModelStructure() {
    try {
        const modelId = 'catsdogstest';
        const concepts = ['cats', 'dogs'];

        // Create model with simplified structure
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
                        concepts_mutually_exclusive: true,
                        closed_environment: true
                    }
                }
            }
        };

        console.log('Attempting to create model with structure:', JSON.stringify(modelRequest, null, 2));

        const response = await new Promise((resolve, reject) => {
            stub.PostModels(
                modelRequest,
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error creating model:', err);
                        reject(err);
                    } else {
                        console.log('Model creation response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (response.status.code !== 10000) {
            throw new Error(`Model creation failed: ${response.status.description}`);
        }

        console.log('Model created successfully');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

verifyModelStructure();
