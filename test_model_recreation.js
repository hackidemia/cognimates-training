const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

async function deleteModel(modelId) {
    try {
        console.log(`Attempting to delete model: ${modelId}`);
        const response = await new Promise((resolve, reject) => {
            stub.DeleteModel(
                { model_id: modelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error deleting model:', err);
                        reject(err);
                    } else {
                        console.log('Delete model response:', JSON.stringify(response, null, 2));
                        resolve(response);
                    }
                }
            );
        });
        return response;
    } catch (error) {
        console.warn('Warning during model deletion:', error.message);
        return null;
    }
}

async function createModel(modelId, concepts) {
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

    console.log('Creating model with structure:', JSON.stringify(modelRequest, null, 2));

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

    return response;
}

async function recreateModel() {
    try {
        const modelId = 'catsdogstest';
        const concepts = ['cats', 'dogs'];

        // First try to delete the existing model
        await deleteModel(modelId);

        // Wait a bit for the deletion to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create new model
        const createResponse = await createModel(modelId, concepts);
        console.log('Model recreated successfully');
        return createResponse;
    } catch (error) {
        console.error('Error during model recreation:', error.message);
        process.exit(1);
    }
}

recreateModel();
