const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");
const fs = require('fs');
const path = require('path');

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set("authorization", `Key ${process.env.CLARIFAI_API_KEY}`);

const modelId = "test-cats-dogs-model";
const modelName = "Test Cats and Dogs Model";
const concepts = ["cats", "dogs"];

async function testClarifaiAPI() {
    try {
        // Step 1: Create the model
        console.log("Creating model...");
        const modelRequest = {
            model: {
                id: modelId,
                name: modelName,
                app_id: "main",
                model_type_id: "visual-classifier",
                concepts_mutually_exclusive: false,
                closed_environment: false,
                concepts: concepts.map(concept => ({
                    id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: concept
                })),
                output_info: {
                    data: {
                        concepts: concepts.map(concept => ({
                            id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
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

        const createModelResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                modelRequest,
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });
        console.log("Model created:", JSON.stringify(createModelResponse, null, 2));

        // Step 2: Add inputs
        console.log("Adding inputs...");
        const testImagesDir = path.join(__dirname, 'static', 'test_images');
        const catImages = fs.readdirSync(path.join(testImagesDir, 'cats')).map(file => ({
            data: {
                image: { base64: fs.readFileSync(path.join(testImagesDir, 'cats', file)).toString('base64') }
            },
            concepts: [{ id: "cats", value: 1 }]
        }));
        const dogImages = fs.readdirSync(path.join(testImagesDir, 'dogs')).map(file => ({
            data: {
                image: { base64: fs.readFileSync(path.join(testImagesDir, 'dogs', file)).toString('base64') }
            },
            concepts: [{ id: "dogs", value: 1 }]
        }));
        const inputs = [...catImages, ...dogImages];

        const addInputsResponse = await new Promise((resolve, reject) => {
            stub.PostInputs(
                { inputs: inputs },
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });
        console.log("Inputs added:", JSON.stringify(addInputsResponse, null, 2));

        // Wait for inputs to be processed
        console.log("Waiting for inputs to be processed...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 3: Train the model
        console.log("Training model...");
        const trainRequest = {
            model_id: modelId,
            train_info: {
                concepts: concepts.map(concept => ({
                    id: concept.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: concept
                }))
            }
        };

        const trainResponse = await new Promise((resolve, reject) => {
            stub.PostModelVersions(
                trainRequest,
                metadata,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                }
            );
        });
        console.log("Model training initiated:", JSON.stringify(trainResponse, null, 2));

        console.log("Test completed successfully!");
    } catch (error) {
        console.error("Error during test:", error);
        throw error;
    }
}

testClarifaiAPI();
