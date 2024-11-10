const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function updateModel() {
    try {
        const modelId = 'catsdogstest';

        console.log('Updating model configuration...');

        // Update model with proper configuration using PatchModels
        const patchResponse = await new Promise((resolve, reject) => {
            stub.PatchModels(
                {
                    action: 'overwrite',
                    models: [{
                        id: modelId,
                        name: 'Cats and Dogs Classifier',
                        model_type_id: 'visual-classifier',
                        output_info: {
                            message: 'Classification model for cats and dogs',
                            type: 'concept',
                            type_ext: 'concept',
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
                        }
                    }]
                },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error updating model:', err);
                        reject(err);
                    } else {
                        console.log('Model update response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        // Verify the updated model
        const verifyResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error verifying model:', err);
                        reject(err);
                    } else {
                        console.log('Updated model structure:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (verifyResponse.model.output_info) {
            console.log('Model update successful - output_info is properly configured');

            // Try creating a model version
            console.log('Attempting to create model version...');
            const versionResponse = await new Promise((resolve, reject) => {
                const versionId = `v${Date.now()}`;
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
                                }
                            }
                        }
                    },
                    metadata,
                    (err, response) => {
                        if (err) {
                            console.error('Error creating version:', err);
                            reject(err);
                        } else {
                            console.log('Version creation response:', JSON.stringify(response, null, 2));
                            resolve(response);
                        }
                    }
                );
            });
        } else {
            console.log('Model update failed - output_info is not configured');
        }

        console.log('Model update process complete');
    } catch (error) {
        console.error('Update failed:', error);
    }
}

updateModel();