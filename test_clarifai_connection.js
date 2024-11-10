const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');

// Initialize the gRPC client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();

// Clean up API key by removing any whitespace
const apiKey = (process.env.CLARIFAI_API_KEY || '').trim();
console.log('Testing Clarifai connection...');
console.log('API Key length:', apiKey.length);
console.log('API Key first 8 chars:', apiKey.substring(0, 8));

metadata.set('authorization', `Key ${apiKey}`);

// Test the connection and model creation flow
async function testClarifaiConnection() {
    try {
        console.log('\n1. Testing ListModels endpoint...');
        const listResponse = await new Promise((resolve, reject) => {
            stub.ListModels(
                { per_page: 1 },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error:', err.message);
                        console.error('Details:', err.details);
                        reject(err);
                    } else {
                        console.log('Response status:', response.status);
                        resolve(response);
                    }
                }
            );
        });

        if (listResponse.status.code !== 10000) {
            throw new Error(`List models failed: ${listResponse.status.description}`);
        }
        console.log('✓ ListModels successful');

        // Test model creation
        console.log('\n2. Testing model creation...');
        const testModelId = `test-model-${Date.now()}`;
        const modelRequest = {
            model: {
                id: testModelId,
                name: 'Test Model',
                model_type_id: 'embedding-classifier',
                concepts: [
                    { id: 'cat', name: 'cat' },
                    { id: 'dog', name: 'dog' }
                ],
                output_info: {
                    data: {
                        concepts: [
                            { id: 'cat', name: 'cat' },
                            { id: 'dog', name: 'dog' }
                        ]
                    },
                    output_config: {
                        concepts_mutually_exclusive: false,
                        closed_environment: false
                    }
                }
            }
        };

        const createResponse = await new Promise((resolve, reject) => {
            stub.PostModels(
                { models: [modelRequest.model] },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error:', err.message);
                        console.error('Details:', err.details);
                        reject(err);
                    } else {
                        console.log('Response status:', response.status);
                        resolve(response);
                    }
                }
            );
        });

        if (createResponse.status.code !== 10000) {
            throw new Error(`Model creation failed: ${createResponse.status.description}`);
        }
        console.log('✓ Model creation successful');

        // Clean up - delete the test model
        console.log('\n3. Cleaning up - deleting test model...');
        const deleteResponse = await new Promise((resolve, reject) => {
            stub.DeleteModel(
                { model_id: testModelId },
                metadata,
                (err, response) => {
                    if (err) {
                        console.error('Error:', err.message);
                        console.error('Details:', err.details);
                        reject(err);
                    } else {
                        console.log('Response status:', response.status);
                        resolve(response);
                    }
                }
            );
        });

        if (deleteResponse.status.code !== 10000) {
            console.warn(`Warning: Failed to delete test model: ${deleteResponse.status.description}`);
        } else {
            console.log('✓ Model deletion successful');
        }

        console.log('\n✓ All tests completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.details) {
            console.error('Error details:', error.details);
        }
        process.exit(1);
    }
}

testClarifaiConnection();
