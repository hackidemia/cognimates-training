const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
const apiKey = process.env.new_clarifai_key.trim().replace(/[^a-zA-Z0-9]/g, '');
metadata.set('authorization', `Key ${apiKey}`);

const modelId = 'catsdogstest';
const versionId = `v${Date.now()}`;

const createModel = () => {
    return new Promise((resolve, reject) => {
        stub.PostModels(
            {
                models: [
                    {
                        id: modelId,
                        model_type_id: "visual-classifier",
                        output_info: {
                            data: {
                                concepts: [
                                    { id: "cats", name: "cats" },
                                    { id: "dogs", name: "dogs" }
                                ]
                            },
                            output_config: {
                                concepts_mutually_exclusive: false,
                                closed_environment: true
                            }
                        }
                    }
                ]
            },
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

const addInputs = () => {
    // Simulating 10 inputs for each category
    const inputs = [];
    for (let i = 0; i < 10; i++) {
        inputs.push({
            data: {
                image: {
                    url: `https://example.com/cats/cat${i+1}.jpg`,
                    allow_duplicate_url: true
                },
                concepts: [{ id: "cats", value: 1 }]
            }
        });
        inputs.push({
            data: {
                image: {
                    url: `https://example.com/dogs/dog${i+1}.jpg`,
                    allow_duplicate_url: true
                },
                concepts: [{ id: "dogs", value: 1 }]
            }
        });
    }

    return new Promise((resolve, reject) => {
        stub.PostInputs(
            { inputs: inputs },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error adding inputs:', err);
                    reject(err);
                } else {
                    console.log('Inputs added:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
};

const createModelVersion = () => {
    return new Promise((resolve, reject) => {
        stub.PostModelVersions(
            {
                model_id: modelId,
                version: {
                    id: versionId,
                    output_info: {
                        data: {
                            concepts: [
                                { id: "cats", name: "cats" },
                                { id: "dogs", name: "dogs" }
                            ]
                        },
                        output_config: {
                            concepts_mutually_exclusive: false,
                            closed_environment: true
                        }
                    },
                    train_info: {
                        params: {
                            template: 'classification_base',
                            epochs: 5
                        }
                    }
                }
            },
            metadata,
            (err, response) => {
                if (err) {
                    console.error('Error creating model version:', err);
                    reject(err);
                } else {
                    console.log('Model version created:', JSON.stringify(response, null, 2));
                    resolve(response);
                }
            }
        );
    });
};

const runFullProcess = async () => {
    try {
        await createModel();
        await addInputs();
        await createModelVersion();
        console.log('Full process completed successfully');
    } catch (error) {
        console.error('Error in full process:', error);
    }
};

runFullProcess();
