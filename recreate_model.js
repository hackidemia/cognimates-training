const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

const modelId = 'catsdogstest';
const concepts = [
    { id: "cats", name: "cats" },
    { id: "dogs", name: "dogs" }
];

const deleteModel = () => {
    return new Promise((resolve, reject) => {
        stub.DeleteModel(
            {
                model_id: modelId
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error deleting model:', err);
                    reject(err);
                } else {
                    console.log('Model deleted:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
};

const createModel = () => {
    return new Promise((resolve, reject) => {
        const modelRequest = {
            model: {
                id: modelId,
                model_type_id: "embedding-classifier"
            }
        };

        stub.PostModels(
            modelRequest,
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error creating model:', err);
                    reject(err);
                } else {
                    console.log('Model created:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
};

const addConcepts = () => {
    return new Promise((resolve, reject) => {
        const conceptsRequest = {
            concepts: concepts.map(concept => ({
                id: concept.id,
                name: concept.name
            }))
        };

        stub.PostConcepts(
            conceptsRequest,
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error creating concepts:', err);
                    reject(err);
                } else {
                    console.log('Concepts created:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
};

const addConceptsToModel = () => {
    return new Promise((resolve, reject) => {
        const patchRequest = {
            models: [{
                id: modelId,
                output_info: {
                    data: {
                        concepts: concepts
                    },
                    output_config: {
                        concepts_mutually_exclusive: false,
                        closed_environment: true
                    }
                }
            }]
        };

        stub.PatchModels(
            patchRequest,
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error adding concepts to model:', err);
                    reject(err);
                } else {
                    console.log('Concepts added to model:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
};

const runRecreate = async () => {
    try {
        console.log('Deleting existing model...');
        await deleteModel();

        console.log('Creating new model...');
        await createModel();

        console.log('Creating concepts...');
        await addConcepts();

        console.log('Adding concepts to model...');
        await addConceptsToModel();

        console.log('Model recreation completed successfully');
    } catch (error) {
        console.error('Error in model recreation:', error);
    }
};

runRecreate();
