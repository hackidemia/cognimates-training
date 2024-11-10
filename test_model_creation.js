const { ClarifaiStub, grpc } = require('clarifai-nodejs-grpc');
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();

// Check if API key is available
if (!process.env.CLARIFAI_API_KEY) {
    console.error('Error: CLARIFAI_API_KEY environment variable is not set');
    process.exit(1);
}

// Set up authorization with API key
metadata.set('authorization', `Key ${process.env.CLARIFAI_API_KEY}`);

console.log('Using API key:', process.env.CLARIFAI_API_KEY.substring(0, 8) + '...');

async function testModelCreation() {
    try {
        const modelRequest = {
            model: {
                id: 'test-model',
                name: 'Test Model',
                model_type_id: 'embedding-classifier',
                concepts: [
                    { id: 'cat', name: 'cat' },
                    { id: 'dog', name: 'dog' }
                ]
            }
        };

        console.log('Sending model creation request:', JSON.stringify(modelRequest, null, 2));

        const response = await new Promise((resolve, reject) => {
            stub.PostModels(
                {
                    user_app_id: {
                        user_id: 'clarifai',
                        app_id: 'main'
                    },
                    models: [modelRequest]
                },
                metadata,
                (err, response) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        console.log('Model creation response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Error creating model:', error);
    }
}

testModelCreation();
