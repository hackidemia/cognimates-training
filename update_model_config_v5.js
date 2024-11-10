const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function updateModelConfig() {
    try {
        const modelId = 'catsdogstest';

        // Step 1: Get current model to verify its existence
        console.log('Step 1: Verifying model exists...');
        const currentModel = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error getting model:', err);
                        reject(err);
                    } else {
                        console.log('Current model:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        // Step 2: Update model with output_info using specific structure
        console.log('Step 2: Updating model configuration...');
        const patchResponse = await new Promise((resolve, reject) => {
            stub.PatchModels(
                {
                    action: 'overwrite',
                    models: [{
                        id: modelId,
                        output_info: {
                            params: {},
                            type: 'concept',
                            type_ext: 'classifier',
                            message: 'Show me cats and dogs',
                            concepts: [
                                { id: 'cats', name: 'cats', value: 1 },
                                { id: 'dogs', name: 'dogs', value: 1 }
                            ],
                            output_config: {
                                concepts_mutually_exclusive: true,
                                closed_environment: true,
                                max_concepts: 0,
                                min_value: 0
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

        // Step 3: Verify the update
        console.log('Step 3: Verifying update...');
        const verifyResponse = await new Promise((resolve, reject) => {
            stub.GetModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error verifying update:', err);
                        reject(err);
                    } else {
                        console.log('Updated model structure:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });

        if (verifyResponse.model.output_info) {
            console.log('Success: Model configuration updated successfully');

            // Step 4: Create a new version
            console.log('Step 4: Creating new version...');
            const versionResponse = await new Promise((resolve, reject) => {
                const versionId = `v${Date.now()}`;
                stub.PostModelVersions(
                    {
                        model_id: modelId,
                        version: {
                            id: versionId,
                            train_info: {
                                params: {
                                    template: 'classification_base',
                                    use_embeddings: true
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
            console.log('Error: Model configuration update failed');
        }
    } catch (error) {
        console.error('Update failed:', error);
    }
}

updateModelConfig();
