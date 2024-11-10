const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function testCompleteVersion() {
    try {
        const modelId = 'catsdogstest';
        const versionId = `v${Date.now()}`;

        console.log('Creating model version with complete structure...');

        const response = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                {
                    model_id: modelId,
                    version: {
                        id: versionId,
                        output_info: {
                            data: {
                                concepts: [
                                    { id: 'cats', name: 'cats' },
                                    { id: 'dogs', name: 'dogs' }
                                ]
                            },
                            output_config: {
                                concepts_mutually_exclusive: true,
                                closed_environment: true
                            }
                        },
                        train_info: {
                            params: {
                                template: 'classification_base',
                                epochs: 5,
                                batch_size: 32,
                                learning_rate: 0.001
                            },
                            dataset: {
                                concepts: [
                                    { id: 'cats', name: 'cats' },
                                    { id: 'dogs', name: 'dogs' }
                                ]
                            }
                        }
                    }
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error:', err);
                        reject(err);
                    } else {
                        console.log('Response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        console.log('Model version creation response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testCompleteVersion();
